# Atlas — Personal OS

Private, single-operator dashboard. One pane of glass over investments, ventures, content ops, finance structure, daily briefing, and fitness. Every route sits behind Supabase auth.

## Features

**Main**
- **Daily Update** (`/`) — home briefing: live portfolio snapshot, activity feed, ventures, signals.
- **Investments** (`/investments`) — live portfolio via Sharesight (OAuth2), holdings, watchlist, allocation donut, sparklines.
- **Projects** (`/projects`) — build/project tracker.
- **Fraga Ventures** (`/ventures`) — entity / venture overview.

**Workspace**
- **Content** (`/content`) — planner, metrics, todos, ideas, schedule sub-views.
- **Events** (`/events`) — live SaaS / Ecommerce / AI-Coding deal & event feed, streamed from Gemini; calendar grid + saved "My Events".
- **Notes** (`/notes`).

**Finance**
- `/finance` overview + sub-pages: `accounting`, `flowchart`, `investment-flowchart` (Mermaid diagrams), `private-wealth`.

**Business**
- `/business/saas` — SaaS health.

**Fitness**
- **Gym** (`/fitness`) — workout split + diet (per-meal calories & protein).

## Stack

- **React Router v7** (SSR, file routes) + **React 19**
- **TailwindCSS v4** + shadcn-style UI (Radix primitives, `class-variance-authority`)
- **Framer Motion** — reveal/stagger animations
- **Supabase** — auth + Postgres (`@supabase/ssr`)
- **Sharesight API** — live portfolio (OAuth2, token auto-refresh)
- **Gemini** (`gemini-2.5-flash`) — SaaS events feed
- **Mermaid** — finance flowcharts
- **Vitest** — tests
- Deployed on **Vercel** (`@vercel/react-router`)

## Dev

```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve built app |
| `npm run test` | Vitest run |
| `npm run test:watch` | Vitest watch |
| `npm run typecheck` | Route typegen + `tsc` |

## Env

Set in `.env.local` (never commit — holds secrets):

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Feature flags
SHOW_VENTURES=false

# Sharesight (live portfolio)
SHARESIGHT_CLIENT_ID=
SHARESIGHT_CLIENT_SECRET=
SHARESIGHT_AUTH=
SHARESIGHT_API_BASE=https://api.sharesight.com/api/v2   # /api/v3 = beta
SHARESIGHT_OAUTH_BASE=https://api.sharesight.com         # tokens last 30 min, auto-refreshed

# Gemini (events feed)
GEMINI_API_KEY=
```

## Architecture notes

- Routes split `login` / `logout` from a `_protected` layout that gates everything else behind `requireSession`.
- Server-only secrets live in `*.server.ts` / `supabase.admin.ts` (service-role); browser uses anon key via `supabase.client.ts`.
- Events route streams the slow Gemini fetch (`Await` / `Suspense`) so the page paints instantly.
- UI primitives under `app/components/atlas/` (cards, charts, motion, command palette, agents).
