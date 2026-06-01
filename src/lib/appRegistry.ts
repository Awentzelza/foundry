/**
 * Merges the build-time APP_REGISTRY with runtime status from Supabase, and
 * applies curated brand display names.
 *
 * registry.ts is AUTO-GENERATED from Supabase on every push_app, so any brand
 * copy written there is overwritten on the next push. DISPLAY_OVERRIDES is the
 * durable, hand-maintained source of truth for an app's on-brand name and
 * description. Supabase is consulted only for runtime status (active/archived).
 */
import { APP_REGISTRY } from '@/apps/registry';
import { supabase } from './supabase';
import type { AppMeta, AppStatus, RegisteredApp } from '@/types/app';

interface FoundryAppRow {
  id: string;
  status: AppStatus;
}

/** Brand-aligned display copy, steward voice. Edit here, not registry.ts. */
export const DISPLAY_OVERRIDES: Record<string, { name?: string; description?: string }> = {
  'workout-streak': { name: 'Training Log', description: 'A record of days trained.' },
  'water-tracker': { name: 'Water', description: 'A record of water taken today.' },
  'pomodoro': { name: 'Pomodoro', description: 'Focused work in measured intervals.' },
  'grocery-list': { name: 'Grocery List', description: 'Items to acquire. Check off as gathered.' },
  'hyrox-tracker': { name: 'Hyrox', description: 'A record of Hyrox splits, pace, and finish time.' },
};

/** Apply the brand display override (and never surface emoji icons). */
export function withDisplay(meta: AppMeta): AppMeta {
  const o = DISPLAY_OVERRIDES[meta.id];
  return {
    ...meta,
    name: o?.name ?? meta.name,
    description: o?.description ?? meta.description,
    icon: '',
  };
}

export async function loadActiveApps(): Promise<RegisteredApp[]> {
  const finish = (apps: RegisteredApp[]) =>
    apps
      .filter((a) => a.meta.status === 'active')
      .map((a) => ({ ...a, meta: withDisplay(a.meta) }));

  if (!supabase) return finish(APP_REGISTRY);

  const { data, error } = await supabase.from('foundry_apps').select('id,status');
  if (error || !data) return finish(APP_REGISTRY);

  const statusById = new Map<string, AppStatus>(
    (data as FoundryAppRow[]).map((r) => [r.id, r.status]),
  );

  return finish(
    APP_REGISTRY.map<RegisteredApp>((app) => ({
      ...app,
      meta: { ...app.meta, status: statusById.get(app.meta.id) ?? app.meta.status },
    })),
  );
}
