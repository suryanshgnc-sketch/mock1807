-- MDCCCVII: run this whole script ONCE in Supabase > SQL Editor.

-- 1) Columns for scores
alter table public.attempts
  add column if not exists score numeric,
  add column if not exists correct_count int,
  add column if not exists incorrect_count int;

-- 2) Answer keys (locked: students can never read this table)
create table if not exists public.test_keys(
  test_id bigint primary key references public.tests(id) on delete cascade,
  keys text[] not null,
  published_at timestamptz not null default now());
alter table public.test_keys enable row level security;

-- 3) Stop students editing their own scores
create or replace function public.guard_scores() returns trigger language plpgsql as $$
begin
  if current_setting('app.eval', true) is distinct from '1' then
    new.score := old.score; new.correct_count := old.correct_count; new.incorrect_count := old.incorrect_count;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_scores on public.attempts;
create trigger trg_guard_scores before update on public.attempts
  for each row execute function public.guard_scores();

-- 4) Admin: publish key + evaluate every submitted attempt
create or replace function public.publish_answer_key(p_test_id bigint, p_key text) returns int
language plpgsql security definer set search_path = public as $$
declare t tests; ks text[]; per int; n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from tests where id = p_test_id;
  select array_agg(case upper(x) when 'A' then '1' when 'B' then '2' when 'C' then '3' when 'D' then '4' else x end)
    into ks from unnest(regexp_split_to_array(trim(p_key), '[\s,;]+')) x where x <> '';
  if coalesce(array_length(ks,1),0) <> t.total_questions then
    raise exception 'Key has % answers but the test has % questions', coalesce(array_length(ks,1),0), t.total_questions;
  end if;
  insert into test_keys(test_id, keys) values (p_test_id, ks)
    on conflict (test_id) do update set keys = excluded.keys, published_at = now();
  per := t.total_questions / 3;
  perform set_config('app.eval','1',true);
  with g as (
    select r.attempt_id,
      sum(case when r.ok then 1 else 0 end) c,
      sum(case when r.att and not coalesce(r.ok,false) then 1 else 0 end) w,
      sum(case when r.ok then t.positive_marks
               when r.att then -(case when r.isnum then t.negative_numerical else t.negative_mcq end)
               else 0 end) sc
    from (select an.attempt_id,
            (an.response is not null and an.response <> '') att,
            ((an.question_no-1) % per) >= per-5 isnum,
            case when ((an.question_no-1) % per) >= per-5 then
                   case when an.response ~ '^-?\d+(\.\d+)?$' and ks[an.question_no] ~ '^-?\d+(\.\d+)?$'
                        then abs(an.response::numeric - ks[an.question_no]::numeric) < 1e-9 else false end
                 else an.response = ks[an.question_no] end ok
          from answers an join attempts atm on atm.id = an.attempt_id
          where atm.test_id = p_test_id and atm.status = 'submitted') r
    group by r.attempt_id)
  update attempts a set score = coalesce(g.sc,0), correct_count = g.c, incorrect_count = g.w
    from g where a.id = g.attempt_id;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.publish_answer_key(bigint, text) to authenticated;

-- 5) Student: own declared results
create or replace function public.get_my_results()
returns table(test_id bigint, name text, score numeric, max_score numeric,
              correct_count int, incorrect_count int, unanswered_count int)
language sql security definer set search_path = public stable as $$
  select distinct on (a.test_id) a.test_id, t.name, a.score, a.max_score,
         a.correct_count, a.incorrect_count, a.unanswered_count
  from attempts a join tests t on t.id = a.test_id join test_keys k on k.test_id = a.test_id
  where a.user_id = auth.uid() and a.status = 'submitted' and a.score is not null
  order by a.test_id, a.score desc $$;
grant execute on function public.get_my_results() to authenticated;

-- 6) Leaderboard (only tests whose key is published)
create or replace function public.get_leaderboard(p_test_id bigint default null)
returns table(rank bigint, user_id uuid, name text, photo_url text, score numeric, max_score numeric,
              correct_count bigint, time_taken_seconds bigint, tests_taken bigint, is_me boolean)
language sql security definer set search_path = public stable as $$
  with best as (
    select distinct on (a.user_id, a.test_id) a.user_id, a.test_id, a.score, a.max_score,
           coalesce(a.correct_count,0) cc, coalesce(a.time_taken_seconds,0) tt
    from attempts a join tests t on t.id = a.test_id
    where a.status = 'submitted' and a.score is not null and t.enabled
      and exists (select 1 from test_keys k where k.test_id = a.test_id)
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
  order by 1, g.user_id $$;
grant execute on function public.get_leaderboard(bigint) to authenticated;
