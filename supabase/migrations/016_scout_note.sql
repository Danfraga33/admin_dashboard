-- Cache for Scout's dynamic weekly portfolio note. Lives on the existing
-- per-user sharesight_portfolio row; regenerated lazily when older than 7 days.
alter table sharesight_portfolio
  add column scout_note    text,
  add column scout_note_at timestamptz;
