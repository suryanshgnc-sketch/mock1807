-- HOTFIX (run once in Supabase SQL Editor, safe to re-run, no data changed):
-- 1) fixes "column reference id is ambiguous" on Start Test / Submit
-- 2) fixes numerical answers being scored wrong (regex escaping)
-- After running, re-publish the answer key once for each already-evaluated test in the admin panel.

drop function if exists public.start_test_attempt(bigint);
create or replace function public.start_test_attempt(p_test_id bigint)
returns table(
  id uuid,
  test_id bigint,
  started_at timestamptz,
  expires_at timestamptz,
  duration_minutes integer,
  total_questions integer,
  positive_marks numeric,
  negative_mcq numeric,
  negative_numerical numeric,
  max_score numeric
)
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  t public.tests%rowtype;
  used_count integer;
  base_limit integer;
  grant_id bigint;
  grant_remaining integer;
  new_id uuid;
  started timestamptz := now();
  expires timestamptz;
begin
  if v_uid is null then raise exception 'Please sign in before starting a test.'; end if;

  select * into t from public.tests where id=p_test_id for update;
  if not found or coalesce(t.enabled,false)=false or coalesce(t.archived,false)=true then
    raise exception 'This test is not available.';
  end if;
  if t.release_at > now() then raise exception 'This test has not started yet.'; end if;
  if exists(select 1 from public.profiles p where p.id=v_uid and coalesce(p.blocked,false)) then
    raise exception 'Your student account is blocked. You cannot start a new test.';
  end if;

  select count(*) into used_count from public.attempts a
  where a.user_id=v_uid and a.test_id=p_test_id and a.status in ('in_progress','submitted');
  base_limit := 1 + coalesce(t.reattempt_limit,0);

  if used_count >= base_limit then
    select g.id,g.remaining into grant_id,grant_remaining
    from public.attempt_grants g
    where g.user_id=v_uid and g.test_id=p_test_id and g.remaining>0
    order by g.created_at asc, g.id asc limit 1 for update;
    if grant_id is null then
      raise exception 'Attempt limit reached. This paper allows % total attempt(s).', base_limit;
    end if;
    update public.attempt_grants set remaining=remaining-1 where id=grant_id;
  end if;

  expires := started + (coalesce(t.duration_minutes,180) * interval '1 minute');
  perform set_config('app.authorized_attempt_start','1',true);
  insert into public.attempts(
    user_id,test_id,status,max_score,started_at,created_at,expires_at,
    duration_minutes_snapshot,total_questions_snapshot,positive_marks_snapshot,
    negative_mcq_snapshot,negative_numerical_snapshot
  ) values (
    v_uid,p_test_id,'in_progress',coalesce(t.total_marks,t.total_questions*coalesce(t.positive_marks,4)),
    started,started,expires,coalesce(t.duration_minutes,180),t.total_questions,
    coalesce(t.positive_marks,4),coalesce(t.negative_mcq,1),coalesce(t.negative_numerical,1)
  ) returning attempts.id into new_id;

  return query select new_id,p_test_id,started,expires,coalesce(t.duration_minutes,180),
    t.total_questions,coalesce(t.positive_marks,4),coalesce(t.negative_mcq,1),
    coalesce(t.negative_numerical,1),coalesce(t.total_marks,t.total_questions*coalesce(t.positive_marks,4));
end; $$;
grant execute on function public.start_test_attempt(bigint) to authenticated;

drop function if exists public.submit_test_attempt(uuid,jsonb);
create or replace function public.submit_test_attempt(p_attempt_id uuid,p_answers jsonb)
returns table(id uuid,status text,submitted_at timestamptz,time_taken_seconds bigint)
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare a public.attempts%rowtype; submitted timestamptz:=now(); elapsed bigint; row jsonb;
begin
  select * into a from public.attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found.'; end if;
  if a.status='submitted' then return query select a.id,a.status,a.submitted_at,a.time_taken_seconds; return; end if;
  if a.status <> 'in_progress' then raise exception 'This attempt cannot be submitted.'; end if;

  -- Final answer write intentionally does NOT reject an expired attempt.
  -- The server records the answers and caps elapsed time at the authoritative expiry.
  for row in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
    insert into public.answers(attempt_id,question_no,response,marked_for_review,answered_at)
    values(a.id,(row->>'question_no')::integer,nullif(row->>'response',''),coalesce((row->>'marked_for_review')::boolean,false),case when nullif(row->>'response','') is null then null else now() end)
    on conflict(attempt_id,question_no) do update set response=excluded.response,marked_for_review=excluded.marked_for_review,answered_at=excluded.answered_at;
  end loop;
  elapsed := greatest(0,extract(epoch from (least(now(),coalesce(a.expires_at,now()))-a.started_at))::bigint);
  update public.attempts set status='submitted',submitted_at=submitted,unanswered_count=greatest(0,coalesce(a.total_questions_snapshot,0)-(select count(*) from public.answers where attempt_id=a.id and response is not null and response<>'')),time_taken_seconds=elapsed where id=a.id;
  return query select a.id,'submitted'::text,submitted,elapsed;
end; $$;
grant execute on function public.submit_test_attempt(uuid,jsonb) to authenticated;

create or replace function public.publish_answer_key(p_test_id bigint,p_key text)
returns integer language plpgsql security definer set search_path=public as $$
declare t public.tests%rowtype; ks text[]; per integer; n integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from public.tests where id=p_test_id;
  if not found then raise exception 'Test not found.'; end if;
  select array_agg(case upper(x) when 'A' then '1' when 'B' then '2' when 'C' then '3' when 'D' then '4' else x end)
    into ks from unnest(regexp_split_to_array(trim(p_key),'[\s,;]+')) x where x<>'';
  if coalesce(array_length(ks,1),0)<>t.total_questions then raise exception 'Key has % answers but the test has % questions',coalesce(array_length(ks,1),0),t.total_questions; end if;
  insert into public.test_keys(test_id,keys) values(p_test_id,ks) on conflict(test_id) do update set keys=excluded.keys,published_at=now();
  perform set_config('app.eval','1',true);
  with g as(
    select an.attempt_id,
      sum(case when (case when ((an.question_no-1)%greatest(coalesce(a.total_questions_snapshot,1)/3,1)) >= greatest(coalesce(a.total_questions_snapshot,1)/3,1)-5 then case when an.response~'^-?\d+(\.\d+)?$' and ks[an.question_no]~'^-?\d+(\.\d+)?$' then abs(an.response::numeric-ks[an.question_no]::numeric)<1e-9 else false end else an.response=ks[an.question_no] end) then 1 else 0 end) c,
      sum(case when an.response is not null and an.response<>'' and not (case when ((an.question_no-1)%greatest(coalesce(a.total_questions_snapshot,1)/3,1)) >= greatest(coalesce(a.total_questions_snapshot,1)/3,1)-5 then case when an.response~'^-?\d+(\.\d+)?$' and ks[an.question_no]~'^-?\d+(\.\d+)?$' then abs(an.response::numeric-ks[an.question_no]::numeric)<1e-9 else false end else an.response=ks[an.question_no] end) then 1 else 0 end) w,
      sum(case when an.response is null or an.response='' then 0 when (case when ((an.question_no-1)%greatest(coalesce(a.total_questions_snapshot,1)/3,1)) >= greatest(coalesce(a.total_questions_snapshot,1)/3,1)-5 then case when an.response~'^-?\d+(\.\d+)?$' and ks[an.question_no]~'^-?\d+(\.\d+)?$' then abs(an.response::numeric-ks[an.question_no]::numeric)<1e-9 else false end else an.response=ks[an.question_no] end) then a.positive_marks_snapshot else -(case when ((an.question_no-1)%greatest(coalesce(a.total_questions_snapshot,1)/3,1)) >= greatest(coalesce(a.total_questions_snapshot,1)/3,1)-5 then a.negative_numerical_snapshot else a.negative_mcq_snapshot end) end) sc
    from public.answers an join public.attempts a on a.id=an.attempt_id
    where a.test_id=p_test_id and a.status='submitted'
    group by an.attempt_id
  )
  update public.attempts a set score=coalesce(g.sc,0),correct_count=g.c,incorrect_count=g.w from g where a.id=g.attempt_id;
  get diagnostics n=row_count; return n;
end; $$;
grant execute on function public.publish_answer_key(bigint,text) to authenticated;
