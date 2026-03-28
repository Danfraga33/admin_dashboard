-- =============================================
-- Migration: lenders, pipeline_deals, buy_box_cards
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Lenders (Private Wealth page)
create table if not exists public.lenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lvr_limit text not null default '',
  lvr_min text not null default '',
  rates_approx text not null default '',
  terms text not null default '',
  min_withdraw text not null default '',
  restrictions text not null default '',
  created_at timestamptz not null default now()
);

alter table public.lenders enable row level security;
create policy "Users can manage own lenders" on public.lenders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Pipeline Deals (Deal Flow > Pipeline page)
create table if not exists public.pipeline_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sector text not null default '',
  revenue_range text not null default '',
  ebitda text not null default '',
  asking_price text not null default '',
  model text not null default '',
  location text not null default '',
  status text not null default 'Watching',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.pipeline_deals enable row level security;
create policy "Users can manage own pipeline deals" on public.pipeline_deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Buy Box Cards (Deal Flow > Buy Box page)
create table if not exists public.buy_box_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  subtitle text not null default '',
  details text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, slug)
);

alter table public.buy_box_cards enable row level security;
create policy "Users can manage own buy box cards" on public.buy_box_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
