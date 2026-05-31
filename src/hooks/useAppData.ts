/**
 * useAppData(appId, key, initialValue)
 *
 * Persists JSON-serialisable state to Supabase `foundry_app_data` keyed by
 * (app_id, key). Falls back to in-memory state when Supabase isn't configured,
 * so app components work in local development too.
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
  const initialRef = useRef(initialValue);

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
      if (!error && data && data.status === 'active' && data.value != null) {
        setLocal(data.value as T);
      }
      setLoading(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [appId, key]);

  const setValue = useCallback(
    async (next: T) => {
      setLocal(next);
      if (!supabase) return;
      const row: Partial<AppDataRow<T>> = {
        id: rowId(appId, key),
        app_id: appId,
        key,
        value: next,
        status: 'active',
      };
      await supabase.from('foundry_app_data').upsert(row, { onConflict: 'id' });
    },
    [appId, key],
  );

  const archive = useCallback(async () => {
    setLocal(initialRef.current);
    if (!supabase) return;
    await supabase
      .from('foundry_app_data')
      .update({ status: 'archived' })
      .eq('id', rowId(appId, key));
  }, [appId, key]);

  return { value, setValue, loading, ready, persistent: !!supabase, archive };
}
