-- BayitBeSeder — Close the effective cross-household RLS holes found in a
-- full-repo scan (26.9.2026), following the pattern 017 already fixed on
-- shopping_items (a permissive "authenticated"/caller-controlled-column
-- fallback policy that Postgres OR's alongside a correct household-scoped
-- one, defeating the correct one).
--
-- IMPORTANT SCOPE NOTE: this migration closes holes found not only in
-- supabase/migrations/*.sql but also in supabase/migration.sql — the
-- original bootstrap schema that created households/household_members and
-- is still the source of their RLS policies (no later numbered migration
-- ever touches those two tables). Its policies are part of the EFFECTIVE
-- policy set today; supabase/consolidated-pending-migrations.sql is a
-- verified duplicate of already-migrated files (004/006/007/008 policy
-- names, confirmed identical) and adds nothing new; docs/archive/
-- 001_initial_schema.DECOY.sql is explicitly marked abandoned/do-not-use
-- and is not part of the live schema — neither is touched here.
--
-- Seven holes, in descending severity:
--
-- 1. public.household_members - "Anyone can join" (FOR INSERT WITH CHECK
--    (user_id = auth.uid())) has NO household check at all. Any signed-in
--    user can self-insert a membership row into ANY existing household
--    (even as role='owner' - the policy does not constrain role either),
--    which then satisfies every downstream "household_id IN (SELECT
--    household_id FROM household_members WHERE user_id = auth.uid())" /
--    is_household_member() check used by tasks, coaching_events,
--    subscriptions, and lets them pass "Owner can update household" too.
--    This is the root-of-trust hole - the most severe one found.
--    Verified: the only real INSERT into household_members in the app
--    (src/app/api/invite/join/route.ts) uses the Supabase service role
--    client, which bypasses RLS entirely - so dropping this client-facing
--    policy breaks nothing real and forces all joins through the
--    invite-code-gated server route, which is the only place that should
--    ever create a membership.
--
-- 2. public.households - "Anyone can create household" (FOR INSERT WITH
--    CHECK (true)) lets any signed-in user insert an arbitrary household
--    row directly (bypassing the server's rate limiting and secure
--    invite-code generation in src/app/api/invite/route.ts). Verified: the
--    only real INSERT into households (same route) also uses the service
--    role client. Dropping this is spam/abuse hardening, not a
--    confidentiality leak on its own, but it feeds hole #1 above (more
--    households to squat on) so it is closed in the same migration.
--
-- 3. public.profiles - "Anyone can view profiles" (FOR SELECT USING
--    (true)) exposes every user's name, avatar, points, streak,
--    household_id and whatsapp_phone (added by 005) to every other
--    authenticated user, regardless of household. Verified: every real
--    query in the app (useProfile.ts, useHouseholdMembers.ts,
--    quick-love-button.tsx, invite/[code]/invite-content.tsx) already
--    filters to `id = auth.uid()` or `.eq("household_id", <own
--    household>)` / `.in("id", <own household's member ids>)` - nothing
--    depends on being able to read a stranger's profile.
--
-- 4. public.profiles - "Users can update own profile" (FOR UPDATE USING
--    (auth.uid() = id), no WITH CHECK given so USING doubles as the
--    check) restricts WHICH ROW can be touched but not WHICH COLUMNS. A
--    user can PATCH their own profile row's household_id to ANY other
--    household's id via the REST API, and because several other tables
--    (shopping_categories, task_categories, love_tokens,
--    surprise_box_opens, wheel_spins, user_medals, meals, meal_plan) key
--    their RLS off "household_id IN (SELECT household_id FROM profiles
--    WHERE id = auth.uid())" rather than household_members, this single
--    self-UPDATE grants full read/write on ALL of those tables for the
--    target household. Verified: src/hooks/useProfile.ts's updateProfile
--    never sends household_id (only display_name/avatar_url/
--    notification_preferences/whatsapp_phone); the two real assignments
--    of profiles.household_id (src/app/api/invite/join/route.ts,
--    src/app/api/invite/route.ts) both use the service role client.
--    Fixed with a BEFORE UPDATE trigger (RLS's WITH CHECK cannot compare
--    NEW to OLD, so a trigger is the correct tool) that rejects a
--    household_id change unless the query is running as the service_role
--    Postgres role - which is what PostgREST uses for service-key
--    requests, and what both legitimate call sites already use.
--
-- 5. public.task_completions - "Users can insert own completions" (FOR
--    INSERT WITH CHECK (auth.uid() = user_id)) checks WHO is inserting but
--    not that task_id belongs to a household they're a member of. Since
--    014_tasks_household_scope.sql made every task's household_id NOT
--    NULL, a user can insert a completion row for a task_id from ANY
--    household. This doesn't leak data by itself but lets a user forge
--    completion history and points against a foreign household's task.
--
-- 6. public.streaks - "Users can update own streaks" (FOR ALL USING
--    (user_id = auth.uid()), no WITH CHECK given so USING doubles as the
--    check) checks WHO but not that household_id is one they belong to. A
--    user can insert a streaks row {user_id: self, household_id: <foreign
--    household>}, which then becomes visible to that foreign household's
--    real members via "Members can view streaks" (household_id IN
--    (SELECT household_id FROM household_members WHERE user_id =
--    auth.uid())) - polluting another household's dashboard with a
--    fabricated row. Verified no client code currently INSERTs into
--    streaks (only SELECTs its own rows), so this is unexploited by the
--    app today but reachable directly via the REST API.
--
-- 7. public.whatsapp_webhook_events - 016_whatsapp_webhook_dedupe.sql
--    creates this table but never runs ALTER TABLE ... ENABLE ROW LEVEL
--    SECURITY. Its own comment says "only ever read/written by the
--    service-role key" - but Supabase's default grants make an
--    RLS-disabled public-schema table reachable by anon/authenticated
--    through PostgREST regardless of that intent, exposing chat_id <->
--    task_id linkage (which phone number completed which household's
--    task) across ALL households. Enabling RLS with no policies makes it
--    default-deny for anon/authenticated while the service role (which
--    bypasses RLS) keeps working exactly as before.
--
-- NOT touched here (flagged as needs-judgment, not a household-isolation
-- hole, see the audit report):
--   - user_medals "Service can insert medals" lets a household member
--     insert a medal row for ANY user_id in their own household (no
--     user_id = auth.uid() check) - same-household forgery, not
--     cross-household.
--   - user_achievements "Users can unlock achievements" lets a user
--     self-unlock any achievement without meeting its threshold - an
--     anti-cheat gap, not a tenant-isolation hole.

-- 1 & 2. household_members / households: drop the two "anyone" policies.
-- Idempotent: DROP POLICY IF EXISTS.

DROP POLICY IF EXISTS "Anyone can join" ON public.household_members;
DROP POLICY IF EXISTS "Anyone can create household" ON public.households;

-- 3. profiles SELECT: replace the open USING (true) with own-row-or-
-- fellow-household-member, using the SECURITY DEFINER helper from
-- 014_tasks_household_scope.sql (avoids any self-referential-policy
-- recursion risk from querying profiles.household_id inside a profiles
-- policy - is_household_member() reads household_members instead).

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view household members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or household member profiles" ON public.profiles;

CREATE POLICY "Users can view own or household member profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );

-- 4. profiles.household_id: block direct client reassignment. Both real
-- assignment sites (invite/join, invite create) use the service role
-- client, which PostgREST/Supabase runs as the Postgres role
-- "service_role" - that role is exempted below.

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

-- 5. task_completions INSERT: require the referenced task to belong to a
-- household the caller is a member of, in addition to the existing
-- "you can only insert as yourself" check.

DROP POLICY IF EXISTS "Users can insert own completions" ON public.task_completions;

CREATE POLICY "Users can insert own completions"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_household_member(t.household_id)
    )
  );

-- 6. streaks: require household_id to be one the caller is a member of,
-- in addition to the existing "you can only touch your own rows" check.
-- Kept as FOR ALL (matching the original policy's command scope) but now
-- with an explicit WITH CHECK so INSERT/UPDATE can't smuggle a foreign
-- household_id in even though USING alone would have let it through.

DROP POLICY IF EXISTS "Users can update own streaks" ON public.streaks;

CREATE POLICY "Users can update own streaks"
  ON public.streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_household_member(household_id)
  );

-- 7. whatsapp_webhook_events: enable RLS. No policies are added: this
-- table is documented (016) as service-role-only, so default-deny for
-- anon/authenticated is exactly the intended behavior; the service role
-- bypasses RLS and is unaffected.

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
