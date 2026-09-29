# MDCCCVII TESTS — V10.1 FIXED BUILD

This ZIP is the repaired build for the **existing MDCCCVII Supabase database**.

## IMPORTANT — DATABASE

Run **ONLY**:

`DB-MIGRATION-EXISTING-V10.1.sql`

in Supabase → SQL Editor.

It is designed for the existing schema where:

- `attempts.id` is **BIGINT**
- attempt status values are `in_progress`, `submitted`, `abandoned`

It is data-preserving. It does not recreate or delete your tests, attempts, answers, students, scores, or leaderboard data.

The old V10 migration incorrectly treated attempt IDs as UUIDs and attempted to use an unsupported `invalidated` attempt status. This build fixes those mismatches.

### Do NOT run together

Do not run `ADMIN-V6.sql`, `ADMIN-V7.sql`, `KEYS.sql`, `LEADERBOARD.sql`, `SETUP-ALL.sql`, or any other old migration after the fixed migration. They are retained only as historical/reference files.

For convenience, the legacy-named V10 SQL files in this ZIP now contain the same data-safe existing-DB migration, so accidentally opening `MDCCCVII-DB-V10.sql` will not send you back to the broken UUID version.

## What was repaired

- Correct BIGINT attempt RPC signatures.
- Server-authoritative start/resume/expiry.
- Existing in-progress attempts resume instead of duplicating.
- Existing in-progress attempts get an expiry timestamp only when missing.
- Per-attempt marking/duration snapshots.
- Reattempt limits.
- Extra attempt grants.
- Atomic autosave.
- Atomic submission.
- Admin force-submit.
- Admin invalidate → existing `abandoned` status.
- Admin audit log.
- Admin student block/edit.
- Test archive.
- Test analytics.
- First submitted attempt only on leaderboard.
- Per-test leaderboard toggle.
- Existing answer-key evaluation retained.
- Existing test/attempt data preserved.

## Deployment

1. Upload this website.
2. Run `DB-MIGRATION-EXISTING-V10.1.sql` once.
3. Hard refresh the website (`Ctrl+Shift+R`).
4. Open Control Center.
5. Test a small paper with start → answer → refresh → resume → submit.
6. Verify leaderboard/results after publishing the answer key.

The browser timer is only a display. The server's `expires_at` is authoritative.
