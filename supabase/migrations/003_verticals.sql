-- Create verticals table
create table if not exists verticals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  verdict text not null check (verdict in ('Pursue', 'Conditional', 'Avoid')),
  demand_trajectory text not null default '',
  demand_color text not null default 'neutral' check (demand_color in ('green', 'amber', 'red', 'neutral')),
  recession_sensitivity text not null default '',
  tech_disruption_risk text not null default '',
  regulatory_moat text not null default '',
  gross_margin text not null default '',
  sde_margin text not null default '',
  buy_multiple text not null default '',
  research_notes text not null default '',
  created_at timestamptz not null default now()
);

alter table verticals enable row level security;

create policy "Users manage own verticals"
  on verticals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed data (uses a DO block so we can reference auth.users safely)
-- Seeded for the first user found; adjust user_id if needed.
-- Run this after creating your Supabase account user.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'No users found — skipping seed. Insert rows manually or re-run after signing up.';
    return;
  end if;

  insert into verticals (user_id, name, description, verdict, demand_trajectory, demand_color, recession_sensitivity, tech_disruption_risk, regulatory_moat, gross_margin, sde_margin, buy_multiple, research_notes) values
    (v_user_id, 'Pest Control (B2B Commercial)', 'Growing climate-driven demand', 'Pursue', 'Growing', 'green', 'Non-deferrable', 'Low', 'High', '60–80%', '28–35%', '2.3–3.0×', ''),
    (v_user_id, 'Fire & Life Safety (Inspection & Testing)', 'Growing code-driven', 'Pursue', 'Growing', 'green', 'Non-deferrable', 'Low', 'Very High', '55–70%', '25–35%', '3.5–5.0×', ''),
    (v_user_id, 'Backflow Prevention (Annual Testing)', 'Growing mandate-driven', 'Pursue', 'Growing', 'green', 'Non-deferrable', 'Low', 'Very High', '65–75%', '30–40%', '2.5–3.5×', ''),
    (v_user_id, 'Commercial Cleaning (B2B Contracts Only)', 'Stable', 'Pursue', 'Stable', 'neutral', 'Deferrable with contract buffer', 'Low', 'Low', '40–55%', '25–31%', '1.6–2.6×', ''),
    (v_user_id, 'HVAC Maintenance (Service Contracts, Commercial)', 'Growing climate-driven', 'Pursue', 'Growing', 'green', 'Mixed', 'Low', 'High', '45–60%', '20–30%', '1.9–3.3×', ''),
    (v_user_id, 'Calibration & Testing (Industrial Instruments)', 'Stable-growing ISO-driven', 'Pursue', 'Stable-growing', 'green', 'Non-deferrable', 'Low', 'Very High', '55–70%', '28–38%', '2.5–3.5×', ''),
    (v_user_id, 'Commercial Electrical (Maintenance Focus Only)', 'Stable', 'Conditional', 'Stable', 'neutral', 'Mixed', 'Low', 'High', '40–55%', '18–28%', '2.0–3.5×', ''),
    (v_user_id, 'WHS Compliance Consulting (Retainer Model)', 'Growing Safe Work-driven', 'Conditional', 'Growing', 'green', 'Deferrable short term', 'Medium', 'Medium', '60–75%', '25–40%', '2.0–3.0×', ''),
    (v_user_id, 'Waste Management (Specialist/Hazardous)', 'Growing EPA-driven', 'Conditional', 'Growing', 'green', 'Non-deferrable', 'Low', 'High', '35–50%', '15–25%', '2.0–3.0×', ''),
    (v_user_id, 'Bookkeeping / BAS (General SME)', 'Declining AI-driven', 'Avoid', 'Declining', 'red', 'Non-deferrable', 'Very High', 'Medium', '70–85%', '30–45%', '1.5–2.5×', ''),
    (v_user_id, 'Print / Signage (B2B Commercial)', 'Declining digital substitution', 'Avoid', 'Declining', 'red', 'Discretionary', 'High', 'None', '30–45%', '10–20%', '1.5–2.5×', ''),
    (v_user_id, 'Corporate Event Services', 'Volatile', 'Avoid', 'Volatile', 'amber', 'Discretionary', 'Medium', 'None', '25–40%', '8–18%', '1.5–2.5×', ''),
    (v_user_id, 'Recruitment / Labour Hire (General)', 'Declining AI-driven', 'Avoid', 'Declining', 'red', 'Highly cyclical', 'Very High', 'None', '20–35%', '8–15%', '1.5–2.5×', ''),
    (v_user_id, 'Office Supplies / Distribution', 'Declining platform-driven', 'Avoid', 'Declining', 'red', 'Deferrable', 'Very High', 'None', '20–35%', '5–12%', '1.0–2.0×', '')
  on conflict do nothing;
end $$;
