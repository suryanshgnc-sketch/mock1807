-- ============================================================
-- MDCCCVII TESTS — ADMIN V7
-- Re-attempt limits + leaderboard controls + server enforcement
-- Run once in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS reattempt_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.tests
  DROP CONSTRAINT IF EXISTS tests_reattempt_limit_check;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_reattempt_limit_check
  CHECK (reattempt_limit BETWEEN 0 AND 50);

-- Server-side attempt creation. This is the authoritative gate:
-- reattempt_limit = 0 means one attempt total.
-- reattempt_limit = 2 means up to three total attempts.
CREATE OR REPLACE FUNCTION public.start_test_attempt(p_test_id BIGINT)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_test public.tests%ROWTYPE;
  v_used INTEGER;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in before starting a test.';
  END IF;

  SELECT * INTO v_test
  FROM public.tests
  WHERE tests.id = p_test_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_test.enabled, FALSE) = FALSE THEN
    RAISE EXCEPTION 'This test is not available.';
  END IF;

  IF v_test.release_at > now() THEN
    RAISE EXCEPTION 'This test has not started yet.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = v_uid AND COALESCE(profiles.blocked, FALSE)
  ) THEN
    RAISE EXCEPTION 'Your student account is blocked. You cannot start a new test.';
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM public.attempts
  WHERE user_id = v_uid
    AND test_id = p_test_id
    AND status IN ('in_progress', 'submitted');

  IF v_used >= (1 + COALESCE(v_test.reattempt_limit, 0)) THEN
    RAISE EXCEPTION 'Attempt limit reached. This paper allows % total attempt(s).',
      (1 + COALESCE(v_test.reattempt_limit, 0));
  END IF;

  INSERT INTO public.attempts(
    user_id,
    test_id,
    status,
    max_score,
    started_at,
    created_at
  )
  VALUES(
    v_uid,
    p_test_id,
    'in_progress',
    COALESCE(v_test.total_marks, (v_test.total_questions * COALESCE(v_test.positive_marks,4))),
    now(),
    now()
  )
  RETURNING attempts.id INTO v_id;

  RETURN QUERY SELECT v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_test_attempt(BIGINT) TO authenticated;

-- Keep a direct-insert safety net too, so a client cannot bypass the limit.
CREATE OR REPLACE FUNCTION public.guard_test_attempt_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT COALESCE(reattempt_limit,0) INTO v_limit
  FROM public.tests
  WHERE id = NEW.test_id;

  SELECT COUNT(*) INTO v_used
  FROM public.attempts
  WHERE user_id = NEW.user_id
    AND test_id = NEW.test_id
    AND status IN ('in_progress','submitted');

  IF v_used >= (1 + COALESCE(v_limit,0)) THEN
    RAISE EXCEPTION 'Attempt limit reached for this paper.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_test_attempt_limit ON public.attempts;
CREATE TRIGGER trg_guard_test_attempt_limit
BEFORE INSERT ON public.attempts
FOR EACH ROW
EXECUTE FUNCTION public.guard_test_attempt_limit();

-- Leaderboard rules:
-- 1) Only tests with leaderboard_enabled = true participate.
-- 2) Only the FIRST submitted attempt for each student/test is ranked.
--    Re-attempts remain visible to admins and in the student's results,
--    but do not change leaderboard rankings.
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_test_id BIGINT DEFAULT NULL)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  name TEXT,
  photo_url TEXT,
  score NUMERIC,
  max_score NUMERIC,
  correct_count BIGINT,
  time_taken_seconds BIGINT,
  tests_taken BIGINT,
  is_me BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH ranked_attempts AS (
    SELECT
      a.user_id,
      a.test_id,
      a.score,
      a.max_score,
      COALESCE(a.correct_count,0) AS cc,
      COALESCE(a.time_taken_seconds,0) AS tt,
      ROW_NUMBER() OVER (
        PARTITION BY a.user_id, a.test_id
        ORDER BY a.submitted_at ASC NULLS LAST, a.created_at ASC, a.id ASC
      ) AS attempt_no
    FROM public.attempts a
    JOIN public.tests t ON t.id = a.test_id
    WHERE a.status = 'submitted'
      AND a.score IS NOT NULL
      AND t.enabled = TRUE
      AND COALESCE(t.leaderboard_enabled, TRUE) = TRUE
      AND EXISTS (
        SELECT 1 FROM public.test_keys k
        WHERE k.test_id = a.test_id
      )
      AND (p_test_id IS NULL OR a.test_id = p_test_id)
  ), first_attempts AS (
    SELECT * FROM ranked_attempts WHERE attempt_no = 1
  ), agg AS (
    SELECT
      user_id,
      SUM(score) AS score,
      SUM(max_score) AS max_score,
      SUM(cc) AS cc,
      SUM(tt) AS tt,
      COUNT(*) AS n
    FROM first_attempts
    GROUP BY user_id
  )
  SELECT
    RANK() OVER (ORDER BY g.score DESC, g.tt ASC),
    g.user_id,
    COALESCE(NULLIF(p.name,''),'Student'),
    p.photo_url,
    g.score,
    g.max_score,
    g.cc,
    g.tt,
    g.n,
    g.user_id = auth.uid()
  FROM agg g
  LEFT JOIN public.profiles p ON p.id = g.user_id
  ORDER BY 1, g.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(BIGINT) TO authenticated;

-- ============================================================
-- END
-- ============================================================
