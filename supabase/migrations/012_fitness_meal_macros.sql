-- Per-meal macros for the Diet block
alter table fitness_meals
  add column calories integer not null default 0,
  add column protein  integer not null default 0;
