# Migration 014 (tasks household-scope) — Apply Runbook

**Status:** staged on branch `feat/tasks-household-scope`. tsc + build pass. Council-reviewed (both lenses BLOCK → all findings fixed). NOT runtime-tested — needs a Supabase branch DB. **IRREVERSIBLE on prod.**

The migration (`supabase/migrations/014_tasks_household_scope.sql`) and the code on this branch **must ship together** — the code injects `household_id` on every insert (NOT NULL), and reads are scoped by household. Deploying one without the other breaks task create/list.

## Council fixes already applied to the migration
- Orphan-duplicate step now requires `assigned_to IS NULL` (matches intent; an assigned task is never silently re-homed).
- `household_members` is backfilled from `profiles.household_id` **before** RLS — prevents the lockout where backfill keys on `profiles.household_id` but RLS keys on `household_members`.
- `DROP POLICY IF EXISTS` added for the four NEW policy names → migration is re-runnable on a branch.
- Code: 5th insert site (`useWeeklyGenerator.applyPlan`) fixed; `tasks.Insert.household_id` made **required** (compile-time guard); `api/seed` "already seeded" check is now per-household.

## Pre-flight (run on a Supabase BRANCH first — Settings → Branches)

### 0. Confirm the schema premise (else 014 errors immediately)
```sql
SELECT to_regclass('public.households') AS households,
       to_regclass('public.household_members') AS household_members,
       to_regclass('public.tasks') AS tasks;
SELECT EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='household_id') AS profiles_has_household_id;
```
All must be non-null / true.

### 1. Baseline counts (record; compare after)
```sql
SELECT count(*) AS total_tasks FROM public.tasks;
SELECT count(*) AS total_households FROM public.households;
SELECT count(*) AS total_completions FROM public.task_completions;
SELECT count(*) AS total_memberships FROM public.household_members;
```

### 2. THE KILLER QUERY — must be 0, or the guard aborts the migration
```sql
SELECT count(*) AS will_trip_guard
FROM public.tasks t
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=t.assigned_to AND p.household_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT tc.task_id FROM public.task_completions tc
      JOIN public.profiles p ON p.id=tc.user_id
      WHERE p.household_id IS NOT NULL
      GROUP BY tc.task_id HAVING count(DISTINCT p.household_id)=1) r
    WHERE r.task_id=t.id)
  AND EXISTS (SELECT 1 FROM public.task_completions tc WHERE tc.task_id=t.id)
  AND (SELECT count(*) FROM public.households) > 0;
SELECT (SELECT count(*) FROM public.households)=0 AS households_empty_will_block_all;
```
If `will_trip_guard > 0` or `households_empty = true` → fix data first (assign those tasks / create the household).

### 3. Run the migration on the branch
Paste `014_tasks_household_scope.sql` into the branch SQL editor. It is wrapped in BEGIN/COMMIT — on any guard failure it rolls back fully (no partial state).

### 4. Prove zero loss + correct scoping (on the branch, after)
```sql
SELECT count(*) FILTER (WHERE household_id IS NULL) AS null_household_after FROM public.tasks; -- MUST be 0
SELECT household_id, count(*) FROM public.tasks GROUP BY household_id ORDER BY 1;
-- Per-user: log in as each of the 2 users in the app, confirm they see their tasks.
```
Total after may be **higher** than baseline (orphan tasks duplicated per household) — never lower than (non-orphans + orphans×households).

### 5. Promote
Merge the Supabase branch to prod, then deploy this code branch to prod **together**. Re-run query #4 on prod.

## Open question for Elad (raised by the migration reviewer)
The live user-facing task surface may be `task_instances` (auto-scheduler), with `public.tasks` possibly a legacy/near-empty catalog. **Confirm `public.tasks` actually holds real user data** (`SELECT count(*) FROM public.tasks`) before treating this as high-stakes. If it's vestigial, this is low-risk; if it's the only copy, the full pre-flight applies.
