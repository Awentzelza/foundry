/**
 * POST /api/archive-app
 *
 * Auth: Authorization: Bearer ${FOUNDRY_PUSH_SECRET}
 * Body: { "id": "meal-plan" }
 *
 * Sets foundry_apps.status = 'archived'. NEVER deletes.
 * The dashboard hides archived apps. Code stays in the repo and can be
 * un-archived by setting status back to 'active'.
 */
import { env, isValidId, json, requireAuth, sb } from './_lib';

export const config = { runtime: 'edge' };

interface ArchiveBody {
  id?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const e = env();
  const authError = requireAuth(req, e);
  if (authError) return authError;

  let body: ArchiveBody;
  try {
    body = (await req.json()) as ArchiveBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id } = body;
  if (!id || !isValidId(id)) {
    return json({ error: 'Invalid `id`' }, { status: 400 });
  }

  const client = sb(e);
  if (!client) {
    return json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { error } = await client
    .from('foundry_apps')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }
  return json({ success: true, id, status: 'archived' });
}
