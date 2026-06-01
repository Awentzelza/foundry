/**
 * GET /api/health
 * Lightweight liveness check used by the dashboard / monitoring.
 * Intentionally returns no configuration details — health probes don't
 * need to know which integrations are wired up.
 */
import { json } from './_lib';

export const config = { runtime: 'edge' };

export default function handler(): Response {
  return json({ ok: true, time: new Date().toISOString() });
}
