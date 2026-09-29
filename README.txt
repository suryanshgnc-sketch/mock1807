# MDCCCVII TESTS — V10

Production-focused CBT + admin control build.

## Database setup

### Fresh Supabase project
Run **`RUN-ALL-SQL-V10.sql`** once in Supabase → SQL Editor.

### Existing MDCCCVII database
Run **`MDCCCVII-DB-V10.sql`** once after your existing setup.

Do not run the files inside `legacy-sql/` for the V10 build; they are retained only for reference.

## V10 fixes

- Server-authoritative test start and expiry timestamps.
- Immutable per-attempt snapshot of duration, question count and marking scheme.
- Server-side answer autosave RPC.
- Server-side atomic submission RPC.
- Server resume from Supabase answers/timer state.
- Expired attempts can still be submitted once, with elapsed time capped by the server.
- Re-attempt limits enforced server-side.
- Per-student extra attempt grants.
- First submitted attempt only is eligible for leaderboard ranking; re-attempts do not create leaderboard entries.
- Per-test leaderboard enable/disable.
- Test archiving instead of destructive deletion.
- Test scoring/question-paper settings lock after the first attempt.
- Admin force-submit and invalidate-attempt controls.
- Admin audit log.
- Admin test analytics and attempt status visibility.
- PWA install button + manifest + service worker.
- MDCCCVII branding/favicon/PWA icons.
- CBT save/connection state indicator.

## Deployment

1. Upload the site files to your static host.
2. Run the SQL above.
3. Hard refresh once after deployment (`Ctrl+Shift+R`) so the V10 service worker replaces the previous cache.
4. Sign in as admin and verify the Control Center.
5. Create a small test and verify start → answer → refresh/resume → submit → result.

## Important

The server is now authoritative for exam time and submission state. The browser timer is only a display.
