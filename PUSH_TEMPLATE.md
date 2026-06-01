# Drop this into a Claude session to push an app to Foundry

Use this template any time you want a new app on your Foundry dashboard.
Paste the prompt below into a Claude chat or Cowork session **that has the
`foundry` MCP server connected.** Replace the bracketed parts.

---

## The prompt

> I want a new Foundry app: **[one-sentence description of what it does]**.
>
> Build it as a self-contained Ionic React component following the Foundry
> contract (see https://github.com/Awentzelza/foundry/blob/main/CLAUDE.md),
> then push it using the `foundry__push_app` MCP tool.
>
> Constraints:
> - id: `[lowercase-hyphen-slug]` (pick a good one if I didn't)
> - icon: one emoji
> - Persistence: [yes / no — does it need to remember anything across reloads?]
> - Don't render `<IonPage>`, `<IonContent>`, or `<IonHeader>` — Foundry's
>   shell provides them.
> - Imports allowed: `react` hooks, `@ionic/react`, `ionicons/icons`,
>   `@/hooks/useAppData`.
> - If persistence is needed, use `useAppData('<id>', '<key>', initial)`.
> - Strict TypeScript, no `any`. Default export the component.
>
> Before pushing, show me the component code and what you'll pass to
> push_app so I can sanity check.

---

## Connecting the Foundry MCP (one-time, per Claude client)

### Claude Desktop / Cowork

Add to your MCP config:

```jsonc
{
  "mcpServers": {
    "foundry": {
      "url": "https://foundry-seven-omega.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <FOUNDRY_PUSH_SECRET>"
      }
    }
  }
}
```

Replace `<FOUNDRY_PUSH_SECRET>` with the value you set in Vercel env vars
(or rotate one and use the new value).

### Web Claude (claude.ai)

Settings → Connectors → Add custom connector:
- Name: `foundry`
- URL: `https://foundry-seven-omega.vercel.app/api/mcp`
- Headers: `Authorization: Bearer <FOUNDRY_PUSH_SECRET>`
- Transport: HTTP

### Verify connection

Ask the Claude session "list my Foundry apps". It should call
`foundry__list_apps` and return at least `grocery-list`. If it says it can't
find the tool, the MCP isn't connected.

---

## Available tools

| Tool | What it does |
| --- | --- |
| `foundry__push_app` | Create or update an app. Commits the TSX module to GitHub, regenerates the registry, triggers Vercel redeploy. |
| `foundry__archive_app` | Hide an app from the dashboard (sets status=archived). Never deletes code or data. |
| `foundry__list_apps` | List active apps (or `{ includeArchived: true }` for all). |
| `foundry__get_app` | Fetch one app's metadata by id. |

---

## Example session

You: *"I want a new Foundry app: a focus timer that runs 25/5 cycles and
counts how many sessions I finished today. id: pomodoro, icon: 🍅, needs
persistence. Show the code first."*

Claude: *(generates a `PomodoroApp` component, shows it, then calls
`foundry__push_app` with `{ id: "pomodoro", name: "Pomodoro", icon: "🍅",
componentCode: "...", needsPersistence: true }`.)*

Vercel auto-deploys in ~30-60s. Refresh https://foundry-seven-omega.vercel.app/
and the tile appears.

---

## House style for your apps

Foundry's aesthetic is forge / ember on warm dark. When you ask for an app,
add this to your prompt if you want consistency:

> Use Foundry's design tokens: `var(--foundry-ember)` (accent),
> `var(--foundry-text-dim)` (muted), `var(--foundry-font-display)`
> (Fraunces, serif, for big numbers/headlines), `var(--foundry-font-mono)`
> (JetBrains Mono uppercase for eyebrows). Dark background, no large
> coloured fills, restrained use of accent.
