-- ============================================================
-- MDCCCVII TESTS — ADMIN V8
-- Secure administrator management + admin directory
-- Run once in Supabase SQL Editor AFTER your existing V10/V10.1 setup.
-- ============================================================

-- The existing platform already uses public.is_admin() as the authoritative
-- gate. This migration makes the profile role explicit and gives existing
-- admins secure RPCs to manage it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- IMPORTANT: keep this column out of any student-writable UPDATE policy.
-- The RPC below is the only intended way to change it from the application.

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  photo_url text,
  created_at timestamptz,
  blocked boolean,
  is_admin boolean,
  attempts bigint,
  submitted bigint,
  last_activity timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    u.email,
    p.photo_url,
    p.created_at,
    COALESCE(p.blocked,false),
    COALESCE(p.is_admin,false),
    COUNT(a.id),
    COUNT(a.id) FILTER (WHERE a.status='submitted'),
    MAX(a.created_at)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id=p.id
  LEFT JOIN public.attempts a ON a.user_id=p.id
  WHERE public.is_admin()
  GROUP BY p.id,p.name,u.email,p.photo_url,p.created_at,p.blocked,p.is_admin
  ORDER BY COALESCE(p.is_admin,false) DESC, MAX(a.created_at) DESC NULLS LAST, p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_admin(
  p_user_id uuid,
  p_make_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current boolean;
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Do not let an administrator remove their own access from this screen.
  IF p_user_id = auth.uid() AND NOT p_make_admin THEN
    RAISE EXCEPTION 'You cannot remove your own administrator access.';
  END IF;

  SELECT COALESCE(is_admin,false) INTO v_current
  FROM public.profiles
  WHERE id=p_user_id;

  IF v_current = p_make_admin THEN
    RETURN true;
  END IF;

  -- Never allow the platform to become ownerless.
  IF NOT p_make_admin THEN
    SELECT COUNT(*) INTO v_count
    FROM public.profiles
    WHERE COALESCE(is_admin,false)=true;

    IF v_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET is_admin=p_make_admin
  WHERE id=p_user_id;

  INSERT INTO public.admin_audit_log(
    admin_user_id, action, target_type, target_id, details
  ) VALUES (
    auth.uid(),
    CASE WHEN p_make_admin THEN 'grant_admin' ELSE 'revoke_admin' END,
    'user',
    p_user_id::text,
    jsonb_build_object('make_admin',p_make_admin)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid,boolean) TO authenticated;

-- Keep the role column protected from direct student writes if a broad
-- profiles UPDATE policy exists. Review existing policies before enabling
-- this if your project has custom profile-update rules.

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- BOOTSTRAP NOTE
-- If your existing public.is_admin() already recognizes your current
-- administrator, no bootstrap change is needed. The first administrator
-- can then use Control Center → Admins to promote other accounts.
-- ============================================================
