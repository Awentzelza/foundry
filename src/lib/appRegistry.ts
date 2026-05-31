/**
 * Merges the build-time APP_REGISTRY with runtime status from Supabase
 * (foundry_apps table). If Supabase isn't configured, returns the registry
 * as-is.
 */
import { APP_REGISTRY } from '@/apps/registry';
import { supabase } from './supabase';
import type { AppMeta, AppStatus, RegisteredApp } from '@/types/app';

interface FoundryAppRow {
  id: string;
  status: AppStatus;
  name?: string | null;
  description?: string | null;
  icon?: string | null;
}

export async function loadActiveApps(): Promise<RegisteredApp[]> {
  if (!supabase) {
    return APP_REGISTRY.filter((a) => a.meta.status === 'active');
  }

  const { data, error } = await supabase
    .from('foundry_apps')
    .select('id,status,name,description,icon');

  if (error || !data) {
    return APP_REGISTRY.filter((a) => a.meta.status === 'active');
  }

  const byId = new Map<string, FoundryAppRow>(
    (data as FoundryAppRow[]).map((r) => [r.id, r]),
  );

  return APP_REGISTRY
    .map<RegisteredApp>((app) => {
      const row = byId.get(app.meta.id);
      if (!row) return app;
      const meta: AppMeta = {
        ...app.meta,
        status: row.status ?? app.meta.status,
        name: row.name ?? app.meta.name,
        description: row.description ?? app.meta.description,
        icon: row.icon ?? app.meta.icon,
      };
      return { ...app, meta };
    })
    .filter((a) => a.meta.status === 'active');
}
