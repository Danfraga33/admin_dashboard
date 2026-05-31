-- Convert training split to weekday cards (Mon–Sun).
-- name = weekday, label = workout type (e.g. "Upper", "Rest").
alter table fitness_days add column label text;

-- Reset prior seed so the weekday re-seed runs on next load.
delete from fitness_days;
