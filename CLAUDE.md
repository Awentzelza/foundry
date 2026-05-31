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

## The push-app API

`POST /api/push-app`

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

Storage is one row in `foundry_app_data` per `(app_id, key)` pair. The row
id is `${app_id}::${key}`. `value` is JSONB — pass anything serialisable.

If Supabase isn't configured, `useAppData` falls back to in-memory state
and `persistent` is `false`. Apps should still work locally.

## Env vars

Set these in Vercel project settings.

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client + server | Public anon key for client |
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
2. Migrations: run `supabase/migration.sql` in the Supabase SQL editor when
   schema changes. It's idempotent.
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
