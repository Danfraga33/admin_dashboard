# Fraga Ventures Admin Dashboard — Design Spec

**Date:** 2026-03-19
**Author:** Daniel Fraga
**Status:** Approved

---

## Overview

A personal ops dashboard for Daniel Fraga, solo operator of Fraga Ventures — a holding company acquiring and operating B2B SaaS businesses. Only Daniel uses this. It is a private, deployed tool, not a public product.

**Purpose:** Centralise content ops and business ops into a single "founder's cockpit" — fast to navigate, data-dense, always dark.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React Router v7 (already scaffolded) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth — email + password |
| Deployment | Vercel (serverless, Vercel Cron ready) |

---

## Routes

```
/login                   ← public
/                        ← overview (protected)
/content/ideas           ← content ideas list
/content/schedule        ← content schedule
/content/metrics         ← X/Twitter metrics
/content/todos           ← to-do list
/business/pipeline       ← deal pipeline
/business/entities       ← entity health
/business/cash           ← cash position
/business/saas           ← SaaS business health
```

All routes except `/login` are wrapped in a protected layout that checks for a valid Supabase session. No session → redirect to `/login`.

---

## Authentication

- Supabase Auth with email + password (`signInWithPassword`)
- Session managed via `@supabase/ssr` — stored in a cookie
- Protected layout loader validates session on every request
- Logout button in sidebar footer clears session and redirects to `/login`

---

## Database Schema

All tables use Supabase Row Level Security (RLS) locked to Daniel's user ID.

### Content

```sql
content_ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  format       text,                          -- e.g. thread, article, video
  status       text default 'idea',           -- idea | in-progress | ready
  notes        text,
  created_at   timestamptz default now()
)

content_schedule (
  id           uuid primary key default gen_random_uuid(),
  post_date    date,
  platform     text,                          -- e.g. X, LinkedIn
  topic        text,
  status       text default 'draft',          -- draft | scheduled | published
  created_at   timestamptz default now()
)

x_metrics (
  id             uuid primary key default gen_random_uuid(),
  recorded_date  date not null,
  followers      integer,
  impressions    integer,
  profile_visits integer
)

todos (
  id          uuid primary key default gen_random_uuid(),
  task        text not null,
  priority    text default 'medium',          -- low | medium | high
  due_date    date,
  completed   boolean default false,
  created_at  timestamptz default now()
)
```

### Business

```sql
deals (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  asking_price   numeric,
  source         text,
  stage          text default 'reviewing',    -- reviewing | in-dd | offer-made | closed
  notes          text,
  created_at     timestamptz default now()
)

entities (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  jurisdiction      text not null,            -- AU | US
  compliance_tasks  jsonb,                    -- array of {task, due_date, done}
  advisor_status    text,
  next_filing_date  date
)

cash_positions (
  id           uuid primary key default gen_random_uuid(),
  entity_name  text not null,
  balance      numeric not null,
  currency     text not null,                 -- AUD | USD
  recorded_at  timestamptz default now()
)

saas_businesses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  acquired_at  timestamptz                    -- nullable until acquisition closes
)

saas_metrics (
  id                uuid primary key default gen_random_uuid(),
  saas_business_id  uuid references saas_businesses(id),
  recorded_month    date not null,            -- first day of month
  mrr               numeric,
  churn_rate        numeric,
  nrr               numeric,
  active_users      integer,
  mom_growth        numeric
)
```

**Notes:**
- `x_metrics` stores snapshots over time — UI shows latest row as current, trends over time as history
- `cash_positions` stores snapshots — latest per entity shown as current balance. Designed so Basiq API can write to the same table later with no schema change
- `saas_businesses` is empty until first acquisition. UI shows "No businesses yet. First acquisition will appear here."
- Vercel Cron routes (`/api/cron/...`) are reserved for future API integrations (X API, Basiq) — no schema changes needed when added

---

## UI & Design System

### Identity
"Founder's cockpit" — dark, editorial, data-dense. Not a consumer app.

### Tokens (from DESIGN.md — always dark mode)
- **Background:** `oklch(0.12 0.005 250)` — deep navy-charcoal
- **Card:** `oklch(0.16 0.005 250)` — slightly lighter than background
- **Sidebar:** `oklch(0.14 0.005 250)` — just darker than cards
- **Primary accent:** `oklch(0.85 0.08 55)` — warm gold/amber
- **Border:** `oklch(0.25 0.005 250)`
- **Radius:** `0.625rem`
- Full token set lives in `app/app.css` sourced from `DESIGN.md`

### Typography
| Use | Font |
|-----|------|
| Body / prose | Source Serif 4 |
| Headings / page titles | Playfair Display |
| Numbers / data | Geist Mono |

### Layout
- **Sidebar:** fixed left, ~220px. "Fraga Ventures" wordmark at top in Playfair Display + gold. Two nav groups: Content and Business. Active link highlighted in gold. Logout in footer.
- **Main area:** page header (Playfair Display), muted subtext, then content

### Per-page UI patterns
| Page type | Pattern |
|-----------|---------|
| List pages (Ideas, Schedule, Pipeline, Todos) | Sortable table + "Add" button → inline form or modal |
| Snapshot metrics (X Metrics, Cash Position) | Stat cards (Geist Mono numbers) + form to log new entry |
| Entity Health | Two cards side by side (AU + US) with compliance checklist |
| SaaS Health | Placeholder state until first acquisition row exists |

**Status badges** (draft/scheduled/published, reviewing/in-dd/offer-made/closed) — gold-tinted chips.
**Data numbers** — always Geist Mono (MRR, cash balances, follower counts, asking prices).
**Tables** — clean borders, subtle alternating row shade.
**Forms** — `--input` token background, gold focus ring.

### Responsiveness
Desktop-first. Sidebar collapses to icons on narrower screens. No mobile optimization required.

---

## Data Flow

- React Router `loader` functions fetch data server-side from Supabase before page renders
- React Router `action` functions handle all form submissions (create, update, delete)
- No client-side data fetching libraries — React Router handles everything
- Each page is self-contained: its own loader, actions, and UI

---

## Future-Ready Hooks

| Feature | Status | Notes |
|---------|--------|-------|
| X/Twitter API | Not built | `x_metrics` table ready; `/api/cron/x-metrics` route reserved |
| Basiq bank API | Not built | `cash_positions` table ready; `/api/cron/cash` route reserved |
| SaaS business health | Table exists, UI placeholder | Activates when first row added to `saas_businesses` |
| Vercel Cron | Not configured | Route structure reserved under `/api/cron/` |

---

## Out of Scope (v1)

- Mobile optimization
- Multi-user access
- Email notifications
- Chart/graph visualizations (data tables only for now)
- X API integration (manual entry only)
- Basiq API integration (manual entry only)
