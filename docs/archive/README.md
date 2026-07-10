# ⚠️ Archive — do not use anything here in live work

Files here are kept for history only. They are NOT part of the running product.

| File | Why archived |
|---|---|
| `001_initial_schema.DECOY.sql` | **Abandoned early schema that does NOT match production.** It already misled one audit. The live schema is `supabase/migrations/001_initial.sql` (+ 002-015). Never run this file. |
| `REPORT-2026-03-22*.html` | Old one-off status reports (March 2026). |
| `local-artifacts/` (untracked) | Old screenshots + one-off debug/guide HTML pages from early phases. Local only, not committed. |

One-off migration runner scripts (`run-migration.mjs`, `try-migration.mjs`, `migrate-via-supabase-js.mjs`, `run-full-migration.mjs`) were deleted in July 2026 — some of them ran the DECOY schema. Migrations are applied manually in the Supabase SQL editor, in file order, from `supabase/migrations/`. See `docs/MIGRATION-014-RUNBOOK.md` for the pattern.
