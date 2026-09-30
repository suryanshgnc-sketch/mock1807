-- MDCCCVII TESTS V14
-- Persistent student result access even before an answer key is published.
-- Safe to run after the existing V10/V11 result functions.

DROP FUNCTION IF EXISTS public.get_my_attempt_result(bigint);

CREATE OR REPLACE FUNCTION public.get_my_attempt_result(p_attempt_id bigint)
RETURNS TABLE(
  attempt_id bigint,
  test_id bigint,
  test_name text,
  submitted_at timestamptz,
  expires_at timestamptz,
  total_questions integer,
  duration_minutes integer,
  positive_marks numeric,
  negative_mcq numeric,
  negative_numerical numeric,
  max_score numeric,
  question_no integer,
  response text,
  marked_for_review boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.test_id,
    t.name,
    a.submitted_at,
    a.expires_at,
    COALESCE(a.total_questions_snapshot,t.total_questions),
    COALESCE(a.duration_minutes_snapshot,t.duration_minutes),
    COALESCE(a.positive_marks_snapshot,t.positive_marks,4),
    COALESCE(a.negative_mcq_snapshot,t.negative_mcq,1),
    COALESCE(a.negative_numerical_snapshot,t.negative_numerical,1),
    COALESCE(a.max_score,t.total_marks),
    q.question_no,
    q.response,
    q.marked_for_review
  FROM public.attempts a
  JOIN public.tests t ON t.id=a.test_id
  LEFT JOIN public.answers q ON q.attempt_id=a.id
  WHERE a.id=p_attempt_id
    AND a.user_id=auth.uid()
    AND a.status='submitted'
  ORDER BY q.question_no;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_attempt_result(bigint) TO authenticated;

NOTIFY pgrst, 'reload schema';
