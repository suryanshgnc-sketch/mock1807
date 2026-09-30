# SQL — run these 9 files, one at a time, in this order
Supabase → SQL Editor → New query → paste file → Run. Wait for "Success" before the next one.
Safe to re-run. Requires your existing `tests`, `attempts`, `answers`, `profiles` tables (already in your project).

| # | File | What it does |
|---|------|--------------|
| 1 | run-in-order/01-core-schema-and-admin-functions.sql | attempt limits, grants, audit log, answer-key table, admin RPCs, block check |
| 2 | run-in-order/02-scoring-attempts-keys.sql | server timer, autosave, submit, scoring, answer key access |
| 3 | run-in-order/03-fix-attempt-id-type.sql | fixes uuid/bigint attempt-id mismatch |
| 4 | run-in-order/04-multiple-correct-and-corrections.sql | multiple-correct mode, corrections PDF access |
| 5 | run-in-order/05-student-result-readers.sql | student result/analysis reader |
| 6 | run-in-order/06-student-result-fallback.sql | result opens even before key is published |
| 7 | run-in-order/07-admin-roles.sql | promote/demote admins |
| 8 | run-in-order/08-admin-hierarchy.sql | owner / admin / moderator hierarchy (oldest existing admin becomes owner automatically) |
| 9 | run-in-order/09-student-access-and-reattempt-FINAL.sql | students see their own results forever + re-attempt rule |

`archive/` = older overlapping scripts. Do NOT run them.
