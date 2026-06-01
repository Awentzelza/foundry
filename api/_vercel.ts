/**
 * Foundry — Vercel API helpers.
 *
 * pushApp commits the app, then (by default) returns immediately with the
 * deployment id so the MCP call never blocks on a 30-90s build. Claude polls
 * `get_deploy_status` (by deploymentUid) or `verify_deploy` (by commit SHA)
 * to learn the verdict. Builds simply report `building` until they reach a
 * terminal `ready` / `error` state — no more ambiguous `timeout`.
 *
 * Env required: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID.
 */

import type { Env } from './_lib';

interface VercelDeployment {
  uid: string;
  url: string;
  state:
    | 'INITIALIZING'
    | 'BUILDING'
    | 'READY'
    | 'ERROR'
    | 'CANCELED'
    | 'QUEUED';
  readyState?: string;
  inspectorUrl?: string;
  meta?: { githubCommitSha?: string };
  created?: number;
}

export interface DeployVerdict {
  available: boolean; // false if VERCEL_* env not configured
  status?: 'ready' | 'error' | 'building';
  deploymentUid?: string;
  url?: string;
  inspectorUrl?: string;
  errorLog?: string;
  /** Diagnostic note (API hiccup, not-yet-indexed, etc.). Not a build error. */
  message?: string;
}

function configured(e: Env): boolean {
  return Boolean(e.VERCEL_TOKEN && e.VERCEL_PROJECT_ID && e.VERCEL_TEAM_ID);
}

async function vfetch(e: Env, path: string): Promise<Response> {
  return fetch(`https://api.vercel.com${path}`, {
    headers: {
      authorization: `Bearer ${e.VERCEL_TOKEN}`,
      'user-agent': 'foundry-mcp',
    },
  });
}

/** Build a verdict from a deployment record (resolving the error log if failed). */
async function verdictFor(e: Env, d: VercelDeployment): Promise<DeployVerdict> {
  if (d.state === 'READY') {
    return {
      available: true,
      status: 'ready',
      deploymentUid: d.uid,
      url: d.url ? `https://${d.url}` : undefined,
      inspectorUrl: d.inspectorUrl,
    };
  }
  if (d.state === 'ERROR' || d.state === 'CANCELED') {
    const log = await getBuildErrorLog(e, d.uid);
    return {
      available: true,
      status: 'error',
      deploymentUid: d.uid,
      inspectorUrl: d.inspectorUrl,
      errorLog: extractRelevantError(log),
    };
  }
  // INITIALIZING / QUEUED / BUILDING
  return {
    available: true,
    status: 'building',
    deploymentUid: d.uid,
    inspectorUrl: d.inspectorUrl,
  };
}

/**
 * Find the production deployment for a specific commit SHA. Returns a
 * structured result so API failures are diagnosable (not silently swallowed).
 * Does NOT fall back to "newest" — that risked matching the wrong commit.
 */
async function findBySha(
  e: Env,
  sha: string,
): Promise<{ ok: boolean; deployment?: VercelDeployment; message?: string }> {
  const url =
    `/v6/deployments?projectId=${encodeURIComponent(e.VERCEL_PROJECT_ID!)}` +
    `&teamId=${encodeURIComponent(e.VERCEL_TEAM_ID!)}&limit=20&target=production`;
  const r = await vfetch(e, url);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    return { ok: false, message: `Vercel API HTTP ${r.status}: ${body.slice(0, 200)}` };
  }
  const j = (await r.json()) as { deployments?: VercelDeployment[] };
  const deployment = (j.deployments ?? []).find(
    (d) => d.meta?.githubCommitSha === sha,
  );
  return { ok: true, deployment };
}

async function getDeployment(
  e: Env,
  uid: string,
): Promise<{ ok: boolean; deployment?: VercelDeployment; message?: string }> {
  const r = await vfetch(
    e,
    `/v13/deployments/${uid}?teamId=${encodeURIComponent(e.VERCEL_TEAM_ID!)}`,
  );
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    return { ok: false, message: `Vercel API HTTP ${r.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true, deployment: (await r.json()) as VercelDeployment };
}

/** One-shot status by commit SHA (used by verify_deploy). */
export async function checkDeployStatus(
  e: Env,
  commitSha: string,
): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };
  const found = await findBySha(e, commitSha);
  if (!found.ok) return { available: true, status: 'building', message: found.message };
  if (!found.deployment) {
    return {
      available: true,
      status: 'building',
      message: 'No deployment indexed for this commit yet — retry in a few seconds.',
    };
  }
  return verdictFor(e, found.deployment);
}

/** One-shot status by deployment id (used by get_deploy_status — most reliable). */
export async function checkDeployByUid(e: Env, uid: string): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };
  const res = await getDeployment(e, uid);
  if (!res.ok || !res.deployment) {
    return { available: true, status: 'building', message: res.message ?? 'Deployment not found.' };
  }
  return verdictFor(e, res.deployment);
}

/**
 * Best-effort discovery of the deployment id for a just-committed SHA, within
 * a short window. Used by push_app in fire-and-forget mode so it can hand the
 * caller a deploymentUid to poll. Never blocks on the build itself.
 */
export async function discoverDeployment(
  e: Env,
  commitSha: string,
  budgetMs = 6_000,
): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };
  const start = Date.now();
  while (Date.now() - start < budgetMs) {
    const found = await findBySha(e, commitSha);
    if (!found.ok) return { available: true, status: 'building', message: found.message };
    if (found.deployment) return verdictFor(e, found.deployment);
    await wait(2_000);
  }
  return {
    available: true,
    status: 'building',
    message: 'Build queued. Poll verify_deploy with the commit SHA, or get_deploy_status with the deploymentUid.',
  };
}

/**
 * Optional blocking wait (only when push_app is called with
 * waitForDeploy: true). Bounded by the Edge runtime budget, so for real
 * builds it usually returns `building` — prefer fire-and-forget + polling.
 */
export async function waitForDeploy(
  e: Env,
  commitSha: string,
  timeoutMs = 20_000,
): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };
  const start = Date.now();
  let uid: string | undefined;

  const discoveryBudget = Math.min(8_000, Math.floor(timeoutMs / 2));
  while (Date.now() - start < discoveryBudget) {
    const found = await findBySha(e, commitSha);
    if (!found.ok) return { available: true, status: 'building', message: found.message };
    if (found.deployment) {
      uid = found.deployment.uid;
      break;
    }
    await wait(2_000);
  }
  if (!uid) {
    return { available: true, status: 'building', message: 'Build not indexed within wait window.' };
  }

  while (Date.now() - start < timeoutMs) {
    const v = await checkDeployByUid(e, uid);
    if (v.status === 'ready' || v.status === 'error') return v;
    await wait(3_000);
  }
  return { available: true, status: 'building', deploymentUid: uid };
}

/** Fetch build events and return concatenated text for error rows. */
async function getBuildErrorLog(e: Env, uid: string): Promise<string> {
  const r = await vfetch(
    e,
    `/v3/deployments/${uid}/events?builds=1&direction=backward&follow=0&limit=200&teamId=${encodeURIComponent(
      e.VERCEL_TEAM_ID!,
    )}`,
  );
  if (!r.ok) return `(could not fetch build log: HTTP ${r.status})`;
  const events = (await r.json()) as Array<{
    type?: string;
    payload?: { text?: string; info?: { name?: string } };
    text?: string;
  }>;
  const lines = events.map((ev) => ev.payload?.text ?? ev.text ?? '').filter(Boolean);
  const tail = lines.slice(-80).join('\n');
  return tail || '(build log empty)';
}

function extractRelevantError(log: string): string {
  const lines = log.split('\n');
  const markers = [
    /error TS\d+:/,
    /error during build:/,
    /Build failed/,
    /Command ".*" exited with/,
    /Type '/,
    /Property '\w+' does not exist/,
    /Cannot find module/,
    /Unexpected token/,
    /SyntaxError/,
  ];
  let firstError = -1;
  for (let i = 0; i < lines.length; i++) {
    if (markers.some((re) => re.test(lines[i]))) {
      firstError = i;
      break;
    }
  }
  if (firstError === -1) return lines.slice(-30).join('\n');
  const start = Math.max(0, firstError - 2);
  const end = Math.min(lines.length, firstError + 25);
  return lines.slice(start, end).join('\n');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
