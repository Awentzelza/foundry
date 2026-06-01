/**
 * Foundry — Vercel API helpers.
 *
 * Used by pushApp to verify that a freshly-committed app actually builds.
 * If the build fails, we fetch the build log so we can return the actual
 * tsc/Vite error back to Claude as a structured tool error.
 *
 * Env required: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID.
 * If any are missing, polling is silently skipped and pushApp just returns
 * the commit SHA without a build verdict.
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
  meta?: { githubCommitSha?: string };
  created?: number;
}

export interface DeployVerdict {
  available: boolean; // false if VERCEL_* env not configured
  status?: 'ready' | 'error' | 'timeout';
  deploymentUid?: string;
  url?: string;
  errorLog?: string;
}

function configured(e: Env): boolean {
  return Boolean(e.VERCEL_TOKEN && e.VERCEL_PROJECT_ID && e.VERCEL_TEAM_ID);
}

/**
 * One-shot status lookup for the deployment matching `commitSha`. Doesn't
 * loop — call repeatedly if you need to poll. Use when push_app's internal
 * wait timed out.
 */
export async function checkDeployStatus(
  e: Env,
  commitSha: string,
): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };
  const deployment = await findDeploymentBySha(e, commitSha);
  if (!deployment) return { available: true, status: 'timeout' };
  if (deployment.state === 'READY') {
    return {
      available: true,
      status: 'ready',
      deploymentUid: deployment.uid,
      url: deployment.url ? `https://${deployment.url}` : undefined,
    };
  }
  if (deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
    const log = await getBuildErrorLog(e, deployment.uid);
    return {
      available: true,
      status: 'error',
      deploymentUid: deployment.uid,
      errorLog: extractRelevantError(log),
    };
  }
  // Still building (INITIALIZING / QUEUED / BUILDING)
  return { available: true, status: 'timeout', deploymentUid: deployment.uid };
}

async function vfetch(e: Env, path: string): Promise<Response> {
  return fetch(`https://api.vercel.com${path}`, {
    headers: {
      authorization: `Bearer ${e.VERCEL_TOKEN}`,
      'user-agent': 'foundry-mcp',
    },
  });
}

/**
 * Find the production deployment for a specific commit SHA.
 * Vercel may not have indexed it the instant we ask, so callers should
 * retry with backoff.
 */
async function findDeploymentBySha(
  e: Env,
  sha: string,
): Promise<VercelDeployment | null> {
  const url =
    `/v6/deployments?projectId=${encodeURIComponent(e.VERCEL_PROJECT_ID!)}` +
    `&teamId=${encodeURIComponent(e.VERCEL_TEAM_ID!)}` +
    `&limit=20&target=production`;
  const r = await vfetch(e, url);
  if (!r.ok) return null;
  const j = (await r.json()) as { deployments?: VercelDeployment[] };
  const list = j.deployments ?? [];
  return (
    list.find((d) => d.meta?.githubCommitSha === sha) ??
    // Sometimes commit SHA isn't in meta yet; fall back to newest.
    list[0] ??
    null
  );
}

async function getDeployment(
  e: Env,
  uid: string,
): Promise<VercelDeployment | null> {
  const r = await vfetch(
    e,
    `/v13/deployments/${uid}?teamId=${encodeURIComponent(e.VERCEL_TEAM_ID!)}`,
  );
  if (!r.ok) return null;
  return (await r.json()) as VercelDeployment;
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
  const lines = events
    .map((ev) => ev.payload?.text ?? ev.text ?? '')
    .filter(Boolean);
  // Keep the last ~80 lines — that's where errors live.
  const tail = lines.slice(-80).join('\n');
  return tail || '(build log empty)';
}

/**
 * Poll Vercel until the deployment for `commitSha` reaches a terminal state,
 * up to ~90 seconds. Returns the verdict, including the error log on failure.
 */
export async function waitForDeploy(
  e: Env,
  commitSha: string,
  timeoutMs = 50_000, // stay under the 60s Vercel Node function limit
): Promise<DeployVerdict> {
  if (!configured(e)) return { available: false };

  const start = Date.now();
  let deployment: VercelDeployment | null = null;

  // 1) Discovery phase — wait until Vercel registers a deployment for this SHA.
  while (Date.now() - start < 15_000) {
    deployment = await findDeploymentBySha(e, commitSha);
    if (deployment && deployment.meta?.githubCommitSha === commitSha) break;
    await wait(2_500);
  }
  if (!deployment) {
    return { available: true, status: 'timeout' };
  }

  // 2) Status phase — poll until READY / ERROR / CANCELED.
  while (Date.now() - start < timeoutMs) {
    const fresh = await getDeployment(e, deployment.uid);
    if (!fresh) break;
    if (fresh.state === 'READY') {
      return {
        available: true,
        status: 'ready',
        deploymentUid: fresh.uid,
        url: fresh.url ? `https://${fresh.url}` : undefined,
      };
    }
    if (fresh.state === 'ERROR' || fresh.state === 'CANCELED') {
      const log = await getBuildErrorLog(e, fresh.uid);
      return {
        available: true,
        status: 'error',
        deploymentUid: fresh.uid,
        errorLog: extractRelevantError(log),
      };
    }
    await wait(4_000);
  }

  return { available: true, status: 'timeout', deploymentUid: deployment.uid };
}

/**
 * Trim a long Vercel build log down to the TS / Vite / build-tool error
 * region. Heuristic but usually finds the real signal.
 */
function extractRelevantError(log: string): string {
  const lines = log.split('\n');

  // Common error markers from Vite + tsc.
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

  // Find the first index where a marker appears.
  let firstError = -1;
  for (let i = 0; i < lines.length; i++) {
    if (markers.some((re) => re.test(lines[i]))) {
      firstError = i;
      break;
    }
  }

  if (firstError === -1) {
    // Just return the tail.
    return lines.slice(-30).join('\n');
  }

  const start = Math.max(0, firstError - 2);
  const end = Math.min(lines.length, firstError + 25);
  return lines.slice(start, end).join('\n');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
