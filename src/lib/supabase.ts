/**
 * Client-side Supabase singleton.
 *
 * If env vars are missing (e.g. before Andre wires Supabase), this exports
 * `null` and `useSupabase()` returns null. UI code MUST check before use.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

if (url && anonKey) {
  _client = createClient(url, anonKey, {
    auth: { persistSession: false },
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
