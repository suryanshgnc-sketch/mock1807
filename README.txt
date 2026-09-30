MDCCCVII — STUDENT RESULTS + EXTRA ATTEMPTS FIX

This patch fixes two student-side issues:

1. STUDENTS can open their submitted test Analysis / Result from their account even when the result was saved on another device. The existing local full analysis is still used when available; otherwise the site fetches a secure post-submission analysis from Supabase without exposing the answer-key table before submission.

2. Extra attempts granted by Admin are reflected on the student's test card as Attempts left and Re-attempt. The existing start_test_attempt() function remains the authority that actually consumes the grant.

FILES:
- js/backend-tests.js
- sql/STUDENT-RESULTS-AND-ATTEMPTS.sql

IMPORTANT:
Run the SQL file ONCE in Supabase SQL Editor. It is additive: it creates only two student-read RPCs and does not replace start_test_attempt, submit_test_attempt, admin_grant_attempt, or scoring functions.

Then replace js/backend-tests.js.

Do not replace app.js, admin files, or any other backend files for this patch.
