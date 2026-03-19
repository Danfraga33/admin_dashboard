# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal ops dashboard for Daniel Fraga (Fraga Ventures) with auth, a sidebar layout, and 8 data pages covering content ops and business ops.

**Architecture:** React Router v7 with server-side loaders/actions for all data fetching and mutations. Supabase handles Postgres storage and email/password auth via `@supabase/ssr` cookie sessions. A single protected layout wraps all routes; the sidebar is always visible once authenticated.

**Tech Stack:** React Router v7, TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth), `@supabase/ssr`, Vercel

---

## File Map

```
app/
  app.css                          ← design tokens from DESIGN.md (modify)
  root.tsx                         ← add dark class to html element (modify)
  routes.ts                        ← register all routes (modify)

  lib/
    supabase.server.ts             ← server-side Supabase client factory
    supabase.client.ts             ← browser-side Supabase client (singleton)
    session.server.ts              ← getSession, requireSession helpers

  components/
    sidebar.tsx                    ← fixed left nav with two groups
    status-badge.tsx               ← reusable coloured chip for status values
    stat-card.tsx                  ← metric display card (Geist Mono number)

  routes/
    login.tsx                      ← public login page
    logout.tsx                     ← action-only logout route
    _protected.tsx                 ← layout: session guard + sidebar shell
    _protected.home.tsx            ← / overview page
    _protected.content.ideas.tsx
    _protected.content.schedule.tsx
    _protected.content.metrics.tsx
    _protected.content.todos.tsx
    _protected.business.pipeline.tsx
    _protected.business.entities.tsx
    _protected.business.cash.tsx
    _protected.business.saas.tsx

public/
  fonts/                           ← self-hosted Google Fonts (optional, or use @import)

supabase/
  migrations/
    001_initial_schema.sql         ← all table DDL + RLS policies
```

---

## Task 1: Install dependencies and configure design system

**Files:**
- Modify: `package.json`
- Modify: `app/app.css`
- Modify: `app/root.tsx`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Replace `app/app.css` with design tokens**

Replace the entire file with the following (sourced from `DESIGN.md`):

```css
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.12 0.005 250);
  --foreground: oklch(0.92 0.01 80);
  --card: oklch(0.16 0.005 250);
  --card-foreground: oklch(0.92 0.01 80);
  --popover: oklch(0.18 0.005 250);
  --popover-foreground: oklch(0.92 0.01 80);
  --primary: oklch(0.85 0.08 55);
  --primary-foreground: oklch(0.12 0.005 250);
  --secondary: oklch(0.22 0.005 250);
  --secondary-foreground: oklch(0.85 0.01 80);
  --muted: oklch(0.20 0.005 250);
  --muted-foreground: oklch(0.60 0.01 80);
  --accent: oklch(0.75 0.06 55);
  --accent-foreground: oklch(0.12 0.005 250);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.25 0.005 250);
  --input: oklch(0.22 0.005 250);
  --ring: oklch(0.75 0.06 55);
  --radius: 0.625rem;
  --sidebar: oklch(0.14 0.005 250);
  --sidebar-foreground: oklch(0.92 0.01 80);
  --sidebar-primary: oklch(0.85 0.08 55);
  --sidebar-primary-foreground: oklch(0.12 0.005 250);
  --sidebar-accent: oklch(0.22 0.005 250);
  --sidebar-accent-foreground: oklch(0.92 0.01 80);
  --sidebar-border: oklch(0.25 0.005 250);
  --sidebar-ring: oklch(0.75 0.06 55);
}

@theme inline {
  --font-sans: 'Source Serif 4', Georgia, serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-mono: 'Geist Mono', monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
}
```

- [ ] **Step 3: Add Google Fonts import to `app/root.tsx`**

Add a `<link>` tag in the `links` export for Source Serif 4, Playfair Display, and Geist Mono:

```tsx
export const links: LinksFunction = () => [
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..900;1,8..60,300..900&family=Playfair+Display:wght@400;600;700&display=swap",
  },
];
```

For Geist Mono, add to `app/app.css` at the top:

```css
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap');
```

- [ ] **Step 4: Add `dark` class to `<html>` in `app/root.tsx`**

In the `Layout` component, add `className="dark"` to the `<html>` element:

```tsx
<html lang="en" className="dark">
```

- [ ] **Step 5: Verify design system renders**

```bash
npm run dev
```

Open browser. Background should be deep navy-charcoal. No console errors.

- [ ] **Step 6: Commit**

```bash
git add app/app.css app/root.tsx package.json package-lock.json
git commit -m "feat: install supabase and apply design system tokens"
```

---

## Task 2: Supabase project setup and database schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `.env.local` (not committed)

- [ ] **Step 1: Create Supabase project**

Go to supabase.com → New project. Name it `fraga-ventures-dashboard`. Note down:
- Project URL
- Anon public key
- Service role key (keep secret)

- [ ] **Step 2: Create `.env.local`**

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Add `.env.local` to `.gitignore` if not already present.

- [ ] **Step 3: Create migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Content Ideas
create table content_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  format      text,
  status      text not null default 'idea' check (status in ('idea','in-progress','ready')),
  notes       text,
  created_at  timestamptz not null default now()
);
alter table content_ideas enable row level security;
create policy "owner only" on content_ideas
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Content Schedule
create table content_schedule (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  post_date   date,
  platform    text,
  topic       text,
  status      text not null default 'draft' check (status in ('draft','scheduled','published')),
  created_at  timestamptz not null default now()
);
alter table content_schedule enable row level security;
create policy "owner only" on content_schedule
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- X Metrics (snapshots)
create table x_metrics (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  recorded_date  date not null,
  followers      integer,
  impressions    integer,
  profile_visits integer
);
alter table x_metrics enable row level security;
create policy "owner only" on x_metrics
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Todos
create table todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  task        text not null,
  priority    text not null default 'medium' check (priority in ('low','medium','high')),
  due_date    date,
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table todos enable row level security;
create policy "owner only" on todos
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deal Pipeline
create table deals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  business_name  text not null,
  asking_price   numeric,
  source         text,
  stage          text not null default 'reviewing' check (stage in ('reviewing','in-dd','offer-made','closed')),
  notes          text,
  created_at     timestamptz not null default now()
);
alter table deals enable row level security;
create policy "owner only" on deals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entity Health
create table entities (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  jurisdiction      text not null check (jurisdiction in ('AU','US')),
  compliance_tasks  jsonb not null default '[]',
  advisor_status    text,
  next_filing_date  date
);
alter table entities enable row level security;
create policy "owner only" on entities
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cash Positions (snapshots)
create table cash_positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  entity_name  text not null,
  balance      numeric not null,
  currency     text not null check (currency in ('AUD','USD')),
  recorded_at  timestamptz not null default now()
);
alter table cash_positions enable row level security;
create policy "owner only" on cash_positions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SaaS Businesses
create table saas_businesses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  acquired_at  timestamptz
);
alter table saas_businesses enable row level security;
create policy "owner only" on saas_businesses
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SaaS Metrics
create table saas_metrics (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  saas_business_id  uuid not null references saas_businesses(id) on delete cascade,
  recorded_month    date not null,
  mrr               numeric,
  churn_rate        numeric,
  nrr               numeric,
  active_users      integer,
  mom_growth        numeric
);
alter table saas_metrics enable row level security;
create policy "owner only" on saas_metrics
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 4: Run migration in Supabase**

In the Supabase dashboard → SQL Editor, paste and run the migration file contents. Verify all tables appear in Table Editor.

- [ ] **Step 5: Create your user account**

In Supabase dashboard → Authentication → Users → Invite user (or use the SQL editor):

```sql
-- Use Supabase dashboard "Add User" under Authentication > Users
-- Email: your email, Password: set a strong password
```

- [ ] **Step 6: Commit migration file**

```bash
git add supabase/migrations/001_initial_schema.sql .gitignore
git commit -m "feat: add database schema and RLS policies"
```

---

## Task 3: Supabase server and session helpers

**Files:**
- Create: `app/lib/supabase.server.ts`
- Create: `app/lib/supabase.client.ts`
- Create: `app/lib/session.server.ts`

- [ ] **Step 1: Create `app/lib/supabase.server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'

export function createSupabaseServerClient(request: Request, responseHeaders: Headers) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseHeaders.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            )
          })
        },
      },
    }
  )
}

function parseCookieHeader(header: string) {
  return header.split(';').filter(Boolean).map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    return { name: name.trim(), value: rest.join('=').trim() }
  })
}

function serializeCookieHeader(name: string, value: string, options: Record<string, unknown> = {}) {
  let cookie = `${name}=${value}`
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`
  if (options.path) cookie += `; Path=${options.path}`
  if (options.httpOnly) cookie += `; HttpOnly`
  if (options.secure) cookie += `; Secure`
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}
```

- [ ] **Step 2: Create `app/lib/session.server.ts`**

```typescript
import { redirect } from 'react-router'
import { createSupabaseServerClient } from './supabase.server'

export async function getSession(request: Request) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const { data: { session } } = await supabase.auth.getSession()
  return { session, supabase, responseHeaders }
}

export async function requireSession(request: Request) {
  const { session, supabase, responseHeaders } = await getSession(request)
  if (!session) throw redirect('/login', { headers: responseHeaders })
  return { session, supabase, responseHeaders }
}
```

- [ ] **Step 3: Create `app/lib/supabase.client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      window.ENV.SUPABASE_URL,
      window.ENV.SUPABASE_ANON_KEY
    )
  }
  return client
}
```

- [ ] **Step 4: Expose env vars to browser via `root.tsx`**

In `root.tsx`, add a loader that passes public env vars to the client, and inject them as `window.ENV`:

```tsx
// In root.tsx
export async function loader() {
  return {
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL!,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    },
  }
}

// In the Layout component, inside <head>:
const data = useLoaderData<typeof loader>()
// Add after other scripts:
<script
  dangerouslySetInnerHTML={{
    __html: `window.ENV = ${JSON.stringify(data.env)}`,
  }}
/>
```

Also add to `app/env.d.ts` (create if needed):

```typescript
declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
    }
  }
}
export {}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/lib/ app/root.tsx app/env.d.ts
git commit -m "feat: add supabase server client and session helpers"
```

---

## Task 4: Login and logout routes

**Files:**
- Create: `app/routes/login.tsx`
- Create: `app/routes/logout.tsx`
- Modify: `app/routes.ts`

- [ ] **Step 1: Register routes in `app/routes.ts`**

```typescript
import { type RouteConfig, index, route, layout } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  layout('routes/_protected.tsx', [
    index('routes/_protected.home.tsx'),
    route('content/ideas', 'routes/_protected.content.ideas.tsx'),
    route('content/schedule', 'routes/_protected.content.schedule.tsx'),
    route('content/metrics', 'routes/_protected.content.metrics.tsx'),
    route('content/todos', 'routes/_protected.content.todos.tsx'),
    route('business/pipeline', 'routes/_protected.business.pipeline.tsx'),
    route('business/entities', 'routes/_protected.business.entities.tsx'),
    route('business/cash', 'routes/_protected.business.cash.tsx'),
    route('business/saas', 'routes/_protected.business.saas.tsx'),
  ]),
] satisfies RouteConfig
```

- [ ] **Step 2: Create `app/routes/login.tsx`**

```tsx
import { Form, redirect, useActionData } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) throw redirect('/', { headers: responseHeaders })
  return null
}

export async function action({ request }: ActionFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const formData = await request.formData()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  throw redirect('/', { headers: responseHeaders })
}

export default function Login() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="font-serif text-2xl text-foreground mb-2">Fraga Ventures</h1>
          <p className="text-muted-foreground text-sm mb-8">Ops Dashboard</p>

          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {actionData?.error && (
              <p className="text-destructive-foreground text-sm">{actionData.error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          </Form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/routes/logout.tsx`**

```tsx
import { redirect } from 'react-router'
import type { ActionFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function action({ request }: ActionFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  await supabase.auth.signOut()
  throw redirect('/login', { headers: responseHeaders })
}

export async function loader() {
  throw redirect('/')
}
```

- [ ] **Step 4: Start dev server and verify login page**

```bash
npm run dev
```

Navigate to `http://localhost:5173/login`. You should see the login card on a dark background with gold "Fraga Ventures" heading. Try signing in with your Supabase user credentials. Should redirect to `/` (which will 404 until next task — that's fine).

- [ ] **Step 5: Commit**

```bash
git add app/routes/login.tsx app/routes/logout.tsx app/routes.ts
git commit -m "feat: add login/logout routes with supabase auth"
```

---

## Task 5: Sidebar component and protected layout

**Files:**
- Create: `app/components/sidebar.tsx`
- Create: `app/routes/_protected.tsx`

- [ ] **Step 1: Create `app/components/sidebar.tsx`**

```tsx
import { NavLink, Form } from 'react-router'

const NAV = [
  {
    group: 'Content',
    links: [
      { to: '/content/ideas', label: 'Ideas' },
      { to: '/content/schedule', label: 'Schedule' },
      { to: '/content/metrics', label: 'X Metrics' },
      { to: '/content/todos', label: 'To-Dos' },
    ],
  },
  {
    group: 'Business',
    links: [
      { to: '/business/pipeline', label: 'Deal Pipeline' },
      { to: '/business/entities', label: 'Entity Health' },
      { to: '/business/cash', label: 'Cash Position' },
      { to: '/business/saas', label: 'SaaS Health' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Wordmark */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <NavLink to="/">
          <span className="font-serif text-lg text-primary leading-tight block">
            Fraga Ventures
          </span>
          <span className="text-xs text-muted-foreground tracking-wide uppercase">
            Ops Dashboard
          </span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(({ group, links }) => (
          <div key={group} className="mb-6">
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group}
            </p>
            <ul className="space-y-0.5">
              {links.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <Form method="post" action="/logout">
          <button
            type="submit"
            className="w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors text-left"
          >
            Sign out
          </button>
        </Form>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `app/routes/_protected.tsx`**

```tsx
import { Outlet, redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Sidebar } from '~/components/sidebar'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

export default function ProtectedLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder home page `app/routes/_protected.home.tsx`**

```tsx
export default function Home() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-2">Overview</h1>
      <p className="text-muted-foreground">Welcome back, Daniel.</p>
    </div>
  )
}
```

- [ ] **Step 4: Verify layout**

```bash
npm run dev
```

Sign in at `/login`. You should land on `/` and see the sidebar on the left with two groups (Content, Business) and the "Overview" heading in the main area. Clicking sidebar links should 404 gracefully (routes exist in `routes.ts` but files not yet created — that's fine).

- [ ] **Step 5: Commit**

```bash
git add app/components/sidebar.tsx app/routes/_protected.tsx app/routes/_protected.home.tsx
git commit -m "feat: add sidebar and protected layout shell"
```

---

## Task 6: Shared components

**Files:**
- Create: `app/components/status-badge.tsx`
- Create: `app/components/stat-card.tsx`

- [ ] **Step 1: Create `app/components/status-badge.tsx`**

```tsx
const COLOURS: Record<string, string> = {
  // Content ideas
  idea: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  ready: 'bg-accent/20 text-accent',
  // Content schedule
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-primary/20 text-primary',
  published: 'bg-accent/20 text-accent',
  // Deals
  reviewing: 'bg-muted text-muted-foreground',
  'in-dd': 'bg-primary/20 text-primary',
  'offer-made': 'bg-accent/30 text-accent',
  closed: 'bg-secondary text-secondary-foreground',
  // Priorities
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-destructive/30 text-destructive-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = COLOURS[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 2: Create `app/components/stat-card.tsx`**

```tsx
export function StatCard({
  label,
  value,
  unit,
}: {
  label: string
  value: string | number | null
  unit?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className="font-mono text-2xl text-foreground">
        {value ?? '—'}
        {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/status-badge.tsx app/components/stat-card.tsx
git commit -m "feat: add StatusBadge and StatCard shared components"
```

---

## Task 7: Content Ideas page

**Files:**
- Create: `app/routes/_protected.content.ideas.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: ideas } = await supabase
    .from('content_ideas')
    .select('*')
    .order('created_at', { ascending: false })
  return Response.json({ ideas: ideas ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('content_ideas').insert({
      user_id: session.user.id,
      title: String(formData.get('title')),
      format: String(formData.get('format') || ''),
      status: String(formData.get('status') || 'idea'),
      notes: String(formData.get('notes') || ''),
    })
  }

  if (intent === 'delete') {
    await supabase.from('content_ideas').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function ContentIdeas() {
  const { ideas } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Content Ideas</h1>
      <p className="text-muted-foreground text-sm mb-8">Track ideas before they go to schedule.</p>

      {/* Add form */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">New Idea</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input
            name="title"
            placeholder="Title"
            required
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="format"
            placeholder="Format (thread, article, video…)"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="status"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="idea">Idea</option>
            <option value="in-progress">In Progress</option>
            <option value="ready">Ready</option>
          </select>
          <textarea
            name="notes"
            placeholder="Notes"
            rows={2}
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="col-span-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add Idea
          </button>
        </Form>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Title</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Format</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ideas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No ideas yet. Add one above.
                </td>
              </tr>
            )}
            {ideas.map((idea, i) => (
              <tr
                key={idea.id}
                className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-4 py-3 text-foreground">{idea.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{idea.format}</td>
                <td className="px-4 py-3"><StatusBadge status={idea.status} /></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{idea.notes}</td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={idea.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors"
                    >
                      Delete
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/content/ideas`. Add an idea, verify it appears in the table. Delete it, verify it disappears.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_protected.content.ideas.tsx
git commit -m "feat: add content ideas page"
```

---

## Task 8: Content Schedule page

**Files:**
- Create: `app/routes/_protected.content.schedule.tsx`

- [ ] **Step 1: Create the route**

Follow the same loader/action/table pattern as Task 7. Fields: `post_date` (date input), `platform` (text), `topic` (text), `status` (select: draft/scheduled/published).

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: schedule } = await supabase
    .from('content_schedule')
    .select('*')
    .order('post_date', { ascending: true })
  return Response.json({ schedule: schedule ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('content_schedule').insert({
      user_id: session.user.id,
      post_date: String(formData.get('post_date')),
      platform: String(formData.get('platform') || ''),
      topic: String(formData.get('topic') || ''),
      status: String(formData.get('status') || 'draft'),
    })
  }

  if (intent === 'delete') {
    await supabase.from('content_schedule').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function ContentSchedule() {
  const { schedule } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Content Schedule</h1>
      <p className="text-muted-foreground text-sm mb-8">Planned posts across platforms.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">New Entry</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input
            name="post_date"
            type="date"
            required
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="platform"
            placeholder="Platform (X, LinkedIn…)"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="topic"
            placeholder="Topic"
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="status"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add Entry
          </button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Topic</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No posts scheduled yet.
                </td>
              </tr>
            )}
            {schedule.map((entry, i) => (
              <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 font-mono text-foreground">{entry.post_date}</td>
                <td className="px-4 py-3 text-muted-foreground">{entry.platform}</td>
                <td className="px-4 py-3 text-foreground">{entry.topic}</td>
                <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors">Delete</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.content.schedule.tsx
git commit -m "feat: add content schedule page"
```

---

## Task 9: X Metrics page

**Files:**
- Create: `app/routes/_protected.content.metrics.tsx`

- [ ] **Step 1: Create the route**

Shows latest snapshot as stat cards, plus a log of all entries and a form to add a new snapshot.

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: metrics } = await supabase
    .from('x_metrics')
    .select('*')
    .order('recorded_date', { ascending: false })
  const latest = metrics?.[0] ?? null
  return Response.json({ metrics: metrics ?? [], latest }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()

  await supabase.from('x_metrics').insert({
    user_id: session.user.id,
    recorded_date: String(formData.get('recorded_date')),
    followers: Number(formData.get('followers')) || null,
    impressions: Number(formData.get('impressions')) || null,
    profile_visits: Number(formData.get('profile_visits')) || null,
  })

  return Response.json({}, { headers: responseHeaders })
}

export default function XMetrics() {
  const { metrics, latest } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">X / Twitter Metrics</h1>
      <p className="text-muted-foreground text-sm mb-8">Manual snapshots. API integration coming later.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Followers" value={latest?.followers ?? null} />
        <StatCard label="Impressions" value={latest?.impressions ?? null} />
        <StatCard label="Profile Visits" value={latest?.profile_visits ?? null} />
      </div>

      {/* Log new snapshot */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Log Snapshot</h2>
        <Form method="post" className="grid grid-cols-4 gap-4">
          <input
            name="recorded_date"
            type="date"
            required
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input name="followers" type="number" placeholder="Followers" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="impressions" type="number" placeholder="Impressions" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="profile_visits" type="number" placeholder="Profile Visits" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={isSubmitting} className="col-span-4 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            Save Snapshot
          </button>
        </Form>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Followers</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Impressions</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Profile Visits</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No snapshots yet.</td></tr>
            )}
            {metrics.map((m, i) => (
              <tr key={m.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 font-mono text-foreground">{m.recorded_date}</td>
                <td className="px-4 py-3 font-mono text-foreground">{m.followers?.toLocaleString() ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-foreground">{m.impressions?.toLocaleString() ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-foreground">{m.profile_visits?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.content.metrics.tsx
git commit -m "feat: add X metrics page"
```

---

## Task 10: To-Dos page

**Files:**
- Create: `app/routes/_protected.content.todos.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .order('due_date', { ascending: true })
  return Response.json({ todos: todos ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('todos').insert({
      user_id: session.user.id,
      task: String(formData.get('task')),
      priority: String(formData.get('priority') || 'medium'),
      due_date: String(formData.get('due_date') || '') || null,
    })
  }

  if (intent === 'toggle') {
    const id = String(formData.get('id'))
    const completed = formData.get('completed') === 'true'
    await supabase.from('todos').update({ completed: !completed }).eq('id', id)
  }

  if (intent === 'delete') {
    await supabase.from('todos').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Todos() {
  const { todos } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const open = todos.filter(t => !t.completed)
  const done = todos.filter(t => t.completed)

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">To-Dos</h1>
      <p className="text-muted-foreground text-sm mb-8">Tasks with priority and due date.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">New Task</h2>
        <Form method="post" className="grid grid-cols-3 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input name="task" placeholder="Task" required className="col-span-3 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select name="priority" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input name="due_date" type="date" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Add</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="w-8 px-4 py-3"></th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Task</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Priority</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Due</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {open.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">All done!</td></tr>}
            {open.map((todo, i) => (
              <tr key={todo.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="completed" value={String(todo.completed)} />
                    <button type="submit" className="w-4 h-4 rounded border border-border bg-input hover:border-primary transition-colors" />
                  </Form>
                </td>
                <td className="px-4 py-3 text-foreground">{todo.task}</td>
                <td className="px-4 py-3"><StatusBadge status={todo.priority} /></td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={todo.id} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors">Delete</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {done.length > 0 && (
        <details className="bg-card border border-border rounded-lg overflow-hidden">
          <summary className="px-4 py-3 text-sm text-muted-foreground cursor-pointer">Completed ({done.length})</summary>
          <table className="w-full text-sm">
            <tbody>
              {done.map((todo, i) => (
                <tr key={todo.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-4 py-3">
                    <Form method="post">
                      <input type="hidden" name="intent" value="toggle" />
                      <input type="hidden" name="id" value={todo.id} />
                      <input type="hidden" name="completed" value={String(todo.completed)} />
                      <button type="submit" className="w-4 h-4 rounded border border-primary bg-primary/20 transition-colors" />
                    </Form>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground line-through">{todo.task}</td>
                  <td className="px-4 py-3"><StatusBadge status={todo.priority} /></td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={todo.id} />
                      <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors">Delete</button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.content.todos.tsx
git commit -m "feat: add todos page"
```

---

## Task 11: Deal Pipeline page

**Files:**
- Create: `app/routes/_protected.business.pipeline.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
  return Response.json({ deals: deals ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('deals').insert({
      user_id: session.user.id,
      business_name: String(formData.get('business_name')),
      asking_price: Number(formData.get('asking_price')) || null,
      source: String(formData.get('source') || ''),
      stage: String(formData.get('stage') || 'reviewing'),
      notes: String(formData.get('notes') || ''),
    })
  }

  if (intent === 'delete') {
    await supabase.from('deals').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Pipeline() {
  const { deals } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Deal Pipeline</h1>
      <p className="text-muted-foreground text-sm mb-8">Pre-acquisition deal tracking.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Add Deal</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input name="business_name" placeholder="Business name" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="asking_price" type="number" placeholder="Asking price" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="source" placeholder="Source (broker, direct, marketplace…)" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select name="stage" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="reviewing">Reviewing</option>
            <option value="in-dd">In DD</option>
            <option value="offer-made">Offer Made</option>
            <option value="closed">Closed</option>
          </select>
          <textarea name="notes" placeholder="Notes" rows={2} className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <button type="submit" disabled={isSubmitting} className="col-span-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Add Deal</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Business</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Asking Price</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Source</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stage</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Notes</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {deals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No deals in pipeline yet.</td></tr>}
            {deals.map((deal, i) => (
              <tr key={deal.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 text-foreground font-medium">{deal.business_name}</td>
                <td className="px-4 py-3 font-mono text-foreground">{deal.asking_price ? `$${Number(deal.asking_price).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{deal.source}</td>
                <td className="px-4 py-3"><StatusBadge status={deal.stage} /></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{deal.notes}</td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={deal.id} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors">Delete</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.business.pipeline.tsx
git commit -m "feat: add deal pipeline page"
```

---

## Task 12: Entity Health page

**Files:**
- Create: `app/routes/_protected.business.entities.tsx`

- [ ] **Step 1: Create the route**

Each entity (AU, US) renders as a card with a compliance checklist from the `compliance_tasks` JSONB column. The loader seeds the two entities if they don't exist yet.

```tsx
import { Form, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'

type ComplianceTask = { id: string; task: string; due_date: string | null; done: boolean }
type Entity = {
  id: string
  name: string
  jurisdiction: string
  compliance_tasks: ComplianceTask[]
  advisor_status: string | null
  next_filing_date: string | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)

  let { data: entities } = await supabase
    .from('entities')
    .select('*')
    .order('jurisdiction', { ascending: true })

  // Seed the two entities if they don't exist
  if (!entities || entities.length === 0) {
    await supabase.from('entities').insert([
      { user_id: session.user.id, name: 'Fraga Ventures Pty Ltd', jurisdiction: 'AU', compliance_tasks: [] },
      { user_id: session.user.id, name: 'Fraga Ventures LLC', jurisdiction: 'US', compliance_tasks: [] },
    ])
    const { data: seeded } = await supabase.from('entities').select('*').order('jurisdiction')
    entities = seeded
  }

  return Response.json({ entities: entities ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')
  const entityId = String(formData.get('entity_id'))

  if (intent === 'add_task') {
    const { data: entity } = await supabase.from('entities').select('compliance_tasks').eq('id', entityId).single()
    const tasks: ComplianceTask[] = entity?.compliance_tasks ?? []
    tasks.push({
      id: crypto.randomUUID(),
      task: String(formData.get('task')),
      due_date: String(formData.get('due_date') || '') || null,
      done: false,
    })
    await supabase.from('entities').update({ compliance_tasks: tasks }).eq('id', entityId)
  }

  if (intent === 'toggle_task') {
    const taskId = String(formData.get('task_id'))
    const { data: entity } = await supabase.from('entities').select('compliance_tasks').eq('id', entityId).single()
    const tasks: ComplianceTask[] = (entity?.compliance_tasks ?? []).map((t: ComplianceTask) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    )
    await supabase.from('entities').update({ compliance_tasks: tasks }).eq('id', entityId)
  }

  if (intent === 'update_meta') {
    await supabase.from('entities').update({
      advisor_status: String(formData.get('advisor_status') || '') || null,
      next_filing_date: String(formData.get('next_filing_date') || '') || null,
    }).eq('id', entityId)
  }

  return Response.json({}, { headers: responseHeaders })
}

function EntityCard({ entity }: { entity: Entity }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-serif text-xl text-foreground">{entity.name}</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{entity.jurisdiction}</p>
        </div>
      </div>

      {/* Meta */}
      <Form method="post" className="grid grid-cols-2 gap-3 mb-6">
        <input type="hidden" name="intent" value="update_meta" />
        <input type="hidden" name="entity_id" value={entity.id} />
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Advisor Status</label>
          <input name="advisor_status" defaultValue={entity.advisor_status ?? ''} placeholder="e.g. Active — Jane Smith" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Next Filing Date</label>
          <input name="next_filing_date" type="date" defaultValue={entity.next_filing_date ?? ''} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button type="submit" className="col-span-2 text-xs text-muted-foreground hover:text-primary transition-colors text-left">Save meta →</button>
      </Form>

      {/* Compliance tasks */}
      <div className="mb-4">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Compliance Tasks</h3>
        {entity.compliance_tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}
        <ul className="space-y-2">
          {entity.compliance_tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3">
              <Form method="post">
                <input type="hidden" name="intent" value="toggle_task" />
                <input type="hidden" name="entity_id" value={entity.id} />
                <input type="hidden" name="task_id" value={t.id} />
                <button
                  type="submit"
                  className={`mt-0.5 w-4 h-4 rounded border transition-colors flex-shrink-0 ${t.done ? 'bg-primary/20 border-primary' : 'bg-input border-border hover:border-primary'}`}
                />
              </Form>
              <div>
                <p className={`text-sm ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.task}</p>
                {t.due_date && <p className="font-mono text-xs text-muted-foreground">{t.due_date}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add task */}
      <Form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="add_task" />
        <input type="hidden" name="entity_id" value={entity.id} />
        <input name="task" placeholder="New compliance task" required className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="due_date" type="date" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity">Add</button>
      </Form>
    </div>
  )
}

export default function Entities() {
  const { entities } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Entity Health</h1>
      <p className="text-muted-foreground text-sm mb-8">Compliance and advisor status for both entities.</p>
      <div className="grid grid-cols-2 gap-6">
        {entities.map((entity) => (
          <EntityCard key={entity.id} entity={entity as Entity} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.business.entities.tsx
git commit -m "feat: add entity health page"
```

---

## Task 13: Cash Position page

**Files:**
- Create: `app/routes/_protected.business.cash.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)

  // Latest balance per entity
  const { data: all } = await supabase
    .from('cash_positions')
    .select('*')
    .order('recorded_at', { ascending: false })

  const latest: Record<string, typeof all[0]> = {}
  for (const row of all ?? []) {
    if (!latest[row.entity_name]) latest[row.entity_name] = row
  }

  return Response.json({ latest, history: all ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()

  await supabase.from('cash_positions').insert({
    user_id: session.user.id,
    entity_name: String(formData.get('entity_name')),
    balance: Number(formData.get('balance')),
    currency: String(formData.get('currency')),
  })

  return Response.json({}, { headers: responseHeaders })
}

export default function Cash() {
  const { latest, history } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const au = latest['Fraga Ventures Pty Ltd']
  const us = latest['Fraga Ventures LLC']

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Cash Position</h1>
      <p className="text-muted-foreground text-sm mb-8">Manual balances. Basiq API integration coming later.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Fraga Ventures Pty Ltd (AUD)" value={au ? `$${Number(au.balance).toLocaleString()}` : null} />
        <StatCard label="Fraga Ventures LLC (USD)" value={us ? `$${Number(us.balance).toLocaleString()}` : null} />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Log Balance</h2>
        <Form method="post" className="grid grid-cols-3 gap-4">
          <select name="entity_name" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="Fraga Ventures Pty Ltd">Fraga Ventures Pty Ltd (AU)</option>
            <option value="Fraga Ventures LLC">Fraga Ventures LLC (US)</option>
          </select>
          <input name="balance" type="number" step="0.01" placeholder="Balance" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select name="currency" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="AUD">AUD</option>
            <option value="USD">USD</option>
          </select>
          <button type="submit" disabled={isSubmitting} className="col-span-3 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Save Balance</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Entity</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Balance</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Currency</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Recorded</th>
          </tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No balances logged yet.</td></tr>}
            {history.map((row, i) => (
              <tr key={row.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 text-foreground">{row.entity_name}</td>
                <td className="px-4 py-3 font-mono text-foreground">${Number(row.balance).toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.currency}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{new Date(row.recorded_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser, commit**

```bash
git add app/routes/_protected.business.cash.tsx
git commit -m "feat: add cash position page"
```

---

## Task 14: SaaS Health page

**Files:**
- Create: `app/routes/_protected.business.saas.tsx`

- [ ] **Step 1: Create the route**

```tsx
import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)

  const { data: businesses } = await supabase
    .from('saas_businesses')
    .select('*, saas_metrics(*)')
    .order('acquired_at', { ascending: true })

  return Response.json({ businesses: businesses ?? [] }, { headers: responseHeaders })
}

export default function SaasHealth() {
  const { businesses } = useLoaderData<typeof loader>()

  if (businesses.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-foreground mb-1">SaaS Health</h1>
        <p className="text-muted-foreground text-sm mb-8">Portfolio metrics per business.</p>
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="font-serif text-xl text-foreground mb-2">No businesses yet.</p>
          <p className="text-muted-foreground text-sm">First acquisition will appear here once the deal closes.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">SaaS Health</h1>
      <p className="text-muted-foreground text-sm mb-8">Portfolio metrics per business.</p>

      <div className="space-y-8">
        {businesses.map((biz) => {
          const metrics = biz.saas_metrics ?? []
          const latest = metrics.sort((a: { recorded_month: string }, b: { recorded_month: string }) =>
            b.recorded_month.localeCompare(a.recorded_month)
          )[0] ?? null

          return (
            <div key={biz.id} className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-foreground">{biz.name}</h2>
                {biz.acquired_at && (
                  <p className="text-xs text-muted-foreground">
                    Acquired {new Date(biz.acquired_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-5 gap-4">
                <StatCard label="MRR" value={latest?.mrr ? `$${Number(latest.mrr).toLocaleString()}` : null} />
                <StatCard label="NRR" value={latest?.nrr ? `${latest.nrr}%` : null} />
                <StatCard label="Churn Rate" value={latest?.churn_rate ? `${latest.churn_rate}%` : null} />
                <StatCard label="Active Users" value={latest?.active_users ?? null} />
                <StatCard label="MoM Growth" value={latest?.mom_growth ? `${latest.mom_growth}%` : null} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser — should show placeholder state, commit**

```bash
git add app/routes/_protected.business.saas.tsx
git commit -m "feat: add saas health page with placeholder state"
```

---

## Task 15: Deploy to Vercel

**Files:**
- No code changes — configuration only

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/admin-dashboard.git
git push -u origin main
```

- [ ] **Step 2: Create Vercel project**

Go to vercel.com → Add New Project → import the GitHub repo. Framework preset: **Other** (React Router v7 handles its own build).

- [ ] **Step 3: Set environment variables in Vercel**

In Project Settings → Environment Variables, add:
```
SUPABASE_URL        = https://your-project-ref.supabase.co
SUPABASE_ANON_KEY   = your-anon-key
```

- [ ] **Step 4: Set Supabase auth redirect URL**

In Supabase → Authentication → URL Configuration → Site URL, set to your Vercel production URL (e.g. `https://admin-dashboard-xyz.vercel.app`).

- [ ] **Step 5: Trigger deploy and verify**

In Vercel dashboard, trigger a deployment. Once complete, visit the production URL, sign in, and verify all 8 pages load and data persists.

- [ ] **Step 6: Commit any config fixes**

```bash
git add .
git commit -m "chore: production deployment verified"
```

---

## Summary

| Task | Deliverable |
|------|-------------|
| 1 | Dependencies installed, design system applied |
| 2 | Supabase project, schema, RLS, user account |
| 3 | Supabase server/client helpers, session management |
| 4 | Login + logout routes |
| 5 | Sidebar + protected layout shell |
| 6 | StatusBadge + StatCard shared components |
| 7 | Content Ideas page |
| 8 | Content Schedule page |
| 9 | X Metrics page |
| 10 | To-Dos page |
| 11 | Deal Pipeline page |
| 12 | Entity Health page |
| 13 | Cash Position page |
| 14 | SaaS Health page (placeholder) |
| 15 | Deployed to Vercel |
