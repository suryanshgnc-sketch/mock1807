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
- Re-attempt button is disabled when no attempts remain.
- Existing backend attempt/submission functions are reused.
- CSS/JS patch contains no SQL.

Important: replace files at the exact paths above; do not overwrite other files.
