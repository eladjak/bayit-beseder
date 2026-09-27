-- BayitBeSeder — Close the LIVE cross-household RLS holes on production
-- (Supabase project uqumzjmyejlhoyliyesu), read directly from the running
-- database on 27.9.2026. See:
-- ~/.claude/workroom/drafts/bayit-live-rls-snapshot-2026-09-27.md
--
-- 018_close_effective_rls_holes.sql targets policy names that do not exist
-- on production (it was written against an older/local schema and was
-- never applied live). This migration (019) is self-contained and
-- idempotent (every DROP is IF EXISTS, every CREATE/REPLACE re-runnable)
-- so it can be applied INSTEAD OF 018.
--
-- The live hole, same shape on 7 tables: three blanket policies per table —
-- "Auth read <table>" SELECT, "Auth update <table>" UPDATE, "Auth write
-- <table>" INSERT — condition (auth.uid() IS NOT NULL), no household check.
-- This Postgres project is SHARED with the "kidushishi" app, so any
-- signed-in user of EITHER app can read/update/insert rows for ANY
-- household on: household_members, households, streaks, task_instances,
-- task_templates, user_achievements, weekly_syncs. Plus a separate hole on
-- task_completions (SELECT true, and two INSERT policies that never check
-- the task's household).
--
-- Each replacement below was chosen after grepping every call site under
-- src/ for anon/authenticated (client) vs service-role usage, so a real
-- client flow is never closed off. See the one-line note per table for
-- what was checked. profiles is additive-only (shared table, see bottom).

BEGIN;

-- 1. household_members. Verified: only client write is UPDATE (role change,
-- members-section.tsx handleChangeRole) within caller's own household.
-- INSERT is service-role only (invite/join route). DELETE has no policy
-- live either, left untouched (out of scope: not a new hole).
DROP POLICY IF EXISTS "Auth read household_members" ON public.household_members;
DROP POLICY IF EXISTS "Auth update household_members" ON public.household_members;
DROP POLICY IF EXISTS "Auth write household_members" ON public.household_members;

CREATE POLICY "Household members can view household_members"
  ON public.household_members FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Household members can update household_members"
  ON public.household_members FOR UPDATE
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

-- 2. households. Verified: INSERT is service-role only (invite route).
-- UPDATE (name/golden_rule_target) is a real client flow, not owner-gated
-- in the app, so scoped to membership not role.
DROP POLICY IF EXISTS "Auth read households" ON public.households;
DROP POLICY IF EXISTS "Auth update households" ON public.households;
DROP POLICY IF EXISTS "Auth write households" ON public.households;

CREATE POLICY "Household members can view households"
  ON public.households FOR SELECT
  USING (public.is_household_member(id));

CREATE POLICY "Household members can update households"
  ON public.households FOR UPDATE
  USING (public.is_household_member(id))
  WITH CHECK (public.is_household_member(id));

-- 3. streaks. Verified: only client reads are own-row (useNotifications.ts,
-- eq user_id=self). No client insert/update anywhere; only service-role
-- cron/agent routes write. Scoped to own row within own household.
DROP POLICY IF EXISTS "Auth read streaks" ON public.streaks;
DROP POLICY IF EXISTS "Auth update streaks" ON public.streaks;
DROP POLICY IF EXISTS "Auth write streaks" ON public.streaks;

CREATE POLICY "Household members can manage streaks"
  ON public.streaks FOR ALL
  USING (public.is_household_member(household_id))
  WITH CHECK (
    public.is_household_member(household_id)
    AND user_id = auth.uid()
  );

-- 4. task_instances. Verified: zero client call sites anywhere in src/;
-- only reader/writer is auto-scheduler.ts via the service-role cron route.
-- No client policy added — default-deny for anon/authenticated.
DROP POLICY IF EXISTS "Auth read task_instances" ON public.task_instances;
DROP POLICY IF EXISTS "Auth update task_instances" ON public.task_instances;
DROP POLICY IF EXISTS "Auth write task_instances" ON public.task_instances;

-- 5. task_templates. Verified: same as task_instances, zero client call
-- sites. No client policy added.
DROP POLICY IF EXISTS "Auth read task_templates" ON public.task_templates;
DROP POLICY IF EXISTS "Auth update task_templates" ON public.task_templates;
DROP POLICY IF EXISTS "Auth write task_templates" ON public.task_templates;

-- 6. user_achievements. Verified: only client reads are own-row
-- (useNotifications.ts, useUserAchievements.ts, both eq user_id=self). No
-- fellow-household display found. No client writes anywhere. SELECT scoped
-- to own row; no INSERT/UPDATE policy added.
DROP POLICY IF EXISTS "Auth read user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Auth update user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Auth write user_achievements" ON public.user_achievements;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- 7. weekly_syncs. Verified: zero call sites anywhere in src/ except the
-- generated type file. No client policy added.
DROP POLICY IF EXISTS "Auth read weekly_syncs" ON public.weekly_syncs;
DROP POLICY IF EXISTS "Auth update weekly_syncs" ON public.weekly_syncs;
DROP POLICY IF EXISTS "Auth write weekly_syncs" ON public.weekly_syncs;

-- 8. task_completions. Drop the open SELECT (the two correct
-- household-scoped SELECT policies stay untouched) and the two INSERT
-- policies that never check the task's household. Verified: the two real
-- client INSERT sites (playlist-player.tsx, tasks/page.tsx) always insert
-- for a task in the caller's own household, so the tightened check does
-- not change their behavior.
DROP POLICY IF EXISTS "Users read completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can insert completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users insert completions" ON public.task_completions;

CREATE POLICY "Users can insert own household completions"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_household_member(t.household_id)
    )
  );

-- 9. profiles — shared with kidushishi. Additive only, no policy dropped or
-- altered. Adds the missing fellow-household SELECT (there is currently no
-- cross-household read policy live at all) and a trigger blocking direct
-- client reassignment of household_id. Verified: both real assignments
-- (invite/join, invite create) use the service role, exempted below. The
-- one client-side attempt to touch another user's household_id
-- (members-section.tsx executeRemove) already fails today under the
-- existing own-row-only UPDATE policies, so this trigger only closes the
-- self-service path, changing no currently-working behavior.
-- No DROP POLICY here on purpose (additive-only, shared table). Idempotency
-- for re-running this migration is handled with an existence check instead
-- of DROP POLICY IF EXISTS, so nothing in this section can ever remove an
-- existing profiles policy, including one this same migration created.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view household member profiles'
  ) THEN
    CREATE POLICY "Users can view household member profiles"
      ON public.profiles FOR SELECT
      USING (
        household_id IS NOT NULL
        AND public.is_household_member(household_id)
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_self_household_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.household_id IS DISTINCT FROM OLD.household_id
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION
      'profiles.household_id cannot be changed directly; use the invite/join or leave-household API';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_household_reassignment ON public.profiles;
CREATE TRIGGER trg_prevent_self_household_reassignment
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_household_reassignment();

COMMIT;
