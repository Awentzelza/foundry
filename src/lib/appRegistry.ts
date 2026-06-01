/**
 * Merges the build-time APP_REGISTRY with runtime status from Supabase.
 *
 * Display identity (name, description, icon) lives with the app's code in
 * APP_REGISTRY — that is the source of truth so the brand-aligned copy ships
 * via git. Supabase is consulted only for runtime status (active/archived),
 * letting an app be hidden without a redeploy. If Supabase isn't configured,
 * the registry is returned as-is.
 */
import { APP_REGISTRY } from '@/apps/registry';
import { supabase } from './supabase';
import type { AppStatus, RegisteredApp } from '@/types/app';

interface FoundryAppRow {
  id: string;
  status: AppStatus;
}

export async function loadActiveApps(): Promise<RegisteredApp[]> {
  if (!supabase) {
    return APP_REGISTRY.filter((a) => a.meta.status === 'active');
  }

  const { data, error } = await supabase
    .from('foundry_apps')
    .select('id,status');

  if (error || !data) {
    return APP_REGISTRY.filter((a) => a.meta.status === 'active');
  }

  const statusById = new Map<string, AppStatus>(
    (data as FoundryAppRow[]).map((r) => [r.id, r.status]),
  );

  return APP_REGISTRY
    .map<RegisteredApp>((app) => {
      const status = statusById.get(app.meta.id) ?? app.meta.status;
      return { ...app, meta: { ...app.meta, status } };
    })
    .filter((a) => a.meta.status === 'active');
}
