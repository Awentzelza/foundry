/**
 * useAppData(appId, key, initialValue)
 *
 * Persists JSON-serialisable state to Supabase `foundry_app_data`. The row id
 * is SCOPED by the app's fixed data_scope (read from session context):
 *   shared   :  <app>::<key>::<householdId>            (one row per household)
 *   personal :  <app>::<key>::<householdId>::<userId>  (one row per member)
 * Before a household is resolved (no session / Supabase unconfigured / rollout
 * auth-optional phase) it falls back to the legacy unscoped id `<app>::<key>`,
 * so single-tenant behaviour is preserved exactly.
 *
 * Writes are serialised through a per-hook queue so rapid `setValue` calls
 * can't race their upserts. Deletes are soft — call `archive()`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';

interface AppDataRow<T> {
  id: string;
  app_id: string;
  key: string;
  value: T;
  status: 'active' | 'archived';
  household_id?: string | null;
  user_id?: string | null;
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
   * Cleared automatically on the next successful write.
   */
  syncError: string | null;
}

export function useAppData<T>(
  appId: string,
  key: string,
  initialValue: T,
): UseAppDataResult<T> {
  const { householdId, userId, scopes } = useSession();
  const scope = scopes[appId] ?? 'personal';

  // Scoped row id. Falls back to the legacy unscoped id until a household is
  // known, so the auth-optional rollout keeps working.
  const id = useMemo(() => {
    if (!householdId) return `${appId}::${key}`;
    return scope === 'personal'
      ? `${appId}::${key}::${householdId}::${userId ?? 'anon'}`
      : `${appId}::${key}::${householdId}`;
  }, [appId, key, householdId, userId, scope]);

  const [value, setLocal] = useState<T>(initialValue);
  const [loading, setLoading] = useState<boolean>(Boolean(supabase));
  const [ready, setReady] = useState<boolean>(!supabase);
  const [syncError, setSyncError] = useState<string | null>(null);
  const initialRef = useRef(initialValue);

  const pendingRef = useRef<{ has: boolean; value: T }>({ has: false, value: initialValue });
  const drainingRef = useRef(false);
  const dirtyRef = useRef(false);

  // Build the row to persist, stamping scope columns when a household is known.
  const buildRow = useCallback(
    (next: T): Partial<AppDataRow<T>> => {
      const row: Partial<AppDataRow<T>> = {
        id,
        app_id: appId,
        key,
        value: next,
        status: 'active',
      };
      if (householdId) {
        row.household_id = householdId;
        row.user_id = scope === 'personal' ? userId : null;
      }
      return row;
    },
    [id, appId, key, householdId, userId, scope],
  );

  // Load on mount / when the scoped id changes (e.g. household resolves).
  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setReady(true);
      return;
    }
    dirtyRef.current = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase!
        .from('foundry_app_data')
        .select('value,status')
        .eq('id', id)
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
  }, [id]);

  const drain = useCallback(async () => {
    if (!supabase || drainingRef.current) return;
    drainingRef.current = true;
    try {
      while (pendingRef.current.has) {
        const next = pendingRef.current.value;
        pendingRef.current = { has: false, value: next };
        try {
          const { error } = await supabase!
            .from('foundry_app_data')
            .upsert(buildRow(next), { onConflict: 'id' });
          if (error) throw error;
          setSyncError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to save';
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error(`[useAppData] persist failed for ${id}:`, err);
          }
          setSyncError(message);
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }, [buildRow, id]);

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
    pendingRef.current = { has: false, value: initialRef.current };
    await supabase.from('foundry_app_data').update({ status: 'archived' }).eq('id', id);
  }, [id]);

  return { value, setValue, loading, ready, persistent: !!supabase, archive, syncError };
}
