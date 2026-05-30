-- IBKR portfolio cache (written by the IBKR sync job, read by the investments loader)

-- Account-level snapshot: one row per user
create table ibkr_portfolio (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  total        numeric not null default 0,
  day_pct      numeric not null default 0,
  day_abs      numeric not null default 0,
  ytd_pct      numeric not null default 0,
  cash         numeric not null default 0,
  scout_note   text not null default '',
  synced_at    timestamptz not null default now()
);
alter table ibkr_portfolio enable row level security;
create policy "owner only" on ibkr_portfolio
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Holdings: many rows per user, one per symbol
create table ibkr_holdings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  conid        text not null,
  sym          text not null,
  name         text not null default '',
  val          numeric not null default 0,
  pct          numeric not null default 0,   -- day change %
  shares       numeric,
  alloc        numeric not null default 0,   -- % of total book
  asset_class  text not null default 'Equities',
  tone         text not null default 'flat', -- up | down | flat
  note         text not null default '',
  synced_at    timestamptz not null default now(),
  unique(user_id, conid)
);
alter table ibkr_holdings enable row level security;
create policy "owner only" on ibkr_holdings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Value history: one row appended per sync, powers the sparkline
create table ibkr_value_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  total        numeric not null,
  captured_at  timestamptz not null default now()
);
alter table ibkr_value_history enable row level security;
create policy "owner only" on ibkr_value_history
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index ibkr_value_history_user_time on ibkr_value_history (user_id, captured_at desc);

-- Sync run log: surfaces last-synced + failures in the agent rail
create table sync_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       text not null,                -- ibkr | jarvis
  ok           boolean not null,
  error        text,
  ran_at       timestamptz not null default now()
);
alter table sync_runs enable row level security;
create policy "owner only" on sync_runs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index sync_runs_user_source_time on sync_runs (user_id, source, ran_at desc);
