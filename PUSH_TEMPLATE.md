# Push an app to Foundry

Use this template any time you want a new app on your Foundry dashboard. Paste
the prompt below into a Claude chat or Cowork session **that has the `foundry`
MCP connected** (web claude.ai today — see below). Replace the bracketed parts.

> CLAUDE.md is the source of truth for the component + brand contract. If this
> template and CLAUDE.md ever disagree, CLAUDE.md wins.

---

## The prompt

> I want a new Foundry app: **[one-sentence description of what it does]**.
>
> Build it as a self-contained Ionic React component following the Foundry
> contract (https://github.com/Awentzelza/foundry/blob/main/CLAUDE.md), then
> push it with the `foundry__push_app` MCP tool.
>
> Constraints:
> - id: `[lowercase-hyphen-slug]` (pick a good one if I didn't)
> - Persistence: [yes / no — does it remember anything across reloads?]
> - Do NOT render `<IonPage>`, `<IonContent>`, `<IonHeader>`, or `<IonToolbar>`
>   — Foundry's shell provides them.
> - Imports allowed: `react` hooks, `@ionic/react`, `ionicons/icons`,
>   `@/hooks/useAppData`, and `./styles.module.css`.
> - If persistence is needed, use object-destructure:
>   `const { value, setValue, ready } = useAppData('<id>', '<key>', initial)`
>   — never the tuple form.
> - Strict TypeScript, no `any`, no `localStorage`. Default export the component.
> - Brand: no emoji, no off-palette colours, no gradients/glow. Colours come
>   from `var(--foundry-*)` tokens only; Ember is the sole accent; fonts are the
>   brand tokens. (The pre-flight brand check HARD-blocks violations.)
> - Optional: ship a `styles.module.css` for per-app layout (CSS Modules,
>   hashed + scoped). Pass it as the `styles` param. Restyle Ionic components via
>   their own vars (`--background`, `--color`, …) set to `var(--foundry-*)`
>   tokens — never redefine a `--foundry-*` / `--ion-*` token.
>
> Before pushing, show me the component code (and styles) and what you'll pass
> to push_app so I can sanity check.

After the push: `push_app` commits, then returns a `deploymentUid` with status
`building` immediately (the deploy is async). Wait ~90s, then make a **single**
`get_deploy_status({ deploymentUid, appId })` call — passing `appId` auto-archives
the app if the build errored, so the dashboard never points at a broken tile.

---

## Connecting the Foundry MCP

### Web Claude (claude.ai) — current path

Settings → Connectors → Add custom connector:
- Name: `foundry`
- URL: `https://andre-foundry.vercel.app/api/mcp?api_key=<FOUNDRY_PUSH_SECRET>`
- Transport: HTTP

The claude.ai connector UI has no header field, so the secret rides in the URL's
`?api_key=`. Treat that URL as a secret (it leaks into logs); rotate
`FOUNDRY_PUSH_SECRET` in Vercel + update the connector URL if it's ever exposed.

### Header auth (any client that supports headers — preferred)

```jsonc
{
  "mcpServers": {
    "foundry": {
      "url": "https://andre-foundry.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer <FOUNDRY_PUSH_SECRET>" }
    }
  }
}
```

### Verify connection

Ask the session "list my Foundry apps". It should call `foundry__list_apps` and
return the active apps (e.g. `grocery-list`). If the tool isn't found, the MCP
isn't connected. Enable auto-approve for the tools to avoid per-call prompts.

---

## Available tools

| Tool | What it does |
| --- | --- |
| `foundry__push_app` | Create/update an app. Validates (heuristics + sucrase syntax/JSX + brand check on code AND `styles`), commits the TSX (and optional `styles.module.css`) to GitHub, regenerates the registry, returns a `deploymentUid`. |
| `foundry__get_component_example` | Returns a brand-compliant component example, plus a CSS-module example. Call once if you need a reminder of the contract. |
| `foundry__archive_app` | Hide an app from the dashboard (status=archived). Never deletes code or data. |
| `foundry__list_apps` | List active apps (`{ includeArchived: true }` for all). |
| `foundry__get_app` | Fetch one app's metadata by id. |
| `foundry__view_code` | Fetch the current `src/apps/<id>/index.tsx` source from GitHub. |
| `foundry__verify_deploy` | Check deploy status for a commit SHA (optional `appId` to auto-archive on build error). |
| `foundry__get_deploy_status` | The reliable post-push check, keyed by `deploymentUid` (optional `appId` to auto-archive on build error). |

---

## Brand house style (consistency without a human reviewer)

Foundry is a private "signet" identity — a quiet, archival aesthetic, not a
gamified app. The pre-flight brand check enforces it, but design to it directly:

- Ground is **Foundry Black**, text is **Parchment**, the only accent is **Ember**
  (`var(--foundry-ember)`). **Mark Gold** is signet/wordmark only — never UI.
- Fonts: `var(--foundry-font-display)` (Fraunces) for names/headlines,
  `var(--foundry-font-mono)` (JetBrains Mono, uppercase, letter-spaced) for
  eyebrow labels, `var(--foundry-font-body)` (EB Garamond) for body.
- Flat surfaces with hairline borders. No emoji, no gradients, no glow/box-shadow,
  no continuous animation, no exclamation points in copy.
- Brand display names live in `DISPLAY_OVERRIDES` (src/lib/appRegistry.ts), not in
  the auto-generated registry.ts. App icons are not surfaced — don't rely on one.
