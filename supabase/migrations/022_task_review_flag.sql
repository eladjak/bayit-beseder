-- BayitBeSeder - Flag long-overdue tasks for review instead of moving them
--
-- WHY THIS EXISTS:
-- Product decision (Elad, Sept 2026, "gentle rollover"): the nightly planner
-- (src/lib/auto-scheduler.ts) rolls tasks overdue 1-14 days forward to
-- today. Tasks overdue by MORE than 14 days are a different situation --
-- silently bumping something that's been sitting for a month+ to "due
-- today" hides how stale it really is. Instead those tasks are left
-- exactly where they are and flagged, so a person decides what to do with
-- them (still relevant? reschedule? delete?) instead of the cron deciding
-- for them.
--
-- This is a purely additive, backward-compatible change:
--   - New column is NULLABLE with no default (NULL = not flagged), so every
--     existing row is valid immediately -- no backfill needed.
--   - No existing column, table, index, or RLS policy is touched.
--   - RLS: `tasks` already has household-membership-scoped SELECT/INSERT/
--     UPDATE policies (014_tasks_household_scope.sql), which apply to the
--     whole row -- they automatically cover this new column too. No new
--     policy is needed or should be added here.
--   - The cron (service-role key) sets this column; it never clears it.
--     Clearing it back to NULL is a person's decision, made through the UI
--     ("bring back to today" action), which also uses the same RLS-scoped
--     client the rest of the app uses.
--
-- ⚠️ NOT applied to the live database by this file. This is a migration
-- FILE only, per the guarded production-apply process (see
-- 021_household_city.sql for the same pattern). Elad (or an agent
-- explicitly authorized to touch the shared production DB) must run this
-- migration BEFORE the fix/nightly-planner PR that depends on it is merged
-- and deployed -- until it's applied, the cron's UPDATE that sets this
-- column will fail with "column does not exist" for the >14-day bucket
-- (the 1-14-day rollover path does not touch this column and is
-- unaffected).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS flagged_for_review_at timestamptz;

COMMENT ON COLUMN public.tasks.flagged_for_review_at IS
  'Set by the nightly planner cron when a pending/in_progress task has been overdue for more than 14 days, instead of silently moving its due_date. NULL = not flagged. due_date is left untouched when this is set, so it still shows how long the task has actually been overdue. Cleared back to NULL only by a person, via the "bring back to today" action in the tasks UI.';

CREATE INDEX IF NOT EXISTS idx_tasks_needs_review
  ON public.tasks (household_id)
  WHERE flagged_for_review_at IS NOT NULL;
