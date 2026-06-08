-- 014_tasks_household_scope.sql
-- STAGED — DO NOT APPLY TO PROD BLIND. Run on a Supabase branch/preview first, verify
-- zero task loss, then prod. Scopes tasks to household + members-only RLS, with backfill
-- and a fail-safe that REFUSES to enable RLS while any null-household task remains.
-- Council-reviewed approach (Codex, 2026-06-06). See docs/CRITICAL-FIX-PLAN-2026-06-06.md.
BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_household_id ON public.tasks(household_id);

-- Backfill 1: from the assignee's household
UPDATE public.tasks t
SET household_id = p.household_id
FROM public.profiles p
WHERE t.household_id IS NULL
  AND t.assigned_to = p.id
  AND p.household_id IS NOT NULL;

-- Backfill 2: from completions, only when they unambiguously point to ONE household
WITH completion_households AS (
  SELECT tc.task_id, MIN(p.household_id::text)::uuid AS household_id
  FROM public.task_completions tc
  JOIN public.profiles p ON p.id = tc.user_id
  WHERE p.household_id IS NOT NULL
  GROUP BY tc.task_id
  HAVING COUNT(DISTINCT p.household_id) = 1
)
UPDATE public.tasks t
SET household_id = ch.household_id
FROM completion_households ch
WHERE t.household_id IS NULL AND t.id = ch.task_id;

-- Reconcile membership BEFORE RLS: RLS keys on household_members, but backfill keys on
-- profiles.household_id. If a profile has a household_id but no membership row, the user
-- would lose visibility of all their (now-scoped) tasks. Seed memberships from profiles.
INSERT INTO public.household_members (household_id, user_id, role)
SELECT p.household_id, p.id,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = p.household_id AND hm.role = 'owner'
  ) THEN 'member' ELSE 'owner' END
FROM public.profiles p
WHERE p.household_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = p.household_id AND hm.user_id = p.id
  )
ON CONFLICT DO NOTHING;

-- Orphan template tasks (no assignee, no completions): duplicate to every household so none lose them.
-- assigned_to IS NULL is required so a task with an assignee is never silently re-homed here.
INSERT INTO public.tasks (household_id, title, description, category_id, assigned_to, status, due_date, points, recurring, created_at)
SELECT h.id, t.title, t.description, t.category_id, NULL, t.status, t.due_date, t.points, t.recurring, t.created_at
FROM public.tasks t
CROSS JOIN public.households h
WHERE t.household_id IS NULL
  AND t.assigned_to IS NULL
  AND EXISTS (SELECT 1 FROM public.households)
  AND NOT EXISTS (SELECT 1 FROM public.task_completions tc WHERE tc.task_id = t.id);

DELETE FROM public.tasks t
WHERE t.household_id IS NULL
  AND t.assigned_to IS NULL
  AND EXISTS (SELECT 1 FROM public.households)
  AND NOT EXISTS (SELECT 1 FROM public.task_completions tc WHERE tc.task_id = t.id);

-- Fail-safe: never enable members-only RLS while orphan tasks remain (would hide them)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tasks WHERE household_id IS NULL) THEN
    RAISE EXCEPTION 'Refusing members-only RLS while null-household tasks remain';
  END IF;
END $$;

ALTER TABLE public.tasks ALTER COLUMN household_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.is_household_member(target_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = target_household_id
      AND hm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
-- Drop the new policy names too, so this migration is safely re-runnable on a branch.
DROP POLICY IF EXISTS "Household members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can delete tasks" ON public.tasks;

CREATE POLICY "Household members can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Household members can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Household members can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Household members can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

COMMIT;
