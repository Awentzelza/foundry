/**
 * GET /api/health
 * Lightweight check used by the dashboard / monitoring.
 */
import { env, json } from './_lib';

export const config = { runtime: 'edge' };

export default function handler(): Response {
  const e = env();
  return json({
    ok: true,
    supabase: Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY),
    github: Boolean(e.GITHUB_TOKEN),
    pushAuthConfigured: Boolean(e.FOUNDRY_PUSH_SECRET),
    time: new Date().toISOString(),
  });
}
