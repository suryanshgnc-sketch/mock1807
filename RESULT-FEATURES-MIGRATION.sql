-- MDCCCVII result/admin feature migration
-- Run once AFTER FINAL-PATCH-V10.2.sql / current V10 schema.
-- Adds multiple-correct test mode + student-visible key-correction PDF access.

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS multiple_correct boolean NOT NULL DEFAULT false;

-- Admin uploads this exact path when a correction PDF exists:
-- tests/<test_id>/key-corrections.pdf
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='storage') THEN
    DROP POLICY IF EXISTS pdfs_student_correction_read ON storage.objects;
    CREATE POLICY pdfs_student_correction_read
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id='test-pdfs'
        AND name ~ '^tests/[0-9]+/key-corrections\.pdf$'
        AND EXISTS (
          SELECT 1 FROM public.attempts a
          WHERE a.user_id=auth.uid()
            AND a.status='submitted'
            AND a.test_id=split_part(name,'/',2)::bigint
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
