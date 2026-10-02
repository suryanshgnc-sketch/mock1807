-- ============================================================
-- MDCCCVII TESTS — LEADERBOARD ON/OFF SWITCH (admin controlled)
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
-- Does NOT modify any existing table or function.
-- If the setting is missing or anything fails, the site simply
-- keeps showing the leaderboard (fail-open), so nothing can break.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

-- No direct table access from the browser; everything goes through the RPCs below.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_settings(key, value)
VALUES ('leaderboard_visible', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Anyone (logged in or not) can ask "is the leaderboard visible?"
CREATE OR REPLACE FUNCTION public.get_leaderboard_visibility()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (value)::text::boolean FROM public.site_settings WHERE key = 'leaderboard_visible'),
    true
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_visibility() TO anon, authenticated;

-- Only admins / super admins can change it (moderators cannot).
CREATE OR REPLACE FUNCTION public.admin_set_leaderboard_visible(p_visible boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  ) THEN
    EXECUTE 'SELECT role FROM public.profiles WHERE id = $1' INTO v_role USING auth.uid();
    IF v_role = 'moderator' THEN
      RAISE EXCEPTION 'Only admins can show or hide the leaderboard';
    END IF;
  END IF;

  INSERT INTO public.site_settings(key, value, updated_at, updated_by)
  VALUES ('leaderboard_visible', to_jsonb(p_visible), now(), auth.uid())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();

  INSERT INTO public.admin_audit_log(admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(),
          CASE WHEN p_visible THEN 'leaderboard_shown' ELSE 'leaderboard_hidden' END,
          'site_setting', 'leaderboard_visible',
          jsonb_build_object('visible', p_visible));

  RETURN p_visible;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_leaderboard_visible(boolean) TO authenticated;
