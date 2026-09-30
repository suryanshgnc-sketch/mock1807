-- MDCCCVII TESTS — FINAL: permanent student results + correct re-attempt gating
-- Run LAST, once, in Supabase SQL editor. Safe to re-run.

-- 1) Students may always read THEIR OWN attempts (this was the missing piece:
--    without it the result button never appeared for students, only for admins).
alter table public.attempts enable row level security;
drop policy if exists attempts_student_read_own on public.attempts;
create policy attempts_student_read_own on public.attempts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists answers_student_read_own on public.answers;
create policy answers_student_read_own on public.answers
  for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- 2) One status RPC covering ALL tests the student has touched (even archived/disabled),
--    so results stay accessible forever. can_reattempt is decided server-side.
drop function if exists public.get_my_attempt_status();
create or replace function public.get_my_attempt_status()
returns table(
  test_id bigint, attempts_used integer, base_attempts integer, granted_remaining integer,
  latest_attempt_id bigint, latest_score numeric, has_submitted boolean, can_reattempt boolean
)
language sql security definer set search_path = public stable as $$
  with mine as (
    select a.test_id,
           count(*) filter (where a.status in ('submitted','in_progress'))::int as used
    from public.attempts a where a.user_id = auth.uid() group by a.test_id
  ), latest as (
    select distinct on (a.test_id) a.test_id, a.id, a.score
    from public.attempts a where a.user_id = auth.uid() and a.status = 'submitted'
    order by a.test_id, a.submitted_at desc nulls last, a.id desc
  ), g as (
    select gr.test_id, sum(gr.remaining)::int as rem
    from public.attempt_grants gr where gr.user_id = auth.uid() and gr.remaining > 0 group by gr.test_id
  )
  select t.id,
         coalesce(m.used,0),
         (1 + coalesce(t.reattempt_limit,0))::int,
         coalesce(g.rem,0),
         l.id, l.score, (l.id is not null),
         (coalesce(t.enabled,true) and not coalesce(t.archived,false)
           and (greatest(0,(1 + coalesce(t.reattempt_limit,0)) - coalesce(m.used,0)) + coalesce(g.rem,0)) > 0)
  from public.tests t
  left join mine m on m.test_id = t.id
  left join latest l on l.test_id = t.id
  left join g on g.test_id = t.id
  where (coalesce(t.enabled,true) and not coalesce(t.archived,false)) or l.id is not null;
$$;
grant execute on function public.get_my_attempt_status() to authenticated;

-- 3) Ensure result readers exist (see STUDENT-RESULTS-PERSISTENCE-V11.sql / STUDENT-RESULT-BUTTON-V14.sql)
notify pgrst, 'reload schema';
