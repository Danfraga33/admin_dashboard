-- Sharesight portfolio cache (cache pattern: sync writes, loader reads)

-- One row per user: portfolio-level aggregates
create table sharesight_portfolio (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total      numeric not null default 0,
  day_pct    numeric not null default 0,
  day_abs    numeric not null default 0,
  ytd_pct    numeric not null default 0,
  synced_at  timestamptz not null default now()
);
alter table sharesight_portfolio enable row level security;
create policy "owner only" on sharesight_portfolio
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- N rows per user: holdings
create table sharesight_holdings (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  sym       text not null,
  name      text not null default '',
  val       numeric not null default 0,
  pct       numeric not null default 0,
  shares    numeric,
  alloc     numeric not null default 0,
  tone      text not null default 'flat',
  note      text not null default '',
  position  integer not null default 0
);
alter table sharesight_holdings enable row level security;
create policy "owner only" on sharesight_holdings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- N rows per user: allocation by class
create table sharesight_allocation (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  label     text not null,
  pct       numeric not null default 0,
  color     text not null default 'chart-1',
  position  integer not null default 0
);
alter table sharesight_allocation enable row level security;
create policy "owner only" on sharesight_allocation
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- OAuth token cache (single row, service-role only -- no user policy)
create table sharesight_oauth (
  id           integer primary key default 1,
  access_token text not null,
  expires_at   timestamptz not null,
  constraint single_row check (id = 1)
);
alter table sharesight_oauth enable row level security;

-- Sync event log (service-role only)
create table sync_runs (
  id       uuid primary key default gen_random_uuid(),
  source   text not null,
  ok       boolean not null,
  error    text,
  ran_at   timestamptz not null default now()
);
alter table sync_runs enable row level security;
