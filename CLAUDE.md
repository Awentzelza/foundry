# CLAUDE.md — Foundry

Andre's personal AI-powered micro-app platform. A single hosted web app
(React + Vite + TypeScript + Ionic on Vercel) that acts as a dashboard of
mini tools. Claude pushes new tools (apps) on demand via an HTTP API.

This file is the operating manual for any future Claude instance working in
this repo. Read it first.

## Repo layout

```
foundry/
├── api/                    Vercel Edge Functions (push-app, archive-app, health)
├── public/                 Static assets (favicon, PWA icons, manifest pieces)
├── scripts/                Build-time helpers (icon generator)
├── src/
│   ├── apps/               One directory per app. registry.ts lists them.
│   │   ├── registry.ts
│   │   └── grocery-list/   Seed app (default-exports Ionic React component)
│   ├── components/         Shared UI (AppTile, EmptyForge)
│   ├── hooks/              Cross-app hooks (useAppData)
│   ├── lib/                supabase client + appRegistry overlay
│   ├── pages/              Dashboard, AppHost, NotFound
│   ├── theme/              variables.css + global.css (forge/ember dark)
│   └── types/              Shared TS types
├── supabase/
│   └── migration.sql       Run this in the Supabase SQL editor
├── capacitor.config.ts
├── vercel.json
└── package.json
```

## Architecture (read this before changing anything)

Foundry is intentionally **NOT** a runtime-eval system. We considered storing
component code as strings in Supabase and evaluating it at runtime — that was
in an early draft of the spec and rejected because:

1. It can't be type-checked or linted.
2. App Store review will block Capacitor builds that download executable JS.
3. It encourages ad-hoc Claude coding without a solid foundation.

Instead, **every app is a real TypeScript module in this repo.**

- An app lives at `src/apps/<id>/index.tsx`.
- Its default export is an Ionic React functional component.
- It's listed in `src/apps/registry.ts` with metadata + a lazy `import()`.
- The dashboard reads `APP_REGISTRY` at build time; Supabase only overlays
  runtime status (active/archived) and display fields (name/description/icon).

To add a new app, Claude commits two files to GitHub: `src/apps/<id>/index.tsx`
and an updated `src/apps/registry.ts`. The `/api/push-app` endpoint does both
in one call. Vercel's GitHub integration auto-deploys on push to `main`.

### The component contract

A Foundry app component MUST:

- Be a default export.
- Be a function component taking **no required props**.
- Use only `react` hooks and `@ionic/react` components (plus `ionicons` icons).
- Render markup that lives inside an existing `IonContent` — DON'T render
  `<IonPage>`, `<IonContent>`, or `<IonHeader>` yourself. The Foundry
  shell (`pages/AppHost.tsx`) provides them.
- Use `useAppData(appId, key, initial)` for persistence — never call
  `supabase` directly from an app.
- Never hard-delete. See "Immutable data rule" below.

A minimal app:

```tsx
import { IonButton, IonItem, IonLabel, IonList } from '@ionic/react';
import { useAppData } from '@/hooks/useAppData';

interface Note { id: string; text: string }

export default function NotesApp() {
  const { value, setValue } = useAppData<Note[]>('notes', 'items', []);
  return (
    <IonList inset>
      {value.map((n) => <IonItem key={n.id}><IonLabel>{n.text}</IonLabel></IonItem>)}
      <IonButton onClick={() => setValue([...value, { id: crypto.randomUUID(), text: 'New' }])}>
        Add
      </IonButton>
    </IonList>
  );
}
```

### Per-app styling (optional, MFE-scoped)

Apps may ship their own stylesheet for structure/layout while branding stays
consistent — the hybrid model (the lesson from Ketelo's federated MFE, which
shares one token layer for consistency).

- Pass a CSS module as the `styles` arg to `push_app`. It is committed to
  `src/apps/<id>/styles.module.css`. Import it in the component as
  `import s from './styles.module.css'` and use the hashed class names
  (`<div className={s.card}>`). Vite hashes the classes, so an app's CSS can
  never leak into the shell or another app — true MFE isolation.
- The shared `--foundry-*` token layer (`src/theme/variables.css`, declared on
  `:root`) is the branding spine. CSS custom properties inherit through Ionic's
  shadow DOM, so `var(--foundry-*)` resolves inside app markup and inside Ionic
  component parts. Apps **consume** these tokens.
- Restyle an Ionic component the Ionic way: set its own CSS vars
  (`--background`, `--color`, `--border-color`, `--padding`, ...) to a
  `var(--foundry-*)` token. Use `::part()` for finer control.
- The stylesheet is **brand-checked** at push time (same gate as component
  code): tokens only (no raw hex/rgb/hsl), brand fonts only, no emoji; and it
  must **never redefine** a `--foundry-*` / `--ion-*` token (that would drift
  the whole design language). Gradients/glow/animation are soft warnings.
- The app mounts inside `<div className="foundry-app-scope" data-app="<id>">`
  (AppHost), giving each app a stable `[data-app]` root.

Call `get_component_example` — it returns both a minimal inline-styled
component and a CSS-module variant (`cssModuleExample: { component, styles }`).

## Foundry MCP server (preferred interface)

Foundry exposes an MCP server at `POST /api/mcp` so any Claude client can
push apps as a single tool call. Connect once with a bearer token; future
sessions just call `foundry__push_app(...)`.

Tools:

| Tool | Args | Effect |
| --- | --- | --- |
| `push_app` | `id, name, description?, icon, route?, componentCode, styles?, needsPersistence?, dataScope?` | Commits `src/apps/<id>/index.tsx` to GitHub, regenerates `src/apps/registry.ts`, upserts `foundry_apps` row. Vercel redeploys ~30-60s later. New apps land **ungranted** (owner sees them; provision others on `/admin`). |
| `archive_app` | `id` | Sets `status='archived'`. Never deletes. |
| `list_apps` | `includeArchived?` | Returns active apps (or all). |
| `get_app` | `id` | Returns one row. |

Auth: `Authorization: Bearer ${FOUNDRY_PUSH_SECRET}` on every request.

Connect from Claude Desktop / Cowork:

```jsonc
{
  "mcpServers": {
    "foundry": {
      "url": "https://foundry-seven-omega.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer <FOUNDRY_PUSH_SECRET>" }
    }
  }
}
```

See `PUSH_TEMPLATE.md` for the human-pastable prompt template.

## REST endpoints (legacy / ad-hoc)

The REST endpoints below remain available for curl-based testing and CI.
Prefer the MCP tools above for any Claude-driven push.

### POST /api/push-app

Headers: `Authorization: Bearer ${FOUNDRY_PUSH_SECRET}`, `Content-Type: application/json`

Body:
```json
{
  "id": "meal-plan",
  "name": "Meal Plan",
  "description": "Weekly dinners for Andre & Isabel",
  "icon": "🍽️",
  "route": "meal-plan",
  "componentCode": "<full TSX module as a string>",
  "needsPersistence": false
}
```

- `id` — lowercase, hyphenated, `[a-z][a-z0-9-]{1,39}`. Doubles as the slug
  and Supabase key prefix.
- `componentCode` — full `.tsx` module string. MUST contain `export default`.
  This is committed verbatim to `src/apps/<id>/index.tsx`.
- `route` — usually equal to `id`. The app opens at `/app/<route>`.

Response:
```json
{
  "success": true,
  "id": "meal-plan",
  "route": "/app/meal-plan",
  "commit": { "sha": "abc123..." },
  "supabase": { "ok": true }
}
```

Side effects:
1. Validates bearer token.
2. Upserts metadata into Supabase `foundry_apps`.
3. If `GITHUB_TOKEN` env is set: commits the component file to
   `src/apps/<id>/index.tsx` and regenerates `src/apps/registry.ts`.
   Vercel then auto-deploys (~30-60s).

`POST /api/archive-app` — body `{ "id": "..." }`. Sets status to `archived`.
NEVER deletes. To revive, set status back to `active` in Supabase or
re-push.

`GET /api/health` — returns config status.

## Immutable data rule

**Never hard-delete anything in Supabase.** Always set `status = 'archived'`.

- `foundry_apps`: `status = 'archived'` hides from dashboard.
- `foundry_app_data`: `status = 'archived'` makes the row invisible to
  `useAppData`, but the row stays.
- The `useAppData` hook enforces this — `archive()` does an UPDATE, not a
  DELETE. If you write SQL directly, do the same.

## Persistence

Apps persist state with the `useAppData` hook:

```ts
const { value, setValue, archive, loading, persistent } = useAppData<T>(
  appId,      // 'meal-plan'
  key,        // 'plan' — namespace within the app
  initial,    // default value while loading / when no row exists
);
```

`value` is JSONB — pass anything serialisable. The row id is **scoped by the
app's fixed `data_scope`** (see Multi-user below):

- `shared`   → `${app_id}::${key}::${householdId}` (one row per household)
- `personal` → `${app_id}::${key}::${householdId}::${userId}` (one per member)
- legacy / no session → `${app_id}::${key}` (single-tenant fallback)

App code does NOT need to know any of this — `useAppData` reads the scope and
the current household/user from session context and builds the id itself. Apps
just call `useAppData(appId, key, initial)` exactly as before.

If Supabase isn't configured, `useAppData` falls back to in-memory state
and `persistent` is `false`. Apps should still work locally.

## Multi-user (households + provisioning + data scope)

Foundry is single-app but multi-tenant. The model has three independent axes:

- **Household** — the container. One row in `households`. People are
  `household_members` with a `role` (`owner` / `admin` / `member`) and a
  `status` (`invited` / `active`). Andre is owner; Bel is a member.
- **Provisioning (grants)** — *who can open an app.* A row in `app_grants`
  grants an app to the **whole household** (`member_user_id IS NULL`) or to a
  **specific member** (`member_user_id = <uid>`). Nothing is visible to a
  member unless granted. **Owners/admins implicitly see every active app**
  (a role short-circuit in `loadActiveApps`, not grant rows) so they can't
  lock themselves out. New apps push **ungranted**.
- **Data scope** — *whose data an app shows.* `foundry_apps.data_scope` is
  fixed per app: `shared` (one household dataset, e.g. grocery-list, meal-plan)
  or `personal` (each member's own data, e.g. water, training-log). It drives
  the `useAppData` row id (see Persistence). Set it at creation via
  `push_app({ dataScope })` (default `personal`). Changing it after data exists
  is a real migration (1 row ↔ N rows), so the `/admin` UI shows it read-only.

**Auth** is Supabase magic link (`src/pages/Login.tsx`). Session + household +
role are resolved in `src/lib/session.tsx` (`SessionProvider` / `useSession`),
which fails **closed** to `member` if a role can't be read. The login gate in
`App.tsx` is enforced only when `VITE_REQUIRE_AUTH=true`; otherwise the app is
auth-optional and behaves single-tenant (legacy row ids, all apps visible) so
the rollout can't lock anyone out.

**Admin** (`/admin`, owner/admin only, linked from the dashboard gear) manages
the household name, members (invite / role / remove; owner row locked; pending
invites), and per-app provisioning (No one / Everyone / Specific members). It
writes `app_grants` / `household_members` directly via the authenticated
client — **RLS is what actually enforces** that only owners/admins can write.
Inviting a person needs the service role (the anon key can't create users), so
it goes through `POST /api/invite`.

**RLS is the security-critical piece.** Helpers `is_member(hh)` / `is_admin(hh)`
/ `is_owner(hh)` are `SECURITY DEFINER` (avoid policy recursion). The tightened
`foundry_app_data` policy is
`is_member(household_id) AND (user_id IS NULL OR user_id = auth.uid())`. The
service role bypasses RLS, so `push_app` / `/api/invite` / backfill are
unaffected. Always run `db/2026-06-02_p2_rls_tests.sql` (it rolls back) before
applying the tightening migration, and before inviting anyone new.

## Env vars

Set these in Vercel project settings.

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client + server | Public anon key for client |
| `VITE_REQUIRE_AUTH` | client | `true` enforces the magic-link login gate (Phase 2). Default off = auth-optional. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Privileged writes from edge fns |
| `FOUNDRY_PUSH_SECRET` | server only | Bearer for push-app / archive-app |
| `GITHUB_TOKEN` | server only | PAT with `repo` scope (for push-app commits) |
| `GITHUB_OWNER` | server only | Default: `Awentzelza` |
| `GITHUB_REPO` | server only | Default: `foundry` |
| `GITHUB_DEFAULT_BRANCH` | server only | Default: `main` |
| `ANTHROPIC_API_KEY` | server only | Reserved for future server-side Claude calls |

`.env.example` documents these. Never commit `.env`.

## Deployment

1. `git push origin main` — Vercel auto-deploys.
2. Migrations: run the SQL files in `db/` in the Supabase SQL editor when
   schema changes (idempotent). Multi-user rollout order: `p0a_schema` →
   deploy → sign in once → `p0b_backfill` → verify → `p2_rls_tests` →
   `p2_rls_tighten` (+ set `VITE_REQUIRE_AUTH=true`). See Multi-user below.
3. After Vercel builds, the PWA service worker auto-updates clients.

## PWA + Capacitor

- PWA is configured via `vite-plugin-pwa`. After install:
  - On iOS: Safari → Share → Add to Home Screen → "Foundry" appears as an app.
  - On Android: Chrome offers install prompt automatically.
- Capacitor wraps the same web app for native shells:
  - `npm run cap:sync` — build + sync to iOS/Android projects.
  - `npx cap add ios` — first-time iOS shell creation (requires Xcode).
  - `npx cap add android` — Android shell (requires Android Studio).
  - `npm run cap:open:ios` — open Xcode project.

## Common Claude tasks

**"Push <app name> to Foundry"** — Use `/api/push-app`. Generate clean TSX
that follows the component contract. Pick a sensible emoji + id.

**"Archive <app name>"** — Use `/api/archive-app`.

**"Update <app name>"** — Same `/api/push-app` call with the same `id`.
The endpoint upserts.

**"Show me what's on Foundry"** — Query `foundry_apps` where status='active',
or fetch `/api/health` for config and read the registry from the repo.

## Coding standards (enforced by tsc + eslint)

- TypeScript strict mode; no `any`.
- React function components, hooks only.
- Ionic React components for all interactive UI (don't reach for raw HTML
  inputs/buttons except where Ionic doesn't fit).
- No new top-level dependencies in app modules unless they're already in
  `package.json`. If a new app needs a new lib, update `package.json` too.
- Path alias `@/` resolves to `src/`.
- Keep apps self-contained — no cross-imports between `src/apps/<a>` and
  `src/apps/<b>`.

## Brand image (enforced at push time)

Foundry follows the Brand Book: a private, editorial "signet" identity, not a
startup SaaS look. Every new app must pass the brand check in
`api/_validate.ts`. **Hard rules reject the push:**

- **No emoji.** Use typographic marks/labels, never emoji.
- **No exclamation points in copy.** Foundry speaks as a calm steward that
  states facts — never a coach. ("Recorded." not "Great job!")
- **Colours only via `var(--foundry-*)` tokens.** No raw hex outside the
  palette. Ember (`--foundry-ember`) is the *only* accent; Mark Gold
  (`--foundry-mark-gold`) is reserved for the signet/wordmark and never used
  in UI.
- **Fonts only via `var(--foundry-font-*)`** — Fraunces (display), JetBrains
  Mono (labels, uppercase + tracked), EB Garamond (body).

**Soft rules warn** (push still succeeds): gradients, box-shadow/glow, and
continuous animation. Surfaces are flat; the mark stays still.

Card anatomy: a hallmark label (mono, uppercase) → a primary value (Fraunces)
→ a supporting line (EB Garamond). No celebration, no badges, no streaks, no
gamification. Call `get_component_example` for a compliant starting point.

### Available `--foundry-*` tokens (use these exact names)

All of the following are defined in `src/theme/variables.css` and are valid.
A past session wrongly "corrected" some of these away — don't. Use tokens;
never raw hex.

Colour (canonical, and the back-compat aliases also work):

- `--foundry-bg` · `--foundry-card` (alias `--foundry-bg-card`) ·
  `--foundry-elevated` (alias `--foundry-bg-elevated`)
- `--foundry-border` · `--foundry-border-strong`
- `--foundry-text` · `--foundry-text-muted` · `--foundry-text-subtle`
  (alias `--foundry-text-dim`)
- `--foundry-ember` (the only accent) · `--foundry-ember-bright` ·
  `--foundry-ember-dim`
- `--foundry-mark-gold` — signet/wordmark ONLY, never UI

Type (three fonts — there IS a body token):

- `--foundry-font-display` (Fraunces) — headlines, hero numbers
- `--foundry-font-mono` (JetBrains Mono) — labels, uppercase + tracked
- `--foundry-font-body` (EB Garamond) — body copy

Radius: `--foundry-radius-sm | -md | -lg`.

## Deploys are async

`push_app` returns immediately after the commit with a `deploymentUid` and
`deploy.status: "building"`. The build runs on Vercel for 30-90s. Poll
`get_deploy_status({ deploymentUid, appId })` (most reliable) or
`verify_deploy({ commitSha, appId })` until you get `ready` (live) or `error`
(with `errorLog`). Passing `appId` auto-archives the app if its build errored.
A failed build never goes live — the last good build keeps serving — so a
broken push never shows a broken tile.
