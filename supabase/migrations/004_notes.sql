-- Notes
create table notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table notes enable row level security;
create policy "owner only" on notes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
