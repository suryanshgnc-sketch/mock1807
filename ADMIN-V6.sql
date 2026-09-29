-- MDCCCVII v6 ADMIN CONTROLS
-- Run once in Supabase SQL Editor after the existing setup scripts.

alter table public.profiles add column if not exists blocked boolean not null default false;

create or replace function public.is_current_user_blocked() returns boolean
language sql security definer set search_path=public stable as $$
  select coalesce((select blocked from public.profiles where id=auth.uid()),false);
$$;
grant execute on function public.is_current_user_blocked() to authenticated;

create or replace function public.admin_update_student(p_user_id uuid, p_name text, p_blocked boolean) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set name=trim(p_name), blocked=coalesce(p_blocked,false) where id=p_user_id;
  if not found then raise exception 'Student profile not found'; end if;
  return true;
end $$;
grant execute on function public.admin_update_student(uuid,text,boolean) to authenticated;

create or replace function public.admin_student_snapshot()
returns table(id uuid, name text, photo_url text, created_at timestamptz, blocked boolean, attempts bigint, submitted bigint, best_score numeric, last_activity timestamptz)
language sql security definer set search_path=public stable as $$
  select p.id,p.name,p.photo_url,p.created_at,p.blocked,
    count(a.id), count(a.id) filter(where a.status='submitted'), max(a.score), max(a.created_at)
  from public.profiles p left join public.attempts a on a.user_id=p.id
  where public.is_admin()
  group by p.id,p.name,p.photo_url,p.created_at,p.blocked
  order by max(a.created_at) desc nulls last, p.created_at desc;
$$;
grant execute on function public.admin_student_snapshot() to authenticated;

create or replace function public.guard_blocked_attempts() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if coalesce((select blocked from public.profiles where id=coalesce(new.user_id,auth.uid())),false) then
    raise exception 'This student account is blocked';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_blocked_attempts on public.attempts;
create trigger trg_guard_blocked_attempts before insert on public.attempts for each row execute function public.guard_blocked_attempts();

create or replace function public.admin_test_stats(p_test_id bigint)
returns table(attempts bigint, submitted bigint, avg_score numeric, avg_time_seconds numeric, highest_score numeric)
language sql security definer set search_path=public stable as $$
  select count(*), count(*) filter(where status='submitted'), avg(score) filter(where status='submitted'), avg(time_taken_seconds) filter(where status='submitted'), max(score) filter(where status='submitted')
  from public.attempts where test_id=p_test_id and public.is_admin();
$$;
grant execute on function public.admin_test_stats(bigint) to authenticated;
