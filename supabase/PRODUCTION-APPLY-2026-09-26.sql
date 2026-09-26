-- -----------------------------------------------------------------------------
-- BayitBeSeder -- PRODUCTION APPLY, 2026-09-26
-- -----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and run it top to bottom,
-- OR run it section by section (see instructions in the PR / handoff note).
--
-- Ports migrations 015 (meals v1, final version from PR #8), 016 (WhatsApp
-- webhook dedupe table), 017 (shopping_items cross-household INSERT hole) and
-- 018 (7 more RLS holes found in a full-repo scan) into one guarded,
-- idempotent, transactional script.
--
-- It does NOT assume any earlier numbered migration (001-014) already ran in
-- production. Every DDL statement below is written to be safe to run twice.
-- Section 2 additionally checks, before touching anything, that the specific
-- prerequisites 018 depends on (014's is_household_member() function and
-- tasks.household_id) actually exist -- if they don't, the whole transaction
-- aborts with a clear error instead of half-applying.
--
-- Structure:
--   Section 0 -- READ-ONLY preflight. Run this FIRST, on its own. It only
--               SELECTs; it changes nothing. Read its output before deciding
--               to proceed to Section 1/2.
--   Section 1 -- Backup: snapshots current policy definitions into a table,
--               so Section 4 (rollback) has something to restore from.
--   Section 2 -- The actual migration, in ONE transaction (BEGIN...COMMIT).
--               If anything inside fails, Postgres rolls back the whole
--               transaction automatically -- nothing is half-applied.
--   Section 3 -- Read-only verification queries to run AFTER Section 2.
--   Section 4 -- ROLLBACK script, commented out. Only uncomment and run this
--               if Section 2 needs to be undone. Read it before running it.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- SECTION 0 -- READ-ONLY PREFLIGHT (run first, by itself, changes nothing)
-- -----------------------------------------------------------------------------

-- 0.1 Which of the tables this script touches already exist?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'households', 'household_members', 'tasks', 'task_completions',
    'streaks', 'shopping_items', 'whatsapp_webhook_events', 'meals', 'meal_plan'
  )
order by table_name;

-- 0.2 Does tasks.household_id exist, and is it NOT NULL? (018 hard-depends on
-- this being true -- it was migration 014's job to make it so.)
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tasks' and column_name = 'household_id';

-- 0.3 Does public.is_household_member(uuid) exist? (created by 014; 018 calls it)
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname = 'is_household_member' and pronamespace = 'public'::regnamespace;

-- 0.4 Does profiles.household_id exist? (015's meal RLS and 018's profile
-- policies both key off it)
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'household_id';

-- 0.5 Current policies on every table this script will touch -- read this
-- before running Section 2, so you know what "before" looks like.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'households', 'household_members', 'tasks', 'task_completions',
    'streaks', 'shopping_items', 'whatsapp_webhook_events', 'meals', 'meal_plan'
  )
order by tablename, policyname;

-- 0.6 Has any of 014/015/016/017/018 already landed, in whole or in part?
-- (each row here is a yes/no signal, not a full diff -- read row-by-row)
select
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='tasks' and column_name='household_id')
    as tasks_household_id_column_exists,
  exists (select 1 from pg_policies
          where schemaname='public' and tablename='household_members' and policyname='Anyone can join')
    as m018_hole1_still_open,
  exists (select 1 from pg_policies
          where schemaname='public' and tablename='households' and policyname='Anyone can create household')
    as m018_hole2_still_open,
  exists (select 1 from pg_policies
          where schemaname='public' and tablename='profiles' and policyname='Anyone can view profiles')
    as m018_hole3_still_open,
  exists (select 1 from pg_trigger
          where tgname='trg_prevent_self_household_reassignment')
    as m018_hole4_trigger_exists,
  exists (select 1 from information_schema.tables
          where table_schema='public' and table_name='whatsapp_webhook_events')
    as m016_table_exists,
  exists (select 1 from pg_policies
          where schemaname='public' and tablename='shopping_items'
            and policyname='Authenticated users can insert items')
    as m017_hole_still_open,
  exists (select 1 from information_schema.tables
          where table_schema='public' and table_name='meals')
    as m015_meals_table_exists,
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='meals' and column_name='ingredients')
    as m015_meals_ingredients_column_exists;


-- -----------------------------------------------------------------------------
-- SECTION 1 -- BACKUP (run once, before Section 2)
-- -----------------------------------------------------------------------------
-- Snapshot of every current policy definition in the public schema. This is
-- what Section 4's rollback reads from. IF NOT EXISTS is deliberate: if you
-- ever have to re-run this whole script after a failed/partial attempt, this
-- keeps the ORIGINAL pre-migration snapshot instead of overwriting it with an
-- already-half-migrated state.

create table if not exists public._policy_backup_20260926 as
select *, now() as _backed_up_at
from pg_policies
where schemaname = 'public';

comment on table public._policy_backup_20260926 is
  'One-time snapshot of pg_policies taken 2026-09-26 before PRODUCTION-APPLY-2026-09-26.sql ran. Used by that script''s Section 4 rollback. Safe to drop once the migration is confirmed good and stable.';


-- -----------------------------------------------------------------------------
-- SECTION 2 -- THE MIGRATION (one transaction: migrations 015, 016, 017, 018)
-- -----------------------------------------------------------------------------

BEGIN;

-- 2.0 Prerequisite guard -- refuse to run 018's content if 014 never landed.
-- Fails loudly and rolls back the ENTIRE transaction (015/016/017 included)
-- rather than applying some migrations and silently skipping others.

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.profiles does not exist. This script assumes the base schema (supabase/migration.sql) is already applied.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'households'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.households does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'household_members'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.household_members does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.tasks does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_completions'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.task_completions does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'streaks'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.streaks does not exist.';
  END IF;

  -- 018's task_completions and streaks policies call public.is_household_member(uuid),
  -- created by migration 014. If 014 never ran, this migration would create
  -- policies that reference a function that does not exist and every
  -- affected query would start failing at runtime with "function does not exist".
  IF to_regprocedure('public.is_household_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.is_household_member(uuid) does not exist. Migration 014_tasks_household_scope.sql must run first (it defines this function and makes tasks.household_id NOT NULL). Run 014 on its own, verify it, then re-run this script.';
  END IF;

  -- 018's task_completions policy joins tasks.household_id and assumes it is
  -- always populated (NOT NULL). If it's nullable/missing, that policy would
  -- silently block every completion insert on a null-household task instead
  -- of the "cannot forge a foreign household's task" protection it's meant to be.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'household_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'PRODUCTION-APPLY-2026-09-26 aborted: public.tasks.household_id is missing or nullable. Migration 014_tasks_household_scope.sql must run first and complete (it backfills household_id and sets it NOT NULL). Run 014 on its own, verify it, then re-run this script.';
  END IF;
END
$guard$;

-- 2.1 Migration 015 -- meal planner v1 (final content from PR #8,
-- feat/meal-planner-v1, commit 7780600). Made idempotent here by adding
-- DROP POLICY IF EXISTS guards before every CREATE POLICY -- the original
-- file's own comment claims re-runnability but its CREATE POLICY statements
-- were not actually guarded; this closes that gap for a script that may be
-- re-run after a partial/failed attempt.

-- 1. MEALS -- the rotation repertoire

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  who_eats TEXT[] NOT NULL DEFAULT '{}',
  prep_lead_hours INT NOT NULL DEFAULT 0 CHECK (prep_lead_hours BETWEEN 0 AND 72),
  prep_note TEXT CHECK (length(prep_note) <= 200),
  min_repeat_days INT NOT NULL DEFAULT 3 CHECK (min_repeat_days BETWEEN 0 AND 30),
  tags TEXT[] NOT NULL DEFAULT '{}',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_served_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent guard: if an earlier, narrower version of this table was already
-- applied on some branch (before `ingredients` existed), add it now.
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_meals_household_active
  ON public.meals(household_id, active);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can view meals" ON public.meals;
CREATE POLICY "Household members can view meals"
  ON public.meals FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Household members can manage meals" ON public.meals;
CREATE POLICY "Household members can manage meals"
  ON public.meals FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 2. MEAL_PLAN -- the agreed week (date x meal)

CREATE TABLE IF NOT EXISTS public.meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'prepped', 'cooked', 'skipped', 'leftovers')),
  note TEXT CHECK (length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_meal_plan_household_date UNIQUE (household_id, plan_date)
);

-- Idempotent guards for branches that already had the narrower, pre-2026-09-25 shape.
ALTER TABLE public.meal_plan ALTER COLUMN meal_id DROP NOT NULL;
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_status_check;
ALTER TABLE public.meal_plan
  ADD CONSTRAINT meal_plan_status_check
  CHECK (status IN ('planned', 'prepped', 'cooked', 'skipped', 'leftovers'));
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_meal_id_fkey;
ALTER TABLE public.meal_plan
  ADD CONSTRAINT meal_plan_meal_id_fkey
  FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plan_household_date
  ON public.meal_plan(household_id, plan_date);

ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can view meal plan" ON public.meal_plan;
CREATE POLICY "Household members can view meal plan"
  ON public.meal_plan FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Household members can manage meal plan" ON public.meal_plan;
CREATE POLICY "Household members can manage meal plan"
  ON public.meal_plan FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Note: agent routes (/api/agent/*) use the service role and bypass RLS by
-- design (Bearer key + explicit householdId scoping in code), same as the
-- existing brief/task endpoints.


-- 2.2 Migration 016 -- WhatsApp webhook idempotency table

create table if not exists public.whatsapp_webhook_events (
  id_message text primary key,
  chat_id text not null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_webhook_events is
  'One row per Green API webhook delivery (keyed by idMessage) that successfully completed a task via reply-to-complete. Used to reject redelivered/duplicate webhooks for the same message. Not RLS-protected by policy content: only ever read/written by the service-role key from the webhook route, and default-deny for anon/authenticated once RLS is enabled by migration 018.';


-- 2.3 Migration 017 -- close cross-household INSERT hole on shopping_items

DROP POLICY IF EXISTS "Authenticated users can manage own items" ON public.shopping_items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.shopping_items;
DROP POLICY IF EXISTS "Members can manage shopping items" ON public.shopping_items;

CREATE POLICY "Members can manage shopping items" ON public.shopping_items
  FOR ALL USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );


-- 2.4 Migration 018 -- close 7 effective cross-household RLS holes

-- 1 & 2. household_members / households: drop the two "anyone" policies.
DROP POLICY IF EXISTS "Anyone can join" ON public.household_members;
DROP POLICY IF EXISTS "Anyone can create household" ON public.households;

-- 3. profiles SELECT: replace the open USING (true) with own-row-or-
-- fellow-household-member.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view household members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or household member profiles" ON public.profiles;

CREATE POLICY "Users can view own or household member profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );

-- 4. profiles.household_id: block direct client reassignment via trigger
-- (RLS's WITH CHECK cannot compare NEW to OLD).
CREATE OR REPLACE FUNCTION public.prevent_self_household_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NEW.household_id IS DISTINCT FROM OLD.household_id
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION
      'profiles.household_id cannot be changed directly; use the invite/join or leave-household API';
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_prevent_self_household_reassignment ON public.profiles;
CREATE TRIGGER trg_prevent_self_household_reassignment
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_household_reassignment();

-- 5. task_completions INSERT: require the referenced task to belong to a
-- household the caller is a member of.
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

-- 6. streaks: require household_id to be one the caller is a member of.
DROP POLICY IF EXISTS "Users can update own streaks" ON public.streaks;

CREATE POLICY "Users can update own streaks"
  ON public.streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_household_member(household_id)
  );

-- 7. whatsapp_webhook_events: enable RLS. No policies added -- this table is
-- service-role-only by design; default-deny for anon/authenticated is correct.
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

COMMIT;


-- -----------------------------------------------------------------------------
-- SECTION 3 -- VERIFICATION (run after Section 2 commits)
-- -----------------------------------------------------------------------------

-- 3.1 Policies after -- compare against the 0.5 snapshot you took before.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'households', 'household_members', 'tasks', 'task_completions',
    'streaks', 'shopping_items', 'whatsapp_webhook_events', 'meals', 'meal_plan'
  )
order by tablename, policyname;

-- 3.2 New objects exist and are correctly shaped.
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='meals') as meals_table_exists,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='meal_plan') as meal_plan_table_exists,
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='whatsapp_webhook_events') as webhook_events_table_exists,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='household_members' and policyname='Anyone can join') as hole1_still_open_should_be_0,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='households' and policyname='Anyone can create household') as hole2_still_open_should_be_0,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='profiles' and policyname='Anyone can view profiles') as hole3_still_open_should_be_0,
  (select count(*) from pg_trigger
     where tgname='trg_prevent_self_household_reassignment') as hole4_trigger_should_be_1,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='shopping_items'
       and policyname='Authenticated users can insert items') as m017_hole_still_open_should_be_0,
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public' and c.relname='whatsapp_webhook_events' and c.relrowsecurity) as webhook_events_rls_enabled_should_be_1;

-- 3.3 Row counts on the new tables (sanity check -- should be 0 right after a
-- fresh apply; nonzero only if the app has already been used since).
select
  (select count(*) from public.meals) as meals_count,
  (select count(*) from public.meal_plan) as meal_plan_count,
  (select count(*) from public.whatsapp_webhook_events) as webhook_events_count;


-- -----------------------------------------------------------------------------
-- SECTION 4 -- ROLLBACK (commented out -- read fully before uncommenting)
-- -----------------------------------------------------------------------------
-- Restores the policies that Section 1 backed up, on every table 017/018
-- touched, and reverts the 018 trigger. Then optionally drops the new meal
-- tables (015) -- ONLY if they are still empty, so this never discards real
-- user data. whatsapp_webhook_events (016) is left in place with RLS
-- disabled again (back to its original unprotected-but-functional shape);
-- it is not dropped because 016's own comment documents it as safe to have
-- existed all along, dedupe rows are legitimate operational data.
--
-- This does NOT run automatically. Uncomment the whole block (remove the
-- /* and */ ) and run it manually if you need to undo Section 2.

/*
BEGIN;

DO $rollback$
DECLARE
  affected_tables text[] := ARRAY['household_members', 'households', 'profiles',
                                   'task_completions', 'streaks', 'shopping_items'];
  t text;
  cur_pol record;
  bak_pol record;
  stmt text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = '_policy_backup_20260926') THEN
    RAISE EXCEPTION 'Rollback aborted: public._policy_backup_20260926 does not exist -- nothing to restore from. Section 1 was never run, or the backup table was already dropped.';
  END IF;

  FOREACH t IN ARRAY affected_tables LOOP
    -- Drop every CURRENT policy on this table (i.e. what Section 2 put there).
    FOR cur_pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', cur_pol.policyname, t);
    END LOOP;

    -- Recreate every policy that existed on this table BEFORE Section 2 ran.
    FOR bak_pol IN
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM public._policy_backup_20260926
      WHERE tablename = t
    LOOP
      stmt := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
                      bak_pol.policyname, t, bak_pol.permissive, bak_pol.cmd,
                      array_to_string(bak_pol.roles, ', '));
      IF bak_pol.qual IS NOT NULL THEN
        stmt := stmt || format(' USING (%s)', bak_pol.qual);
      END IF;
      IF bak_pol.with_check IS NOT NULL THEN
        stmt := stmt || format(' WITH CHECK (%s)', bak_pol.with_check);
      END IF;
      EXECUTE stmt;
    END LOOP;
  END LOOP;
END
$rollback$;

-- Revert 018's profiles.household_id reassignment guard.
DROP TRIGGER IF EXISTS trg_prevent_self_household_reassignment ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_self_household_reassignment();

-- Revert 018's RLS-enable on whatsapp_webhook_events (016 itself is not undone).
ALTER TABLE IF EXISTS public.whatsapp_webhook_events DISABLE ROW LEVEL SECURITY;

-- Drop the new meal tables (015) -- ONLY if both are still empty. If either
-- has real rows, this refuses and leaves them in place; delete manually
-- after confirming with Elad that losing that data is intended.
DO $drop_meals$
BEGIN
  IF (SELECT count(*) FROM public.meal_plan) > 0 OR (SELECT count(*) FROM public.meals) > 0 THEN
    RAISE EXCEPTION 'Refusing to drop meals/meal_plan: they contain data. Rollback of the policy changes above already ran; the meal tables were left in place untouched.';
  END IF;
  DROP TABLE IF EXISTS public.meal_plan CASCADE;
  DROP TABLE IF EXISTS public.meals CASCADE;
END
$drop_meals$;

COMMIT;
*/
