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


## Notes (final build)
- Numerical answers were previously mis-scored by a regex escaping bug; fixed in all V10 SQL. If you already published keys, re-publish each once.
- UI: cinematic layer (intro reel, scroll-scrubbed trailer, 3D tilt cards, confetti on results).

## Attempt id type
`attempts.id` is bigint in existing databases. The V10 SQL now uses bigint for attempt ids, and `HOTFIX-START-TEST-AMBIGUOUS-ID.sql` auto-detects the column type (uuid/bigint/integer) and recreates the functions to match. This fixes `invalid input syntax for type uuid: "17"`.

## FINAL BUILD (V10.2)
1. Fresh Supabase: run `RUN-ALL-SQL-V10.sql`, then `FINAL-PATCH-V10.2.sql`. Existing: only `FINAL-PATCH-V10.2.sql`.
2. Re-publish each answer key once (re-scores old attempts).
3. Read `SQL-BUGS-AND-FIXES.md` (includes the RLS checks to do in your dashboard).
4. Hard refresh after deploying (`Ctrl+Shift+R`).
New UI: live hero console (cursor, typing, palette, live ranking), scroll trailer, tilt cards. CBT: keyboard shortcuts (A-D/1-4, S, M, R, X, arrows), timer alerts at 10/5/1 min, progress bar, offline notice.

## Result Centre (checking page)
- Manual checking, key paste and key-PDF upload are removed. Checking unlocks only when the admin has published the key and the student has submitted the test.
- New RPC `get_answer_key(test_id)` is in `FINAL-PATCH-V10.2.sql` (run the patch again after updating). Students get the key only after submitting; before that it returns null.
- Tests started before this update have no stored test id, so their results page shows the locked state. New attempts work normally.

## Home page motion (gravity)
Hero: headline letters drop and bounce in, 18 neon symbols fall under real 2D physics (gravity, collisions, bounce), drag and throw them, double-click adds more, Zero-G / Reset buttons, cursor spotlight. Blocks lean with scroll speed. Touch devices: fewer symbols, no drag (so page scroll is never blocked). "Reduce motion" turns all of it off. Code: `js/gravity.js`, styles at the end of `css/cinematic.css`.

## UI update (CBT + admin theme, no backend changes)
- `css/cbt-theme.css` is the single theme layer for the exam screen (dark = neon site theme, light via `html[data-theme=light]`). The storage notice and shortcut panel no longer float over the exam; old blue leftovers are overridden.
- Exam PDF now renders in an `<iframe>` with Reload / Open-in-new-tab controls (works on mobile browsers where `<embed>` PDFs do not).
- Settings → "Exam & admin theme" is a real Dark/Light switch (stored in `md_theme`, shared with the admin panel).
- Admin: `pro.css` and `mdcccvii-admin.css` removed; one tokenized `admin/admin.css` (dark/light). Answer-key panel is themed and only shows on the Tests view.
- Admin → Tests: new **Delete forever** button (works on archived tests too). It asks you to type the test name, then deletes the `tests` row (attempts/answers/keys cascade via existing foreign keys) and removes the test's PDFs from storage. No SQL was changed; if your `tests` table has no admin DELETE policy, the admin sees a clear error instead of a silent failure.
