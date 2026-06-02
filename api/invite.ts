/**
 * POST /api/invite — invite a person to a household.
 *
 * The browser anon key cannot create users, so invites go through this
 * service-role endpoint. Flow:
 *   1. Verify the CALLER's Supabase JWT (Authorization: Bearer <access_token>).
 *   2. Confirm the caller is an owner/admin of the target household.
 *   3. Use the service role to invite the email (creates the auth.users row)
 *      and insert a pending `household_members` row (status='invited').
 *
 * Body: { "householdId": "<uuid>", "email": "person@example.com", "role"?: "member" }
 */
import { env, json, sb, getCaller } from './_lib';

export const config = { runtime: 'edge' };

interface InviteBody {
  householdId?: string;
  email?: string;
  role?: 'member' | 'admin';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const e = env();
  const client = sb(e);
  if (!client) return json({ error: 'Supabase not configured' }, { status: 500 });

  const caller = await getCaller(req, client);
  if (!caller) return json({ error: 'Unauthorized' }, { status: 401 });

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const householdId = (body.householdId ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const role: 'member' | 'admin' = body.role === 'admin' ? 'admin' : 'member';

  if (!householdId) return json({ error: 'Missing householdId' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return json({ error: 'Invalid email' }, { status: 400 });

  // Authorise: caller must be an active owner/admin of this household.
  const { data: membership, error: mErr } = await client
    .from('household_members')
    .select('role, status')
    .eq('household_id', householdId)
    .eq('user_id', caller.id)
    .maybeSingle();
  if (mErr) return json({ error: mErr.message }, { status: 500 });
  if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role as string)) {
    return json({ error: 'Forbidden — owner or admin only' }, { status: 403 });
  }

  // Invite (creates or reuses the auth user). Redirect back to the app origin.
  const origin = req.headers.get('origin') || new URL(req.url).origin;
  let invitedId: string | null = null;
  const { data: invited, error: invErr } = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo: origin,
  });
  if (invErr || !invited?.user) {
    // The email may already be a registered user. Surface a clear message.
    return json(
      {
        error:
          (invErr?.message ?? 'Invite failed') +
          ' (If this person already has an account, add them by their existing email once self-signup is enabled.)',
      },
      { status: 502 },
    );
  }
  invitedId = invited.user.id;

  // Pending membership row.
  const { error: insErr } = await client.from('household_members').upsert(
    {
      household_id: householdId,
      user_id: invitedId,
      role,
      status: 'invited',
      email,
      invited_at: new Date().toISOString(),
    },
    { onConflict: 'household_id,user_id' },
  );
  if (insErr) return json({ error: insErr.message }, { status: 500 });

  return json({ success: true, userId: invitedId, email, role });
}
