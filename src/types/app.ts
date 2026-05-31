/**
 * Foundry app contract.
 *
 * Each app on the dashboard is described by an `AppMeta` and provides
 * a `FoundryAppComponent` — a self-contained Ionic React component.
 *
 * `id` is the durable identifier (used in routes, Supabase keys, etc.).
 * `slug` matches the directory name under `src/apps/<slug>/`.
 */
import type { ComponentType } from 'react';

export type AppStatus = 'active' | 'archived';

export interface AppMeta {
  /** Stable identifier. Lowercase, hyphenated. Same as slug for in-repo apps. */
  id: string;
  /** Display name. Title case. */
  name: string;
  /** One-line description for the dashboard tile. */
  description: string;
  /** Emoji or short SVG string. Rendered large on the tile. */
  icon: string;
  /** Route under /app/. Conventionally matches the id. */
  route: string;
  /** Whether this app reads/writes to foundry_app_data. */
  needsPersistence: boolean;
  /** Optional override of the Supabase table used for persistence. */
  tableName?: string;
  /** active | archived. Archived apps are hidden from the dashboard. */
  status: AppStatus;
}

export type FoundryAppComponent = ComponentType;

export interface RegisteredApp {
  meta: AppMeta;
  /** Lazy import. The dashboard never imports app code synchronously. */
  load: () => Promise<{ default: FoundryAppComponent }>;
}
