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
