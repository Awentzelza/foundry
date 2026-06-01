/**
 * POST /api/archive-app — REST passthrough to the shared `archiveApp` operation.
 * Prefer /api/mcp → archive_app for Claude-driven archives.
 *
 * Auth: Bearer ${FOUNDRY_PUSH_SECRET}
 * Body: { "id": "meal-plan" }
 *
 * Sets foundry_apps.status = 'archived'. Never hard-deletes.
 */
import { env, json, requireAuth } from './_lib';
import { archiveApp } from './_operations';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const e = env();
  const authError = requireAuth(req, e);
  if (authError) return authError;

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.id) return json({ error: 'Missing `id`' }, { status: 400 });

  const result = await archiveApp(body.id, e);
  if (!result.success) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result);
}
