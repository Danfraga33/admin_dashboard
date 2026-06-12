-- SaaS events cache (single row, service-role only -- no user policy).
-- Survives serverless cold starts / dev restarts so Gemini grounded-search
-- quota is spent at most once per TTL, not once per process.
create table saas_events_cache (
  id         integer primary key default 1,
  events     jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
alter table saas_events_cache enable row level security;
