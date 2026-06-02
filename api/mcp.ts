/**
 * Foundry MCP server — Streamable HTTP transport.
 *
 *   POST /api/mcp
 *   Authorization: Bearer ${FOUNDRY_PUSH_SECRET}
 *
 * Implements the Model Context Protocol (2024-11-05) over plain JSON-RPC
 * request/response. No SSE — every tool call returns synchronously, which is
 * enough for Foundry's pushes/lookups.
 *
 * Connect from a Claude client (chat or Cowork) with:
 *   {
 *     "mcpServers": {
 *       "foundry": {
 *         "url": "https://<your-foundry>.vercel.app/api/mcp",
 *         "headers": { "Authorization": "Bearer <FOUNDRY_PUSH_SECRET>" }
 *       }
 *     }
 *   }
 *
 * Tools:
 *   - push_app(id, name, description, icon, route?, componentCode, needsPersistence?)
 *   - archive_app(id)
 *   - list_apps(includeArchived?)
 *   - get_app(id)
 */
import { env, type Env, requireAuth } from './_lib';
import {
  archiveApp,
  checkDeployByUid,
  checkDeployStatus,
  getApp,
  getAppSource,
  listApps,
  pushApp,
  type PushAppInput,
} from './_operations';

// Edge runtime — 25s budget. We bound the deploy-wait inside that and rely on
// the `verify_deploy` tool for builds that take longer than ~20s.
export const config = { runtime: 'edge' };

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'foundry', version: '0.2.0' };
const SERVER_INSTRUCTIONS =
  'Foundry exposes tools to push new mini-apps into Andre\'s personal dashboard, ' +
  'archive existing ones, and inspect the registry. Apps are real TypeScript ' +
  'modules committed to GitHub at src/apps/<id>/index.tsx, then auto-deployed. ' +
  'Read https://github.com/Awentzelza/foundry/blob/main/CLAUDE.md for the full ' +
  'component contract before calling push_app.';

const COMPONENT_EXAMPLE = `import { useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface Tally { count: number }

export default function TallyApp() {
  const { value, setValue, ready } = useAppData<Tally>('example', 'state', { count: 0 });
  const add = useCallback(() => setValue({ count: value.count + 1 }), [value, setValue]);
  if (!ready) return null;
  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <div style={{
        background: 'var(--foundry-card)',
        border: '1px solid var(--foundry-border)',
        borderRadius: 'var(--foundry-radius-md)',
        padding: 24,
      }}>
        <div style={{
          fontFamily: 'var(--foundry-font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--foundry-text-subtle)',
        }}>Records</div>
        <div style={{
          fontFamily: 'var(--foundry-font-display)', fontSize: 40, fontWeight: 700,
          color: 'var(--foundry-text)', letterSpacing: '-0.02em', marginTop: 4,
        }}>{value.count}</div>
        <div style={{
          fontFamily: 'var(--foundry-font-body)', fontSize: 14,
          color: 'var(--foundry-text-muted)', marginTop: 4,
        }}>Entries recorded.</div>
        <IonButton fill="outline" color="primary" onClick={add} style={{ marginTop: 16 }}>
          Add entry
        </IonButton>
      </div>
    </div>
  );
}
`;

/**
 * CSS-module example: per-app scoped styling. `component` imports the module
 * and uses hashed class names; `styles` is committed to styles.module.css and
 * is brand-checked (tokens only, brand fonts, no token redefinition). Note the
 * Ionic component is restyled via its OWN vars set to --foundry-* tokens.
 */
const CSS_MODULE_EXAMPLE = {
  component: `import { useCallback } from 'react';
import { IonButton } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';
import s from './styles.module.css';

interface Tally { count: number }

export default function TallyApp() {
  const { value, setValue, ready } = useAppData<Tally>('example', 'state', { count: 0 });
  const add = useCallback(() => setValue({ count: value.count + 1 }), [value, setValue]);
  if (!ready) return null;
  return (
    <div className={s.card}>
      <div className={s.eyebrow}>Records</div>
      <div className={s.value}>{value.count}</div>
      <div className={s.note}>Entries recorded.</div>
      <IonButton className={s.add} fill="outline" onClick={add}>Add entry</IonButton>
    </div>
  );
}
`,
  styles: `.card {
  background: var(--foundry-card);
  border: 1px solid var(--foundry-border);
  border-radius: var(--foundry-radius-md);
  padding: var(--space-5);
  max-width: 420px;
  margin: var(--space-5) auto;
}
.eyebrow {
  font-family: var(--foundry-font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--foundry-text-subtle);
}
.value {
  font-family: var(--foundry-font-display);
  font-size: 40px;
  font-weight: 700;
  color: var(--foundry-text);
  letter-spacing: -0.02em;
  margin-top: var(--space-1);
}
.note {
  font-family: var(--foundry-font-body);
  font-size: 14px;
  color: var(--foundry-text-muted);
  margin-top: var(--space-1);
}
/* Restyle the Ionic component via its own vars, sourced from brand tokens. */
.add {
  --background: transparent;
  --color: var(--foundry-ember);
  --border-color: var(--foundry-ember);
  margin-top: var(--space-4);
}
`,
};

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: number | string | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

const TOOLS = [
  {
    name: 'push_app',
    description:
      'Create or update a Foundry app. The componentCode is committed to ' +
      'src/apps/<id>/index.tsx, the registry is regenerated, and Vercel ' +
      'auto-builds. By DEFAULT this returns immediately after the commit ' +
      'with the deploymentUid and a `building` status — the build runs ' +
      'async (30-90s). Poll `get_deploy_status` with that deploymentUid (or ' +
      '`verify_deploy` with the commit SHA) to get the `ready`/`error` ' +
      'verdict. A failed build never goes live, so nothing breaks on the ' +
      'dashboard. Pass waitForDeploy:true to block on the verdict instead.\n\n' +
      'HARD RULES for componentCode (these are validated before commit):\n' +
      '  1. Must contain `export default` for the function component.\n' +
      '  2. Allowed imports ONLY: `react`, `@ionic/react`, `ionicons/icons`, ' +
      '`@/hooks/useAppData`, `@/types/app`. Anything else is rejected.\n' +
      '  3. Do NOT import or render `IonPage`, `IonContent`, `IonHeader`, ' +
      '`IonToolbar` — the Foundry shell (AppHost) provides them.\n' +
      '  4. `useAppData` returns an OBJECT, NOT a tuple. Destructure as:\n' +
      "       const { value, setValue, ready } = useAppData<T>('<id>', '<key>', initial);\n" +
      '     NEVER as `const [data, setData] = useAppData(...)` — that will fail.\n' +
      '     Available fields: { value, setValue, loading, ready, persistent, archive }.\n' +
      '  5. No `any`, no `@ts-ignore`, no `localStorage`/`sessionStorage`.\n' +
      '  6. BRAND (enforced): no emoji; no exclamation points in copy; ' +
      'colours ONLY via var(--foundry-*) tokens (Ember is the sole accent, ' +
      'Mark Gold is signet-only); fonts ONLY via var(--foundry-font-*). ' +
      'Off-brand pushes are rejected. Voice is a calm steward, not a coach.\n' +
      '  7. STYLING (optional): pass a per-app CSS module in `styles`. It is ' +
      'committed to src/apps/<id>/styles.module.css; import it in the ' +
      "component as `import s from './styles.module.css'` and use s.<class>. " +
      'Vite hashes the class names so an app cannot leak into the shell or ' +
      'other apps. Restyle Ionic components via their own CSS vars ' +
      '(--background, --color, --border-color, ...) set to var(--foundry-*) ' +
      'tokens. The stylesheet is brand-checked too: tokens only (no raw ' +
      'hex/rgb/hsl), brand fonts only, and it must NOT redefine any ' +
      '--foundry-*/--ion-* token.\n\n' +
      'Call the `get_component_example` tool for a full, brand-valid ' +
      'example (component + CSS module) you can copy and adapt.\n\n' +
      'PROVISIONING: a new app is created UNGRANTED — it appears for the ' +
      'owner immediately but for no one else until provisioned on the /admin ' +
      'page. Pass `dataScope` to fix whether its data is per-member ' +
      "('personal', default) or one household dataset ('shared').",
    inputSchema: {
      type: 'object',
      required: ['id', 'name', 'icon', 'componentCode'],
      properties: {
        id: {
          type: 'string',
          pattern: '^[a-z][a-z0-9-]{1,39}$',
          description: 'Lowercase, hyphenated slug. Used in routes + Supabase keys.',
        },
        name: { type: 'string', description: 'Display name (Title Case).' },
        description: { type: 'string', description: 'One-line tile description.' },
        icon: { type: 'string', description: 'Short label; not shown on the dashboard (display strips it). Do not use emoji.' },
        route: {
          type: 'string',
          description: 'Path under /app/. Defaults to id.',
        },
        componentCode: {
          type: 'string',
          description:
            'Full .tsx module source. See the hard rules and example in the ' +
            'tool description. The code is validated before commit and the ' +
            'build verdict is returned to you.',
        },
        styles: {
          type: 'string',
          description:
            'Optional per-app CSS module (committed to ' +
            'src/apps/<id>/styles.module.css). Import it in the component as ' +
            "`import s from './styles.module.css'`. Tokens only (no raw " +
            'hex/rgb/hsl), brand fonts only, and must not redefine any ' +
            '--foundry-*/--ion-* token. Brand-checked before commit.',
        },
        needsPersistence: {
          type: 'boolean',
          default: false,
          description: 'True if the app uses useAppData.',
        },
        dataScope: {
          type: 'string',
          enum: ['shared', 'personal'],
          default: 'personal',
          description:
            "Fixed data scope. 'personal' (default): each member sees only " +
            "their own data. 'shared': one dataset for the whole household. " +
            'Set once at creation; changing later is a data migration.',
        },
        waitForDeploy: {
          type: 'boolean',
          default: false,
          description:
            'Default false: return immediately with the deploymentUid to ' +
            'poll. Set true to block on the build verdict within the Edge ' +
            'budget (auto-archives on build failure); real builds may still ' +
            'come back as `building`.',
        },
      },
    },
  },
  {
    name: 'get_component_example',
    description:
      'Return full, valid Foundry examples as copy-paste starting points: a ' +
      'minimal inline-styled component, and a CSS-module variant showing ' +
      'per-app scoped styling (styles.module.css + Ionic var customization). ' +
      'Call this once when you need a concrete reminder of the component or ' +
      'styling contract. Takes no arguments.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'archive_app',
    description:
      "Hide an app from the dashboard by setting status='archived'. Does NOT " +
      'delete code or rows. Re-push with the same id to reactivate.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_apps',
    description:
      'List all apps in the registry. Returns id, name, description, icon, ' +
      'route, status, needs_persistence, timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: {
          type: 'boolean',
          default: false,
          description: 'Include status=archived apps.',
        },
      },
    },
  },
  {
    name: 'get_app',
    description: 'Fetch a single app row by id.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'view_code',
    description:
      "Fetch the current committed source of an app's component " +
      '(src/apps/<id>/index.tsx) from GitHub and return it as text. Use this ' +
      'to inspect what is actually deployed before iterating on an app.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'verify_deploy',
    description:
      'Check Vercel deployment status for a commit SHA. Returns `ready` ' +
      '(live, with url), `error` (with errorLog), or `building` (still in ' +
      'progress — poll again). Prefer get_deploy_status when you have the ' +
      'deploymentUid. Pass appId to auto-archive the app if the build errored.',
    inputSchema: {
      type: 'object',
      required: ['commitSha'],
      properties: {
        commitSha: { type: 'string', description: 'The commit SHA returned by push_app.' },
        appId: {
          type: 'string',
          description: 'Optional. If the build errored, archive this app id.',
        },
      },
    },
  },
  {
    name: 'get_deploy_status',
    description:
      'Check Vercel deployment status by deploymentUid (returned by push_app) ' +
      '\u2014 the most reliable check. Returns `ready` (live, with url), ' +
      '`error` (with errorLog), or `building`. Pass appId to auto-archive the ' +
      'app if the build errored.',
    inputSchema: {
      type: 'object',
      required: ['deploymentUid'],
      properties: {
        deploymentUid: { type: 'string', description: 'The deploymentUid returned by push_app.' },
        appId: {
          type: 'string',
          description: 'Optional. If the build errored, archive this app id.',
        },
      },
    },
  },
] as const;

function rpcResult(id: JsonRpcRequest['id'], result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(
  id: JsonRpcRequest['id'],
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

function toolContent(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError,
  };
}

async function handleToolCall(name: string, args: Record<string, unknown>, e: Env) {
  switch (name) {
    case 'push_app': {
      const result = await pushApp(args as unknown as PushAppInput, e);
      return toolContent(result, !result.success);
    }
    case 'get_component_example': {
      return toolContent({ example: COMPONENT_EXAMPLE, cssModuleExample: CSS_MODULE_EXAMPLE });
    }
    case 'archive_app': {
      const id = String(args.id ?? '');
      const result = await archiveApp(id, e);
      return toolContent(result, !result.success);
    }
    case 'list_apps': {
      const includeArchived = Boolean(args.includeArchived);
      const result = await listApps({ includeArchived }, e);
      return toolContent(result, !result.success);
    }
    case 'get_app': {
      const id = String(args.id ?? '');
      const result = await getApp(id, e);
      return toolContent(result, !result.success);
    }
    case 'view_code': {
      const id = String(args.id ?? '');
      const result = await getAppSource(id, e);
      return toolContent(result, !result.success);
    }
    case 'verify_deploy': {
      const commitSha = String(args.commitSha ?? '');
      if (!commitSha) {
        return toolContent({ error: 'Missing `commitSha`' }, true);
      }
      const result = await checkDeployStatus(e, commitSha);
      if (result.status === 'error' && args.appId) {
        await archiveApp(String(args.appId), e);
      }
      return toolContent(result, result.status === 'error');
    }
    case 'get_deploy_status': {
      const deploymentUid = String(args.deploymentUid ?? '');
      if (!deploymentUid) {
        return toolContent({ error: 'Missing `deploymentUid`' }, true);
      }
      const result = await checkDeployByUid(e, deploymentUid);
      if (result.status === 'error' && args.appId) {
        await archiveApp(String(args.appId), e);
      }
      return toolContent(result, result.status === 'error');
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function dispatch(
  req: JsonRpcRequest,
  e: Env,
): Promise<JsonRpcResponse | null> {
  switch (req.method) {
    case 'initialize':
      return rpcResult(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
        instructions: SERVER_INSTRUCTIONS,
      });

    case 'notifications/initialized':
      // Notification (no id). No response.
      return null;

    case 'ping':
      return rpcResult(req.id, {});

    case 'tools/list':
      return rpcResult(req.id, { tools: TOOLS });

    case 'tools/call': {
      const params = (req.params ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      if (!params.name) {
        return rpcError(req.id, -32602, 'tools/call requires { name, arguments }');
      }
      try {
        const result = await handleToolCall(
          params.name,
          params.arguments ?? {},
          e,
        );
        return rpcResult(req.id, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return rpcError(req.id, -32000, message);
      }
    }

    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

// --- Per-IP rate limiting (in-memory token bucket) ---
// 30 requests/minute per client IP. Best-effort only: Edge isolates are
// ephemeral and per-region, so a determined caller can bypass this by spreading
// requests across regions/IPs. It is a soft cap that blunts a single-source
// spam burst (e.g. if the bearer token leaks again), NOT a hard distributed
// guarantee — a real limiter would need a shared store (Redis/Durable Object).
const RATE_CAPACITY = 30; // max burst
const RATE_REFILL_PER_MS = 30 / 60_000; // 30 tokens per 60s
const rateBuckets = new Map<string, { tokens: number; last: number }>();

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0].trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

/** Returns true if this request should be rejected (bucket empty). */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip) ?? { tokens: RATE_CAPACITY, last: now };
  b.tokens = Math.min(RATE_CAPACITY, b.tokens + (now - b.last) * RATE_REFILL_PER_MS);
  b.last = now;
  if (b.tokens < 1) {
    rateBuckets.set(ip, b);
    return true;
  }
  b.tokens -= 1;
  rateBuckets.set(ip, b);
  return false;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS — Claude clients may preflight from random origins.
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, mcp-session-id',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method === 'GET') {
    // Friendly probe for humans hitting the URL in a browser.
    return new Response(
      JSON.stringify({
        server: SERVER_INFO,
        protocolVersion: PROTOCOL_VERSION,
        transport: 'streamable-http',
        hint: 'POST a JSON-RPC request with Authorization: Bearer <FOUNDRY_PUSH_SECRET>.',
      }),
      { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Rate limit actual work (POST). OPTIONS/GET are cheap and skipped above.
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify(
        rpcError(null, -32029, 'Rate limit exceeded — max 30 requests per minute.'),
      ),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
          'retry-after': '2',
        },
      },
    );
  }

  const e = env();
  const authError = requireAuth(req, e);
  if (authError) {
    // Re-emit as JSON-RPC error so MCP clients can show it.
    return new Response(
      JSON.stringify(rpcError(null, -32001, 'Unauthorized — bad or missing bearer token')),
      { status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return new Response(
      JSON.stringify(rpcError(null, -32700, 'Parse error: body is not valid JSON')),
      { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  }

  // Support a single request or a batch.
  const requests = Array.isArray(body) ? body : [body];
  const responses: JsonRpcResponse[] = [];
  for (const r of requests) {
    if (!r || r.jsonrpc !== '2.0' || typeof r.method !== 'string') {
      responses.push(rpcError(r?.id ?? null, -32600, 'Invalid Request'));
      continue;
    }
    const resp = await dispatch(r, e);
    if (resp) responses.push(resp);
  }

  if (responses.length === 0) {
    // All inputs were notifications.
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  const responseBody = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
