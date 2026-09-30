-- Run ONCE in Supabase SQL Editor (after V10.2).
-- Students can open the admin's answer-key / solutions PDF for a test as soon as THEY have submitted it.
drop policy if exists pdfs_student_key_read on storage.objects;
create policy pdfs_student_key_read on storage.objects for select to authenticated
using (bucket_id='test-pdfs' and case when name ~ '^tests/[0-9]+/answer-key\.pdf$'
  then exists(select 1 from public.attempts a where a.user_id=auth.uid() and a.status='submitted' and a.test_id=split_part(name,'/',2)::bigint)
  else false end);
notify pgrst, 'reload schema';
