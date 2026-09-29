-- Run ONCE in Supabase SQL Editor (after LEADERBOARD.sql). Server-side answer keys + evaluation.
create table if not exists public.test_keys(
  test_id bigint primary key references public.tests(id) on delete cascade,
  keys text[] not null, published_at timestamptz not null default now());
alter table public.test_keys enable row level security;  -- no policies: students can never read keys

-- Stop students editing their own scores; only the evaluator below may change them.
create or replace function public.guard_scores() returns trigger language plpgsql as $$
begin
  if current_setting('app.eval', true) is distinct from '1' then
    new.score := old.score; new.correct_count := old.correct_count; new.incorrect_count := old.incorrect_count;
  end if; return new; end $$;
drop trigger if exists trg_guard_scores on public.attempts;
create trigger trg_guard_scores before update on public.attempts for each row execute function public.guard_scores();

-- Admin: publish the key, then every submitted attempt is evaluated at once.
create or replace function public.publish_answer_key(p_test_id bigint, p_key text) returns int
language plpgsql security definer set search_path = public as $$
declare t tests; ks text[]; per int; n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from tests where id = p_test_id;
  select array_agg(case upper(x) when 'A' then '1' when 'B' then '2' when 'C' then '3' when 'D' then '4' else x end)
    into ks from unnest(regexp_split_to_array(trim(p_key), '[\s,;]+')) x where x <> '';
  if coalesce(array_length(ks,1),0) <> t.total_questions then
    raise exception 'Key has % answers but the test has % questions', coalesce(array_length(ks,1),0), t.total_questions; end if;
  insert into test_keys(test_id, keys) values (p_test_id, ks)
    on conflict (test_id) do update set keys = excluded.keys, published_at = now();
  per := t.total_questions / 3;
  perform set_config('app.eval','1',true);
  with g as (
    select a.attempt_id,
      sum(case when ok then 1 else 0 end) c,
      sum(case when att and not ok then 1 else 0 end) w,
      sum(case when ok then t.positive_marks when att then -(case when isnum then t.negative_numerical else t.negative_mcq end) else 0 end) sc
    from (select an.attempt_id, (an.response is not null and an.response <> '') att,
            ((an.question_no-1) % per) >= per-5 isnum,
            case when ((an.question_no-1) % per) >= per-5
                 then an.response ~ '^-?\d+(\.\d+)?$' and ks[an.question_no] ~ '^-?\d+(\.\d+)?$'
                      and abs(an.response::numeric - ks[an.question_no]::numeric) < 1e-9
                 else an.response = ks[an.question_no] end ok
          from answers an join attempts at on at.id = an.attempt_id
          where at.test_id = p_test_id and at.status = 'submitted') a
    group by a.attempt_id)
  update attempts at set score = coalesce(g.sc,0), correct_count = g.c, incorrect_count = g.w
    from g where at.id = g.attempt_id;
  get diagnostics n = row_count; return n;
end $$;
grant execute on function public.publish_answer_key(bigint, text) to authenticated;

-- Student: own declared results only.
drop function if exists public.get_my_results();
create or replace function public.get_my_results()
returns table(test_id bigint, name text, score numeric, max_score numeric, correct_count int, incorrect_count int, unanswered_count int)
language sql security definer set search_path = public stable as $$
  select distinct on (a.test_id) a.test_id, t.name, a.score, a.max_score, a.correct_count, a.incorrect_count, a.unanswered_count
  from attempts a join tests t on t.id = a.test_id join test_keys k on k.test_id = a.test_id
  where a.user_id = auth.uid() and a.status = 'submitted' and a.score is not null
  order by a.test_id, a.score desc $$;
grant execute on function public.get_my_results() to authenticated;
