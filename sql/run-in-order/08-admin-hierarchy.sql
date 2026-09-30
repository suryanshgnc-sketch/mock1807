-- MDCCCVII TESTS — V9 ROLE HIERARCHY
-- Run once AFTER ADMIN-V8-ROLE-MANAGEMENT.sql
-- Existing admins are preserved. The oldest existing admin becomes the immutable owner.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_owner boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student','moderator','admin','super_admin'));

-- Migrate the existing flat admin system into the hierarchy.
UPDATE public.profiles
SET role = CASE
  WHEN COALESCE(is_admin,false) THEN 'admin'
  ELSE 'student'
END
WHERE role = 'student';

-- Preserve the original/oldest admin as the platform owner.
DO $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT id INTO v_owner
  FROM public.profiles
  WHERE COALESCE(is_admin,false) = true
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF v_owner IS NOT NULL THEN
    UPDATE public.profiles
    SET role='super_admin', is_platform_owner=true, is_admin=true
    WHERE id=v_owner;
  END IF;
END $$;

-- Keep the legacy is_admin flag synchronized for all existing code/policies.
UPDATE public.profiles
SET is_admin = (role IN ('moderator','admin','super_admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('moderator','admin','super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  photo_url text,
  created_at timestamptz,
  blocked boolean,
  is_admin boolean,
  role text,
  is_platform_owner boolean,
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
    COALESCE(p.role,'student'),
    COALESCE(p.is_platform_owner,false),
    COUNT(a.id),
    COUNT(a.id) FILTER (WHERE a.status='submitted'),
    MAX(a.created_at)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id=p.id
  LEFT JOIN public.attempts a ON a.user_id=p.id
  WHERE public.is_admin()
  GROUP BY p.id,p.name,u.email,p.photo_url,p.created_at,p.blocked,p.is_admin,p.role,p.is_platform_owner
  ORDER BY
    CASE COALESCE(p.role,'student')
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2
      ELSE 3
    END,
    MAX(a.created_at) DESC NULLS LAST,
    p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_set_role(uuid,text);

CREATE FUNCTION public.admin_set_role(
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_role text;
  v_target_role text;
  v_target_owner boolean;
  v_actor_owner boolean;
BEGIN
  SELECT COALESCE(role,'student'), COALESCE(is_platform_owner,false)
  INTO v_actor_role, v_actor_owner
  FROM public.profiles
  WHERE id=auth.uid();

  IF v_actor_role NOT IN ('super_admin','admin') THEN
    RAISE EXCEPTION 'You do not have permission to change roles.';
  END IF;

  IF p_role NOT IN ('student','moderator','admin') THEN
    RAISE EXCEPTION 'Invalid target role.';
  END IF;

  SELECT COALESCE(role,'student'), COALESCE(is_platform_owner,false)
  INTO v_target_role, v_target_owner
  FROM public.profiles
  WHERE id=p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- The platform owner is immutable through the normal control center.
  IF v_target_owner THEN
    RAISE EXCEPTION 'The platform owner cannot be demoted or removed.';
  END IF;

  -- Nobody can modify themselves through role management.
  IF p_user_id=auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;

  -- Admins may only manage moderators/students, never other admins.
  IF v_actor_role='admin' THEN
    IF v_target_role='super_admin' OR v_target_role='admin' OR p_role='admin' THEN
      RAISE EXCEPTION 'Only the platform owner can manage administrators.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role=p_role,
      is_admin=(p_role IN ('moderator','admin','super_admin'))
  WHERE id=p_user_id;

  INSERT INTO public.admin_audit_log(
    admin_user_id, action, target_type, target_id, details
  )
  VALUES (
    auth.uid(),
    CASE
      WHEN p_role='admin' THEN 'grant_admin'
      WHEN p_role='moderator' THEN 'grant_moderator'
      ELSE 'revoke_staff'
    END,
    'user',
    p_user_id::text,
    jsonb_build_object(
      'previous_role',v_target_role,
      'new_role',p_role,
      'actor_role',v_actor_role
    )
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid,text) TO authenticated;

-- Compatibility wrapper for older UI/code. It now follows the hierarchy.
DROP FUNCTION IF EXISTS public.admin_set_admin(uuid,boolean);

CREATE FUNCTION public.admin_set_admin(
  p_user_id uuid,
  p_make_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN public.admin_set_role(
    p_user_id,
    CASE WHEN p_make_admin THEN 'admin' ELSE 'student' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid,boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
