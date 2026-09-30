-- MDCCCVII — additive student visibility patch
-- Does NOT replace start/submit/scoring/admin functions.
-- Run once after the existing V10/V10.2 database is working.

create or replace function public.get_my_attempt_status()
returns table(
  test_id bigint,
  attempts_used integer,
  base_attempts integer,
  granted_remaining integer,
  latest_attempt_id bigint,
  latest_score numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select t.id as test_id,
           (1 + coalesce(t.reattempt_limit,0))::integer as base_attempts,
           coalesce((select count(*) from public.attempts a
                     where a.user_id=auth.uid() and a.test_id=t.id
                       and a.status in ('submitted','in_progress')),0)::integer as attempts_used,
           coalesce((select sum(g.remaining) from public.attempt_grants g
                     where g.user_id=auth.uid() and g.test_id=t.id and g.remaining>0),0)::integer as granted_remaining
    from public.tests t
    where t.enabled=true and coalesce(t.archived,false)=false
  ), latest as (
    select distinct on (a.test_id) a.test_id,a.id,a.score
    from public.attempts a
    where a.user_id=auth.uid() and a.status='submitted'
    order by a.test_id,a.submitted_at desc nulls last,a.id desc
  )
  select b.test_id,b.attempts_used,b.base_attempts,b.granted_remaining,
         l.id as latest_attempt_id,l.score as latest_score
  from base b left join latest l on l.test_id=b.test_id;
$$;
grant execute on function public.get_my_attempt_status() to authenticated;

-- Returns the student's own submitted response analysis without exposing the
-- answer-key table itself. It only works after submission and after a key exists.
drop function if exists public.get_my_test_analysis(bigint);
create or replace function public.get_my_test_analysis(p_test_id bigint)
returns table(
  attempt_id bigint,
  test_id bigint,
  test_name text,
  submitted_at timestamptz,
  expires_at timestamptz,
  total_questions integer,
  duration_minutes integer,
  positive_marks numeric,
  negative_mcq numeric,
  negative_numerical numeric,
  max_score numeric,
  question_no integer,
  response text,
  correct_response text,
  is_correct boolean,
  attempted boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with latest as (
    select distinct on (a.test_id)
      a.*,t.name as test_name,
      k.keys as answer_keys
    from public.attempts a
    join public.tests t on t.id=a.test_id
    join public.test_keys k on k.test_id=a.test_id
    where a.user_id=auth.uid()
      and a.test_id=p_test_id
      and a.status='submitted'
    order by a.test_id,a.submitted_at desc nulls last,a.id desc
  ), qs as (
    select gs as question_no from latest l, generate_series(1,l.total_questions_snapshot) gs
  )
  select l.id,l.test_id,l.test_name,l.submitted_at,l.expires_at,
         l.total_questions_snapshot,l.duration_minutes_snapshot,
         l.positive_marks_snapshot,l.negative_mcq_snapshot,l.negative_numerical_snapshot,
         l.max_score,
         q.question_no,
         a.response,
         l.answer_keys[q.question_no] as correct_response,
         case
           when nullif(a.response,'') is null then false
           when ((q.question_no-1) % (l.total_questions_snapshot/3)) >= (l.total_questions_snapshot/3)-5
             then case
               when a.response ~ '^-?\d+(\.\d+)?$'
                and l.answer_keys[q.question_no] ~ '^-?\d+(\.\d+)?$'
               then abs(a.response::numeric-l.answer_keys[q.question_no]::numeric) < 1e-9
               else false end
           else a.response = l.answer_keys[q.question_no]
         end as is_correct,
         nullif(a.response,'') is not null as attempted
  from latest l
  join qs q on true
  left join public.answers a on a.attempt_id=l.id and a.question_no=q.question_no
  order by q.question_no;
$$;
grant execute on function public.get_my_test_analysis(bigint) to authenticated;

notify pgrst, 'reload schema';
