-- ============================================================
-- MDCCCVII FINAL PATCH (V10.2) - run ONCE after RUN-ALL-SQL-V10.sql (or on an existing V10 database). Safe to re-run.
-- Auto-detects attempts.id type (uuid/bigint/integer). Fixes: ambiguous id, uuid-vs-bigint, numeric scoring,
-- late submissions never scored, unvalidated answers, direct attempt/answer tampering, expired attempts never closed, anon RPC access.
-- Optional (if pg_cron is enabled):  select cron.schedule('close-expired','*/5 * * * *','select public.close_expired_attempts()');
-- ============================================================
do $do$
declare idt text; fn text;
begin
  select case data_type when 'uuid' then 'uuid' when 'integer' then 'integer' else 'bigint' end into idt
  from information_schema.columns where table_schema='public' and table_name='attempts' and column_name='id';
  if idt is null then raise exception 'public.attempts.id not found'; end if;
  execute 'drop function if exists public.start_test_attempt(bigint)';
  execute 'drop function if exists public.save_attempt_answers(uuid,jsonb)';
  execute 'drop function if exists public.save_attempt_answers(bigint,jsonb)';
  execute 'drop function if exists public.save_attempt_answers(integer,jsonb)';
  execute 'drop function if exists public.get_attempt_resume(uuid)';
  execute 'drop function if exists public.get_attempt_resume(bigint)';
  execute 'drop function if exists public.get_attempt_resume(integer)';
  execute 'drop function if exists public.submit_test_attempt(uuid,jsonb)';
  execute 'drop function if exists public.submit_test_attempt(bigint,jsonb)';
  execute 'drop function if exists public.submit_test_attempt(integer,jsonb)';
  execute 'drop function if exists public.admin_force_submit(uuid,text)';
  execute 'drop function if exists public.admin_force_submit(bigint,text)';
  execute 'drop function if exists public.admin_force_submit(integer,text)';
  execute 'drop function if exists public.admin_invalidate_attempt(uuid,text)';
  execute 'drop function if exists public.admin_invalidate_attempt(bigint,text)';
  execute 'drop function if exists public.admin_invalidate_attempt(integer,text)';
  execute 'drop function if exists public._score_attempt(uuid)';
  execute 'drop function if exists public._score_attempt(bigint)';
  execute 'drop function if exists public._score_attempt(integer)';
  fn := $f$create or replace function public.start_test_attempt(p_test_id bigint)
returns table(
  id {ID},
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
  new_id {ID};
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

create or replace function public.save_attempt_answers(p_attempt_id {ID},p_answers jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare a public.attempts%rowtype; row jsonb;
begin
  select * into a from public.attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found.'; end if;
  if a.status <> 'in_progress' then raise exception 'This attempt is already closed.'; end if;
  if a.expires_at is not null and a.expires_at <= now() then raise exception 'The exam time has expired.'; end if;
  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_answers,'[]'::jsonb))>400 then raise exception 'Invalid answers payload.'; end if;
  for row in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
    continue when (row->>'question_no') is null or (row->>'question_no')::integer<1 or (row->>'question_no')::integer>coalesce(a.total_questions_snapshot,300) or length(coalesce(row->>'response',''))>16;
    insert into public.answers(attempt_id,question_no,response,marked_for_review,answered_at)
    values(a.id,(row->>'question_no')::integer,nullif(row->>'response',''),coalesce((row->>'marked_for_review')::boolean,false),case when nullif(row->>'response','') is null then null else now() end)
    on conflict(attempt_id,question_no) do update set response=excluded.response,marked_for_review=excluded.marked_for_review,answered_at=excluded.answered_at;
  end loop;
  return true;
end; $$;
grant execute on function public.save_attempt_answers({ID},jsonb) to authenticated;

create or replace function public.get_attempt_resume(p_attempt_id {ID})
returns table(
  id {ID},test_id bigint,status text,started_at timestamptz,expires_at timestamptz,
  duration_minutes integer,total_questions integer,positive_marks numeric,negative_mcq numeric,
  negative_numerical numeric,answers jsonb
)
language sql security definer set search_path=public stable as $$
select a.id,a.test_id,a.status,a.started_at,a.expires_at,a.duration_minutes_snapshot,
       a.total_questions_snapshot,a.positive_marks_snapshot,a.negative_mcq_snapshot,
       a.negative_numerical_snapshot,
       coalesce((select jsonb_agg(jsonb_build_object('question_no',x.question_no,'response',x.response,'marked_for_review',x.marked_for_review) order by x.question_no) from public.answers x where x.attempt_id=a.id),'[]'::jsonb)
from public.attempts a
where a.id=p_attempt_id and a.user_id=auth.uid() and a.status='in_progress';
$$;
grant execute on function public.get_attempt_resume({ID}) to authenticated;

create or replace function public.submit_test_attempt(p_attempt_id {ID},p_answers jsonb)
returns table(id {ID},status text,submitted_at timestamptz,time_taken_seconds bigint)
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare a public.attempts%rowtype; submitted timestamptz:=now(); elapsed bigint; row jsonb;
begin
  select * into a from public.attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found.'; end if;
  if a.status='submitted' then return query select a.id,a.status,a.submitted_at,a.time_taken_seconds; return; end if;
  if a.status <> 'in_progress' then raise exception 'This attempt cannot be submitted.'; end if;
  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_answers,'[]'::jsonb))>400 then raise exception 'Invalid answers payload.'; end if;
  for row in select * from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
    continue when (row->>'question_no') is null or (row->>'question_no')::integer<1 or (row->>'question_no')::integer>coalesce(a.total_questions_snapshot,300) or length(coalesce(row->>'response',''))>16;
    insert into public.answers(attempt_id,question_no,response,marked_for_review,answered_at)
    values(a.id,(row->>'question_no')::integer,nullif(row->>'response',''),coalesce((row->>'marked_for_review')::boolean,false),case when nullif(row->>'response','') is null then null else now() end)
    on conflict(attempt_id,question_no) do update set response=excluded.response,marked_for_review=excluded.marked_for_review,answered_at=excluded.answered_at;
  end loop;
  elapsed := greatest(0,extract(epoch from (least(now(),coalesce(a.expires_at,now()))-a.started_at))::bigint);
  update public.attempts set status='submitted',submitted_at=submitted,unanswered_count=greatest(0,coalesce(a.total_questions_snapshot,0)-(select count(*) from public.answers where attempt_id=a.id and response is not null and response<>'')),time_taken_seconds=elapsed where id=a.id;
  perform public._score_attempt(a.id);
  return query select a.id,'submitted'::text,submitted,elapsed;
end; $$;
grant execute on function public.submit_test_attempt({ID},jsonb) to authenticated;

create or replace function public.admin_force_submit(p_attempt_id {ID},p_reason text default null)
returns boolean language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.attempts set status='submitted',submitted_at=coalesce(submitted_at,now()),time_taken_seconds=greatest(0,extract(epoch from (least(now(),coalesce(expires_at,now()))-started_at))::bigint) where id=p_attempt_id and status='in_progress';
  perform public._score_attempt(p_attempt_id);
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details) values(auth.uid(),'force_submit','attempt',p_attempt_id::text,jsonb_build_object('reason',p_reason));
  return true;
end; $$;
grant execute on function public.admin_force_submit({ID},text) to authenticated;

create or replace function public.admin_invalidate_attempt(p_attempt_id {ID},p_reason text default null)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.attempts set status='invalidated' where id=p_attempt_id;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details) values(auth.uid(),'invalidate_attempt','attempt',p_attempt_id::text,jsonb_build_object('reason',p_reason));
  return true;
end; $$;
grant execute on function public.admin_invalidate_attempt({ID},text) to authenticated;

create or replace function public._score_attempt(p_attempt_id {ID}) returns void
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare a public.attempts%rowtype; ks text[]; per integer; c integer:=0; w integer:=0; sc numeric:=0; r record; isnum boolean; ok boolean; pos numeric; nm numeric; nn numeric;
begin
  select * into a from public.attempts where id=p_attempt_id;
  if not found or a.status<>'submitted' then return; end if;
  select keys into ks from public.test_keys where test_id=a.test_id;
  if ks is null then return; end if;
  per:=greatest(coalesce(a.total_questions_snapshot,array_length(ks,1))/3,1);
  pos:=coalesce(a.positive_marks_snapshot,4); nm:=coalesce(a.negative_mcq_snapshot,1); nn:=coalesce(a.negative_numerical_snapshot,1);
  for r in select question_no,response from public.answers where attempt_id=p_attempt_id and response is not null and response<>'' loop
    continue when r.question_no<1 or r.question_no>array_length(ks,1);
    isnum:=((r.question_no-1)%per)>=per-5;
    if isnum then
      ok:=case when r.response ~ '^-?\d+(\.\d+)?$' and ks[r.question_no] ~ '^-?\d+(\.\d+)?$' then abs(r.response::numeric-ks[r.question_no]::numeric)<1e-9 else false end;
    else ok:=(r.response=ks[r.question_no]); end if;
    if ok then c:=c+1; sc:=sc+pos; else w:=w+1; sc:=sc-(case when isnum then nn else nm end); end if;
  end loop;
  perform set_config('app.eval','1',true);
  update public.attempts set score=sc,correct_count=c,incorrect_count=w where id=p_attempt_id;
end; $$;
revoke all on function public._score_attempt({ID}) from public,anon,authenticated;

$f$;
  execute replace(fn,'{ID}',idt);
end $do$;

create or replace function public.close_expired_attempts() returns integer
language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare r record; n integer:=0;
begin
  for r in select id from public.attempts where status='in_progress' and expires_at is not null and expires_at < now()-interval '3 minutes' loop
    update public.attempts set status='submitted',submitted_at=coalesce(submitted_at,expires_at),time_taken_seconds=greatest(0,extract(epoch from (expires_at-started_at))::bigint),
      unanswered_count=greatest(0,coalesce(total_questions_snapshot,0)-(select count(*) from public.answers where attempt_id=attempts.id and response is not null and response<>'')) where id=r.id;
    perform public._score_attempt(r.id); n:=n+1;
  end loop; return n;
end; $$;
revoke all on function public.close_expired_attempts() from public,anon;
grant execute on function public.close_expired_attempts() to authenticated;

create or replace function public.publish_answer_key(p_test_id bigint,p_key text)
returns integer language plpgsql security definer set search_path=public as $$
#variable_conflict use_column
declare t public.tests%rowtype; ks text[]; n integer:=0; r record;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from public.tests where id=p_test_id;
  if not found then raise exception 'Test not found.'; end if;
  select array_agg(case upper(x) when 'A' then '1' when 'B' then '2' when 'C' then '3' when 'D' then '4' else x end)
    into ks from unnest(regexp_split_to_array(trim(p_key),'[\s,;]+')) x where x<>'';
  if coalesce(array_length(ks,1),0)<>t.total_questions then raise exception 'Key has % answers but the test has % questions',coalesce(array_length(ks,1),0),t.total_questions; end if;
  insert into public.test_keys(test_id,keys) values(p_test_id,ks) on conflict(test_id) do update set keys=excluded.keys,published_at=now();
  perform public.close_expired_attempts();
  for r in select id from public.attempts where test_id=p_test_id and status='submitted' loop perform public._score_attempt(r.id); n:=n+1; end loop;
  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,details) values(auth.uid(),'publish_key','test',p_test_id::text,jsonb_build_object('rescored',n));
  return n;
end; $$;
grant execute on function public.publish_answer_key(bigint,text) to authenticated;


-- NOTE: guard triggers are SECURITY INVOKER on purpose: inside RPC (definer) functions current_user is the owner, so they are exempt.
-- Students may not edit protected attempt columns or write answers directly (RPC functions run as owner and are exempt).
create or replace function public.guard_attempt_update() returns trigger language plpgsql set search_path=public as $$
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    if new.status is distinct from old.status or new.expires_at is distinct from old.expires_at or new.started_at is distinct from old.started_at
       or new.submitted_at is distinct from old.submitted_at or new.time_taken_seconds is distinct from old.time_taken_seconds
       or new.user_id is distinct from old.user_id or new.test_id is distinct from old.test_id or new.max_score is distinct from old.max_score
       or new.duration_minutes_snapshot is distinct from old.duration_minutes_snapshot or new.total_questions_snapshot is distinct from old.total_questions_snapshot
       or new.positive_marks_snapshot is distinct from old.positive_marks_snapshot or new.negative_mcq_snapshot is distinct from old.negative_mcq_snapshot
       or new.negative_numerical_snapshot is distinct from old.negative_numerical_snapshot then
      raise exception 'Attempt fields are server-controlled.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_attempt_update on public.attempts;
create trigger trg_guard_attempt_update before update on public.attempts for each row execute function public.guard_attempt_update();

create or replace function public.guard_answers_write() returns trigger language plpgsql set search_path=public as $$
declare a public.attempts%rowtype; aid text;
begin
  if current_user in ('authenticated','anon') and not public.is_admin() then
    aid:=coalesce(to_jsonb(new)->>'attempt_id',to_jsonb(old)->>'attempt_id');
    select * into a from public.attempts x where x.id::text=aid;
    if not found or a.user_id is distinct from auth.uid() or a.status<>'in_progress' or (a.expires_at is not null and a.expires_at<=now()) then
      raise exception 'Answers can only be changed through the secure test flow.';
    end if;
  end if;
  return coalesce(new,old);
end; $$;
drop trigger if exists trg_guard_answers_write on public.answers;
create trigger trg_guard_answers_write before insert or update or delete on public.answers for each row execute function public.guard_answers_write();

create or replace function public.guard_test_version_changes() returns trigger language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  select count(*) into n from public.attempts where test_id=old.id;
  if n>0 and (new.duration_minutes is distinct from old.duration_minutes or new.total_questions is distinct from old.total_questions or new.total_marks is distinct from old.total_marks
    or new.positive_marks is distinct from old.positive_marks or new.negative_mcq is distinct from old.negative_mcq or new.negative_numerical is distinct from old.negative_numerical
    or (to_jsonb(new)->>'paper_url') is distinct from (to_jsonb(old)->>'paper_url')) then
    raise exception 'This test already has attempts. Scoring settings and question paper are locked. Create a new test/version instead.';
  end if;
  return new;
end; $$;

-- Lock down function execution: no anonymous access.
do $r$ declare x record; begin
  for x in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
   ('start_test_attempt','save_attempt_answers','get_attempt_resume','submit_test_attempt','get_leaderboard','get_my_results','publish_answer_key','admin_update_student','admin_grant_attempt','admin_force_submit','admin_invalidate_attempt','admin_archive_test','admin_test_stats','admin_audit')
  loop execute 'revoke all on function '||x.sig||' from public, anon'; execute 'grant execute on function '||x.sig||' to authenticated'; end loop;
end $r$;
