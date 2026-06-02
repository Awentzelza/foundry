/**
 * Client-side Supabase singleton.
 *
 * If env vars are missing (e.g. before Andre wires Supabase), this exports
 * `null` and code MUST check before use.
 *
 * persistSession is true so magic-link auth survives reloads. detectSessionInUrl
 * lets the magic-link callback (#access_token=...) hydrate a session on landing.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the login gate is enforced. Default OFF so the rollout stays
 * auth-optional (Phase 0/1): the app works unauthenticated exactly as before.
 * Flip VITE_REQUIRE_AUTH=true in Vercel for Phase 2, once RLS is tightened.
 */
export const requireAuth =
  String(import.meta.env.VITE_REQUIRE_AUTH ?? '').toLowerCase() === 'true';

let _client: SupabaseClient | null = null;

if (url && anonKey) {
  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[foundry] Supabase env vars not set — running in no-persistence mode. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.',
  );
}

export const supabase = _client;
export const supabaseReady = _client !== null;
