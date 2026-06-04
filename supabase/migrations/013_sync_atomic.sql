-- Atomic Sharesight cache swap.
--
-- Previously syncSharesight did portfolio upsert + holdings delete/insert +
-- allocation delete/insert as separate statements. Two concurrent syncs (e.g.
-- a stale-cache background refresh firing on overlapping requests) interleaved
-- their deletes and inserts, leaving sharesight_holdings empty or duplicated.
--
-- This function does the whole swap in one transaction, serialized per user by a
-- transaction-scoped advisory lock, so concurrent callers queue instead of
-- racing. Worst case is last-writer-wins — never a partial or empty state.

create or replace function sync_sharesight_data(
  p_user_id    uuid,
  p_portfolio  jsonb,
  p_holdings   jsonb,
  p_allocation jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serialize concurrent syncs for this user; released automatically at commit.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into sharesight_portfolio (user_id, total, cash, day_pct, day_abs, ytd_pct, synced_at)
  values (
    p_user_id,
    (p_portfolio->>'total')::numeric,
    (p_portfolio->>'cash')::numeric,
    (p_portfolio->>'day_pct')::numeric,
    (p_portfolio->>'day_abs')::numeric,
    (p_portfolio->>'ytd_pct')::numeric,
    now()
  )
  on conflict (user_id) do update set
    total = excluded.total,
    cash = excluded.cash,
    day_pct = excluded.day_pct,
    day_abs = excluded.day_abs,
    ytd_pct = excluded.ytd_pct,
    synced_at = excluded.synced_at;

  delete from sharesight_holdings where user_id = p_user_id;
  insert into sharesight_holdings (user_id, sym, name, val, pct, shares, alloc, tone, note, position)
  select p_user_id, x.sym, x.name, x.val, x.pct, x.shares, x.alloc, x.tone, x.note, x.position
  from jsonb_to_recordset(p_holdings) as x(
    sym text, name text, val numeric, pct numeric, shares numeric,
    alloc numeric, tone text, note text, position integer
  );

  delete from sharesight_allocation where user_id = p_user_id;
  insert into sharesight_allocation (user_id, label, pct, color, position)
  select p_user_id, x.label, x.pct, x.color, x.position
  from jsonb_to_recordset(p_allocation) as x(
    label text, pct numeric, color text, position integer
  );
end;
$$;

revoke all on function sync_sharesight_data(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function sync_sharesight_data(uuid, jsonb, jsonb, jsonb) to service_role;
