-- Run ONCE in Supabase SQL Editor. Powers the Leaderboard.
alter table public.attempts
  add column if not exists score numeric,
  add column if not exists correct_count int,
  add column if not exists incorrect_count int;

-- Rankings: best submitted attempt per student. p_test_id = null gives overall (sum of best scores).
create or replace function public.get_leaderboard(p_test_id bigint default null)
returns table(rank bigint, user_id uuid, name text, photo_url text, score numeric, max_score numeric,
              correct_count bigint, time_taken_seconds bigint, tests_taken bigint, is_me boolean)
language sql security definer set search_path = public stable as $$
  with best as (
    select distinct on (a.user_id, a.test_id) a.user_id, a.test_id, a.score, a.max_score,
           coalesce(a.correct_count,0) cc, coalesce(a.time_taken_seconds,0) tt
    from attempts a join tests t on t.id = a.test_id
    where a.status = 'submitted' and a.score is not null and t.enabled and exists(select 1 from test_keys k where k.test_id=a.test_id)
      and (p_test_id is null or a.test_id = p_test_id)
    order by a.user_id, a.test_id, a.score desc, a.time_taken_seconds asc
  ), agg as (
    select user_id, sum(score) score, sum(max_score) max_score, sum(cc) cc, sum(tt) tt, count(*) n
    from best group by user_id
  )
  select rank() over (order by g.score desc, g.tt asc), g.user_id,
         coalesce(nullif(p.name,''),'Student'), p.photo_url, g.score, g.max_score, g.cc, g.tt, g.n,
         g.user_id = auth.uid()
  from agg g left join profiles p on p.id = g.user_id
  order by 1, g.user_id
$$;
grant execute on function public.get_leaderboard(bigint) to authenticated;
