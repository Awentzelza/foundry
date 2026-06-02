/**
 * Merges the build-time APP_REGISTRY with runtime status from Supabase, applies
 * curated brand display names, and filters to the apps the current member has
 * been provisioned (granted). Owners/admins see every active app.
 *
 * registry.ts is AUTO-GENERATED from Supabase on every push_app, so any brand
 * copy written there is overwritten on the next push. DISPLAY_OVERRIDES is the
 * durable, hand-maintained source of truth for an app's on-brand name and
 * description.
 */
import { APP_REGISTRY } from '@/apps/registry';
import { supabase } from './supabase';
import type { Role } from './session';
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
  'meal-plan': { name: 'Meal Plan', description: 'The week’s dinners and the grocery run.' },
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

export interface LoadAppsScope {
  /** True if a user is signed in. When false, the auth-optional legacy path
   *  shows all active apps (single-tenant behaviour). */
  signedIn?: boolean;
  householdId?: string | null;
  userId?: string | null;
  role?: Role | null;
}

export async function loadActiveApps(scope: LoadAppsScope = {}): Promise<RegisteredApp[]> {
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

  const active = finish(
    APP_REGISTRY.map<RegisteredApp>((app) => ({
      ...app,
      meta: { ...app.meta, status: statusById.get(app.meta.id) ?? app.meta.status },
    })),
  );

  const { signedIn, householdId, userId, role } = scope;

  // Not signed in (auth-optional rollout): behave as the single-tenant version
  // and show all active apps.
  if (!signedIn) return active;

  // Owners & admins see everything (implicitly granted) — they can never lock
  // themselves out of their own apps.
  if (role === 'owner' || role === 'admin') return active;

  // Signed in but not provisioned into a household yet: empty (fail closed).
  if (!householdId) return [];

  // Member: filter to apps granted household-wide (member_user_id null) or to
  // this member specifically. On any error, fail closed to an empty list.
  const { data: grants, error: grantErr } = await supabase
    .from('app_grants')
    .select('app_id, member_user_id')
    .eq('household_id', householdId);

  if (grantErr || !grants) return [];

  const grantedAppIds = new Set<string>();
  for (const g of grants as { app_id: string; member_user_id: string | null }[]) {
    if (g.member_user_id == null || g.member_user_id === userId) {
      grantedAppIds.add(g.app_id);
    }
  }

  return active.filter((a) => grantedAppIds.has(a.meta.id));
}
