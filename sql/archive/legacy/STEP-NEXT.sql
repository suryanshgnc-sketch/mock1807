-- Run this ONCE in Supabase SQL Editor.
alter table public.tests
  add column if not exists total_marks numeric not null default 300,
  add column if not exists positive_marks numeric not null default 4,
  add column if not exists negative_mcq numeric not null default 1,
  add column if not exists negative_numerical numeric not null default 1;

-- Existing tests can keep their current values; the admin editor will use
-- the new fields for all newly-created tests.
