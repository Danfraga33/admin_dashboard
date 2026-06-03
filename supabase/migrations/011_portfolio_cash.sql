-- Store cash balance (sum of Sharesight cash_accounts) on the portfolio row
alter table sharesight_portfolio add column if not exists cash numeric not null default 0;
