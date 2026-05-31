-- Fitness / Gym workspace

-- Training split: Upper, Lower, Push, Pull, Legs
create table fitness_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table fitness_days enable row level security;
create policy "owner only" on fitness_days
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exercises within a day
create table fitness_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_id      uuid not null references fitness_days(id) on delete cascade,
  name        text not null,
  sets        text,
  reps        text,
  notes       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table fitness_exercises enable row level security;
create policy "owner only" on fitness_exercises
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Single targets row per user
create table fitness_targets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  calorie_min  integer not null default 3000,
  calorie_max  integer not null default 3200,
  weight_kg    numeric not null default 85,
  water_litres text not null default '3-4 L/day',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table fitness_targets enable row level security;
create policy "owner only" on fitness_targets
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conditioning (sprints, running/walk)
create table fitness_cardio (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  cadence     text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table fitness_cardio enable row level security;
create policy "owner only" on fitness_cardio
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Diet plan: one row per meal
create table fitness_meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  items       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table fitness_meals enable row level security;
create policy "owner only" on fitness_meals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
