-- Track cash alongside total in the value history so the chart can plot
-- Total, Portfolio (= total - cash), and Cash over time. Existing rows are
-- backfilled from the Sharesight valuation cash_accounts.
alter table sharesight_value_history
  add column cash numeric not null default 0;
