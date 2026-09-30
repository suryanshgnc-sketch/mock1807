# MDCCCVII backend audit: bugs found and status

Run order: `RUN-ALL-SQL-V10.sql` (fresh install only) then **`FINAL-PATCH-V10.2.sql`** (always; safe to re-run).
Existing V10 database: run only `FINAL-PATCH-V10.2.sql`. Then re-publish each answer key once in the admin panel.

## Fixed in FINAL-PATCH-V10.2.sql (tested on Postgres 16, bigint and uuid attempt ids)
| # | Bug | Effect | Fix |
|---|-----|--------|-----|
| 1 | `column reference "id" is ambiguous` in start/submit | Start Test failed | `#variable_conflict use_column` |
| 2 | Attempt ids typed uuid, database uses bigint | `invalid input syntax for type uuid: "17"` | Type auto-detected from `attempts.id` |
| 3 | Regex escapes doubled (`\\d`, `\\s`) | Every numerical answer scored wrong | Correct escapes |
| 4 | Scoring only ran when the key was published | Submitting after the key was live gave no score, no rank | `_score_attempt()` runs on submit, force-submit and publish |
| 5 | Scoring logic duplicated 3x inline | Divergence risk | One function |
| 6 | Expired, never-submitted attempts stayed `in_progress` | Never scored or ranked; counted against attempt limit | `close_expired_attempts()`, called on publish; optional pg_cron line in the patch header |
| 7 | No validation of answer payloads | Out-of-range question numbers, huge strings, huge arrays accepted | Range, length (16) and array (400) limits |
| 8 | No guard on direct `UPDATE attempts` | A student with row access could extend `expires_at`, change status/time | `trg_guard_attempt_update` |
| 9 | No guard on direct writes to `answers` | Answers editable after submit/expiry | `trg_guard_answers_write` |
| 10 | Functions executable by `anon`/PUBLIC | Anonymous RPC access | Revoked; granted to `authenticated` only |
| 11 | `guard_test_version_changes` hard-referenced `paper_url` | Test edits error if the column is missing | `to_jsonb()` comparison |
| 12 | Publishing a key wrote no audit row | No trace of key changes | Audit entry with rescored count |

## Cannot be verified from this repository (check in Supabase)
1. **Row Level Security policies are not in any SQL file.** Confirm RLS is ON for `profiles, tests, attempts, answers, test_keys, attempt_grants, admin_audit_log`, and that `test_keys` has no student SELECT policy. Quick check: `select tablename,rowsecurity from pg_tables where schemaname='public';` and `select * from pg_policies where schemaname='public';`
2. `is_admin()` and `is_current_user_blocked()` are not defined here; confirm they exist and read from a column students cannot edit (profiles UPDATE policy must not allow changing `is_admin`/`blocked`).
3. Base tables (`profiles, tests, attempts, answers`) are not in the repo. Keep a schema dump under version control.

## Known limits (by design, not changed)
- Starting a test when you already have an in-progress attempt returns "attempt limit reached" (it does not silently resume, because that could overwrite saved answers from a fresh browser). Resume from the Resume box on the same device.
- `RUN-ALL-SQL-V10.sql` on a database whose `attempts.id` is uuid prints an error at `get_attempt_resume`; ignore it, the final patch recreates it correctly.
- Numerical questions are the last 5 of each third of the paper (paper split into 3 sections).

## Added for Result Centre
| # | Item | Detail |
|---|------|--------|
| 13 | Students had no safe way to read the key | `get_answer_key(test_id)`: returns the key only if it is published AND the caller has a submitted attempt of that test; null otherwise; anon denied. Tested on bigint and uuid databases. |

## Admin panel: why saving test changes failed (fixed)
| # | Cause | Fix |
|---|-------|-----|
| 14 | After one successful save the "Save / Create" button stayed disabled until page refresh | Button re-enabled whenever the form resets (`admin/admin.js`) |
| 15 | Editing a test that already has attempts re-sent locked fields (duration, marks, question count). The DB lock rejected the whole save, so even a rename failed | Locked tests now send only name, description, release time, re-attempts, leaderboard |
| 16 | The DB lock compared against NULL columns, so filling a blank marks value was rejected | Lock only protects values that already exist |
| 17 | Save silently did nothing if RLS blocked the update (0 rows changed, no error) | Admin now shows "Nothing was saved... check the RLS policy on tests" |
| 18 | Paper-replace failure was ignored | Error is now shown |
Note: duration, question count, marking scheme and paper are intentionally locked once any attempt exists; create a new test for those changes.
