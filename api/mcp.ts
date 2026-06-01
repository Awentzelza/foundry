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
import { archiveApp, getApp, listApps, pushApp, type PushAppInput } from './_operations';

export const config = { runtime: 'edge' };

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'foundry', version: '0.2.0' };
const SERVER_INSTRUCTIONS =
  'Foundry exposes tools to push new mini-apps into Andre\'s personal dashboard, ' +
  'archive existing ones, and inspect the registry. Apps are real TypeScript ' +
  'modules committed to GitHub at src/apps/<id>/index.tsx, then auto-deployed. ' +
  'Read https://github.com/Awentzelza/foundry/blob/main/CLAUDE.md for the full ' +
  'component contract before calling push_app.';

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
      'Create or update a Foundry app. Commits a TypeScript module to ' +
      'src/apps/<id>/index.tsx and upserts metadata in Supabase. Vercel ' +
      'auto-deploys ~30-60s after the commit. The componentCode MUST be a ' +
      'self-contained Ionic React component (default-exported, no top-level ' +
      "<IonPage>, <IonContent>, or <IonHeader>) that uses useAppData('<id>', " +
      "'<key>', initial) for any persistence. See CLAUDE.md for the contract.",
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
        icon: { type: 'string', description: 'Emoji or short SVG string for the tile.' },
        route: {
          type: 'string',
          description: 'Path under /app/. Defaults to id.',
        },
        componentCode: {
          type: 'string',
          description:
            'Full .tsx module source. MUST contain `export default` for the ' +
            'function component. Imports allowed: react hooks, @ionic/react, ' +
            "ionicons/icons, and the @/hooks/useAppData persistence hook.",
        },
        needsPersistence: {
          type: 'boolean',
          default: false,
          description: 'True if the app reads/writes foundry_app_data.',
        },
      },
    },
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
