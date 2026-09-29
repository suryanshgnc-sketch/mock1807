MOCK1807 BACKEND FIX — STEP 3

This patch fixes two issues:
1. The question-paper PDF uploaded in Admin was signed but never rendered in the CBT.
2. Test total marks / marking scheme were not stored; the admin test builder now has:
   - Total marks
   - Marks per correct answer
   - Negative marks for MCQ
   - Negative marks for Numerical

FILES TO REPLACE:
- admin/index.html
- admin/admin.js
- js/app.js
- js/backend-tests.js

Run STEP-NEXT.sql once in Supabase SQL Editor before creating NEW tests.
Do NOT replace GTM-PDFS or other files.

For existing tests created before this migration, the database defaults total_marks=300,
positive_marks=4, negative_mcq=1, negative_numerical=1. You can recreate/edit them after
this patch if their marking scheme differs.
