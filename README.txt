MDCCCVII — CHECKED FRONTEND-ONLY PATCH

Replace ONLY these paths:
js/app.js
js/backend-tests.js
js/result-centre.js
css/cbt-pro.css
css/home.css
css/result-centre.css
admin/admin.css

NO SQL files.
NO database schema changes.
NO Supabase RPC/function definitions changed.
NO backend files changed.

Verified:
- JavaScript syntax checks pass for all 3 JS files.
- Fixed student result loader session-scope bug.
- Re-attempt is shown only when another attempt is actually available.
- Existing backend attempt/submission functions are reused.
- CSS/JS patch contains no SQL.

Important: replace files at the exact paths above; do not overwrite other files.

RESULT VISIBILITY PATCH (V11)
-----------------------------
Run sql/STUDENT-RESULTS-PERSISTENCE-V11.sql after the existing result/attempt SQL.
Students can then reopen their submitted test result from any device while signed in.
The Analysis / Result action is independent of the remaining-attempt count; the Re-attempt
button is shown only when another attempt is actually available.
