/**
 * POST /api/push-app — REST passthrough to the shared `pushApp` operation.
 *
 * Prefer the MCP server (/api/mcp → push_app tool) for Claude-driven pushes.
 * This endpoint stays for ad-hoc curl / CI use.
 *
 * Headers: Authorization: Bearer ${FOUNDRY_PUSH_SECRET}
 * Body:
 *   {
 *     "id": "meal-plan",
 *     "name": "Meal Plan",
 *     "description": "Weekly dinners",
 *     "icon": "🍽️",
 *     "route": "meal-plan",
 *     "componentCode": "<full TSX module>",
 *     "needsPersistence": false
 *   }
 */
import { env, json, requireAuth } from './_lib';
import { pushApp, type PushAppInput } from './_operations';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const e = env();
  const authError = requireAuth(req, e);
  if (authError) return authError;

  let body: PushAppInput;
  try {
    body = (await req.json()) as PushAppInput;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await pushApp(body, e);
  if (!result.success) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result);
}
