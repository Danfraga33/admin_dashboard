-- Focuses
create table focuses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  final_picture text,
  next_step    text,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table focuses enable row level security;
create policy "owner only" on focuses
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
