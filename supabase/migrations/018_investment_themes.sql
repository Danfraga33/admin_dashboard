-- Investment themes: user-curated macro theses shown on the Investments page

create table investment_themes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  color     text not null default 'chart-1',
  position  integer not null default 0,
  created_at timestamptz not null default now()
);
alter table investment_themes enable row level security;
create policy "owner only" on investment_themes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
