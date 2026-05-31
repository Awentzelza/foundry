# Foundry

Andre's personal AI-powered micro-app platform. A dashboard of forged tools — meal planners, grocery lists, fitness trackers, budget scoreboards — all under one URL, created and managed by Claude on demand.

```
┌──────────────────────────────────────────┐
│  The Foundry                             │
│                                          │
│  Tools, forged.                          │
│                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │   🛒   │  │   🍽️   │  │   💪   │     │
│  │ Grocery│  │  Meal  │  │ Fitness│ ... │
│  │  List  │  │  Plan  │  │ Tracker│     │
│  └────────┘  └────────┘  └────────┘     │
└──────────────────────────────────────────┘
```

## Stack

- **Vite 5 + React 18 + TypeScript** (strict)
- **Ionic React 8** — native-feel components, iOS+Android+web
- **Capacitor 6** — App Store wrapping ready
- **Supabase** — Postgres + JSONB persistence
- **Vercel** — hosting + Edge Functions for the push API
- **PWA** — installable on iOS via Safari Add to Home Screen

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
npm run icons                # generate PWA icons
npm run dev                  # http://localhost:5173
```

```bash
npm run build       # type-check + build
npm run typecheck
npm run lint
```

## Supabase setup

1. Create a Supabase project named `foundry` (free tier).
2. In SQL editor, paste and run `supabase/migration.sql`.
3. Copy the project URL + anon key + service role key into Vercel env vars.

## Vercel setup

1. Import this repo into Vercel.
2. Framework preset: **Vite**.
3. Add env vars (see `.env.example`).
4. Deploy.

## Adding a new app

The full contract is in `CLAUDE.md`. Short version: Claude calls
`/api/push-app` with a TSX module and metadata. The endpoint commits to
the repo and Vercel auto-deploys.

## Add to home screen (iOS)

Open the deployed URL in Safari → Share → Add to Home Screen → "Foundry".

## License

Personal use. No license granted.
