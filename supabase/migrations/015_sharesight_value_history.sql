-- Real portfolio value history for sparklines (replaces the deterministic
-- placeholder series). One row per user per day: syncSharesight appends today's
-- point on every refresh, and a one-off backfill seeds past dates from the
-- Sharesight valuation endpoint (which accepts any historical balance_date).

create table sharesight_value_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  as_of   date not null,
  total   numeric not null,
  primary key (user_id, as_of)
);
alter table sharesight_value_history enable row level security;
create policy "owner only" on sharesight_value_history
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
