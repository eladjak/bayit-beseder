-- BayitBeSeder — Close the LIVE cross-household RLS holes on production
-- (Supabase project uqumzjmyejlhoyliyesu), read directly from the running
-- database on 27.9.2026. See:
-- ~/.claude/workroom/drafts/bayit-live-rls-snapshot-2026-09-27.md
--
-- 018_close_effective_rls_holes.sql targets policy names that do not exist
-- on production (it was written against an older/local schema and was
-- never applied live). This migration (019) is self-contained and fully
-- idempotent (every DROP is IF EXISTS, every CREATE POLICY is preceded by
-- a DROP POLICY IF EXISTS of its own name, CREATE OR REPLACE FUNCTION, and
-- DROP TRIGGER IF EXISTS) so it can be applied INSTEAD OF 018 and re-run
-- safely.
--
-- Revision 2 (27.9.2026, adversarial review by Codex): fixed a
-- SECURITY DEFINER bug in the profiles trigger, tightened
-- household_members UPDATE to owner-only + column-scoped, merged
-- task_completions SELECT into one policy, and removed a streaks write
-- policy that had zero real client usage. See the per-section notes below.
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

-- 0. Helper: is_household_owner. Same SECURITY DEFINER pattern as
-- is_household_member (014_tasks_household_scope.sql) so an owner-only
-- policy can check role without a self-referencing subquery on
-- household_members inside its own policy.
CREATE OR REPLACE FUNCTION public.is_household_owner(target_household_id uuid)
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
      AND hm.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_household_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid) TO authenticated;

-- 1. household_members. Verified: the only client write is
-- members-section.tsx handleChangeRole, which sends ONLY `{ role: newRole }`
-- (no user_id/household_id in the payload) — confirmed by reading the call
-- site. Its UI trigger (the kebab menu) is rendered only when
-- `isOwner && !isCurrentUser` (members-section.tsx MemberRow), so the app
-- already restricts role changes to owners; the policy now enforces that
-- server-side via is_household_owner instead of trusting the UI gate.
-- Column-level REVOKE/GRANT closes the identity-swap hole a household-scoped
-- (but column-unrestricted) UPDATE policy would still leave open — without
-- it, an owner could UPDATE user_id or household_id on a row even though
-- the app never asks them to. INSERT stays service-role only (invite/join
-- route). DELETE has no live policy either and is left untouched.
DROP POLICY IF EXISTS "Auth read household_members" ON public.household_members;
DROP POLICY IF EXISTS "Auth update household_members" ON public.household_members;
DROP POLICY IF EXISTS "Auth write household_members" ON public.household_members;

DROP POLICY IF EXISTS "Household members can view household_members" ON public.household_members;
CREATE POLICY "Household members can view household_members"
  ON public.household_members FOR SELECT
  TO authenticated
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "Household members can update household_members" ON public.household_members;
DROP POLICY IF EXISTS "Household owners can update member roles" ON public.household_members;
CREATE POLICY "Household owners can update member roles"
  ON public.household_members FOR UPDATE
  TO authenticated
  USING (public.is_household_owner(household_id))
  WITH CHECK (public.is_household_owner(household_id));

REVOKE UPDATE ON public.household_members FROM authenticated, anon;
GRANT UPDATE (role) ON public.household_members TO authenticated;

-- 2. households. Verified: INSERT is service-role only (invite route).
-- UPDATE (name/golden_rule_target) is a real client flow, not owner-gated
-- in the app (useHousehold.ts / settings/page.tsx have no isOwner check on
-- this path), so scoped to membership, not role.
DROP POLICY IF EXISTS "Auth read households" ON public.households;
DROP POLICY IF EXISTS "Auth update households" ON public.households;
DROP POLICY IF EXISTS "Auth write households" ON public.households;

DROP POLICY IF EXISTS "Household members can view households" ON public.households;
CREATE POLICY "Household members can view households"
  ON public.households FOR SELECT
  TO authenticated
  USING (public.is_household_member(id));

DROP POLICY IF EXISTS "Household members can update households" ON public.households;
CREATE POLICY "Household members can update households"
  ON public.households FOR UPDATE
  TO authenticated
  USING (public.is_household_member(id))
  WITH CHECK (public.is_household_member(id));

-- 3. streaks. Verified: every client read (useNotifications.ts) is
-- `.eq("user_id", user.id)` — own row only. Grepped src/ for INSERT/UPDATE
-- on "streaks" and found NONE — only service-role cron/agent routes write
-- (they bypass RLS entirely). A write policy here would be dead code that
-- widens the attack surface for no real feature, so SELECT only.
DROP POLICY IF EXISTS "Auth read streaks" ON public.streaks;
DROP POLICY IF EXISTS "Auth update streaks" ON public.streaks;
DROP POLICY IF EXISTS "Auth write streaks" ON public.streaks;
DROP POLICY IF EXISTS "Household members can manage streaks" ON public.streaks;

DROP POLICY IF EXISTS "Household members can view streaks" ON public.streaks;
CREATE POLICY "Household members can view streaks"
  ON public.streaks FOR SELECT
  TO authenticated
  USING (public.is_household_member(household_id));

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

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 7. weekly_syncs. Verified: zero call sites anywhere in src/ except the
-- generated type file. No client policy added.
DROP POLICY IF EXISTS "Auth read weekly_syncs" ON public.weekly_syncs;
DROP POLICY IF EXISTS "Auth update weekly_syncs" ON public.weekly_syncs;
DROP POLICY IF EXISTS "Auth write weekly_syncs" ON public.weekly_syncs;

-- 8. task_completions. SELECT: merge the two live household-adjacent
-- policies ("Users can view own completions", "Household can view
-- completions") into ONE policy keyed off the task's household via
-- is_household_member, rather than two separately-maintained OR'd
-- policies. Verified: every read site (dashboard partner completions,
-- activity feed, stats, notifications) only ever needs completions whose
-- task belongs to the caller's own household — own-row is a strict subset
-- of that, so merging does not remove any visibility the app relies on.
-- The live open SELECT ("Users read completions" USING (true)) and the two
-- unscoped INSERT policies are dropped as before.
DROP POLICY IF EXISTS "Users read completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can insert completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users insert completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can view own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Household can view completions" ON public.task_completions;

DROP POLICY IF EXISTS "Household members can view completions" ON public.task_completions;
CREATE POLICY "Household members can view completions"
  ON public.task_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_household_member(t.household_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert own household completions" ON public.task_completions;
CREATE POLICY "Users can insert own household completions"
  ON public.task_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_household_member(t.household_id)
    )
  );

-- 9. profiles — shared with kidushishi. Every policy this migration touches
-- is dropped by ITS OWN exact name only (never an existing kidushishi
-- policy name) before being re-created, so this section is idempotent
-- without ever removing a policy this migration did not itself add.
DROP POLICY IF EXISTS "Users can view household member profiles" ON public.profiles;
CREATE POLICY "Users can view household member profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND public.is_household_member(household_id)
  );

-- profiles.household_id: block direct client reassignment. Fixed from
-- revision 1: the function must be SECURITY INVOKER, not SECURITY DEFINER —
-- under SECURITY DEFINER, current_user inside the function body is the
-- FUNCTION OWNER (whoever ran this migration), never the calling role, so
-- the service_role exemption could never match and every UPDATE — including
-- the legitimate invite/join and invite-create service-role writes — would
-- have been rejected. Under SECURITY INVOKER, current_user is the role
-- PostgREST is actually running as for this request: 'service_role' for the
-- service-role key, 'authenticated' for a normal signed-in user, or
-- 'postgres'/'supabase_admin' for direct dashboard/psql access.
CREATE OR REPLACE FUNCTION public.prevent_self_household_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.household_id IS DISTINCT FROM OLD.household_id
     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
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
