/**
 * useAppData(appId, key, initialValue)
 *
 * Persists JSON-serialisable state to Supabase `foundry_app_data` keyed by
 * (app_id, key). Falls back to in-memory state when Supabase isn't configured,
 * so app components work in local development too.
 *
 * Writes are serialised through a per-hook queue (see below) so rapid
 * `setValue` calls can't race their upserts and leave a stale row behind.
 *
 * IMPORTANT: deletes are soft — call `archive()` to set status='archived',
 * never hard delete. See CLAUDE.md / immutable-data rule.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AppDataRow<T> {
  id: string;
  app_id: string;
  key: string;
  value: T;
  status: 'active' | 'archived';
  updated_at?: string;
}

interface UseAppDataResult<T> {
  value: T;
  setValue: (next: T) => Promise<void>;
  loading: boolean;
  ready: boolean;
  /** True iff persistence is available (Supabase configured). */
  persistent: boolean;
  /** Mark this (appId, key) as archived. Never hard-deletes. */
  archive: () => Promise<void>;
  /**
   * Non-null when the most recent persist failed (network/RLS/db error).
   * Cleared automatically on the next successful write. Lets an app surface a
   * "not saved" state instead of silently losing the edit.
   */
  syncError: string | null;
}

function rowId(appId: string, key: string): string {
  return `${appId}::${key}`;
}

export function useAppData<T>(
  appId: string,
  key: string,
  initialValue: T,
): UseAppDataResult<T> {
  const [value, setLocal] = useState<T>(initialValue);
  const [loading, setLoading] = useState<boolean>(Boolean(supabase));
  const [ready, setReady] = useState<boolean>(!supabase);
  const [syncError, setSyncError] = useState<string | null>(null);
  const initialRef = useRef(initialValue);

  // Write queue. `pending` holds the most recent value still to be persisted
  // (intermediate values are coalesced — only the latest matters). `draining`
  // guards against two drains running at once. Local React state updates stay
  // immediate; only the network write is serialised.
  const pendingRef = useRef<{ has: boolean; value: T }>({ has: false, value: initialValue });
  const drainingRef = useRef(false);
  // Set once the user has written, so a late-returning initial load doesn't
  // clobber a fresh local edit.
  const dirtyRef = useRef(false);

  // Load on mount.
  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setReady(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase!
        .from('foundry_app_data')
        .select('value,status')
        .eq('id', rowId(appId, key))
        .maybeSingle();
      if (cancelled) return;
      if (
        !dirtyRef.current &&
        !error &&
        data &&
        data.status === 'active' &&
        data.value != null
      ) {
        setLocal(data.value as T);
      }
      setLoading(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [appId, key]);

  const drain = useCallback(async () => {
    if (!supabase || drainingRef.current) return;
    drainingRef.current = true;
    try {
      // Keep writing while a newer value is pending. Marking `has=false`
      // before the await means a value that arrives mid-write re-arms the
      // loop, so the last write always reflects the latest value.
      while (pendingRef.current.has) {
        const next = pendingRef.current.value;
        pendingRef.current = { has: false, value: next };
        const row: Partial<AppDataRow<T>> = {
          id: rowId(appId, key),
          app_id: appId,
          key,
          value: next,
          status: 'active',
        };
        try {
          // Supabase reports row-level/db failures via the returned `error`,
          // not by throwing — check both.
          const { error } = await supabase!
            .from('foundry_app_data')
            .upsert(row, { onConflict: 'id' });
          if (error) throw error;
          // Success: clear any prior failure signal.
          setSyncError(null);
        } catch (err) {
          // Don't wedge the queue and don't re-arm `pending` (that would hot-loop
          // on a persistent failure) — a later setValue retries. But surface it:
          // log in dev and expose a signal so the app can show a "not saved" state.
          const message = err instanceof Error ? err.message : 'Failed to save';
          if (import.meta.env.DEV) {
            console.error(`[useAppData] persist failed for ${rowId(appId, key)}:`, err);
          }
          setSyncError(message);
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }, [appId, key]);

  const setValue = useCallback(
    async (next: T) => {
      setLocal(next);
      if (!supabase) return;
      dirtyRef.current = true;
      pendingRef.current = { has: true, value: next };
      await drain();
    },
    [drain],
  );

  const archive = useCallback(async () => {
    setLocal(initialRef.current);
    if (!supabase) return;
    // Drop any queued write so it can't resurrect the row after archiving.
    pendingRef.current = { has: false, value: initialRef.current };
    await supabase
      .from('foundry_app_data')
      .update({ status: 'archived' })
      .eq('id', rowId(appId, key));
  }, [appId, key]);

  return { value, setValue, loading, ready, persistent: !!supabase, archive, syncError };
}
