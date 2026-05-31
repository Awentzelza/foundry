/**
 * Foundry app registry.
 *
 * Every app on the dashboard is listed here. To add a new app:
 *   1. Create `src/apps/<slug>/index.tsx` exporting a default Ionic React component.
 *   2. Add an entry below.
 *   3. (Optional) Add a matching row to Supabase `foundry_apps` so it can be
 *      toggled active/archived at runtime without redeploy.
 *
 * The registry is the source of truth at build time; Supabase only overlays
 * status. This keeps app code typed and reviewable rather than eval'd from a
 * string in the database.
 */
import type { RegisteredApp } from '@/types/app';

export const APP_REGISTRY: RegisteredApp[] = [
  {
    meta: {
      id: 'grocery-list',
      name: 'Grocery List',
      description: 'Add items, check off, clear. Synced.',
      icon: '🛒',
      route: 'grocery-list',
      needsPersistence: true,
      status: 'active',
    },
    load: () => import('./grocery-list'),
  },
];

export function findApp(id: string): RegisteredApp | undefined {
  return APP_REGISTRY.find((a) => a.meta.id === id);
}
