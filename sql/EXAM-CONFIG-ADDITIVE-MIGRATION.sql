-- MDCCCVII additive exam configuration migration
-- Safe to run on the existing production database. Does not rewrite existing scoring RPCs.
begin;
alter table public.tests
  add column if not exists exam_config jsonb not null default
  '{"version":1,"format":"mains","subjects":{"Physics":25,"Chemistry":25,"Mathematics":25},"sectionsPerSubject":1,"partialMode":"none","partialMarks":1}'::jsonb;
comment on column public.tests.exam_config is
  'Versioned exam layout metadata. Legacy tests remain valid; CBT/scoring consumers must explicitly support each config version.';
commit;
