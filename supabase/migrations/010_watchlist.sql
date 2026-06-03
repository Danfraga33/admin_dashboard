-- Scout watchlist: user-curated symbols + notes (no live quote data)

create table watchlist (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  sym       text not null,
  note      text not null default '',
  position  integer not null default 0,
  created_at timestamptz not null default now()
);
alter table watchlist enable row level security;
create policy "owner only" on watchlist
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
