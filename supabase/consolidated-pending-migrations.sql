-- ============================================================
-- BayitBeSeder - Consolidated Pending Migrations
-- ============================================================
-- ONE-TIME RUN: Copy-paste this entire file into Supabase SQL Editor and run it.
--
-- Includes the following pending migrations:
--   004 - Fix RLS policies (CRITICAL: restores tasks SELECT policy)
--   006 - Coaching tracking (coaching_events table)
--   007 - Expand shopping categories (drop CHECK constraint)
--   008 - Custom shopping categories (shopping_categories table)
--
-- Already applied (NOT included):
--   005 - WhatsApp phone column (already done)
--
-- This script is fully IDEMPOTENT - safe to run multiple times.
-- All operations use IF NOT EXISTS / IF EXISTS / DROP ... IF EXISTS.
-- ============================================================

BEGIN;

-- ============================================================
-- MIGRATION 004: Fix RLS Policies (CRITICAL)
-- ============================================================
-- The tasks SELECT policy was previously DROPPED but the replacement
-- failed, leaving the tasks table unreadable. This restores it.
-- Tasks are a shared catalog (no household_id column) so everyone
-- can read them.
-- ============================================================

-- 004.1: TASKS - Shared catalog policies
-- Drop ALL possible policy names from various migration attempts
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_all" ON public.tasks;

CREATE POLICY "Anyone can view tasks"
  ON public.tasks FOR SELECT
  USING (true);

-- Restore insert for authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_auth" ON public.tasks;

CREATE POLICY "Authenticated users can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Restore update for authenticated users
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_auth" ON public.tasks;

CREATE POLICY "Authenticated users can update tasks"
  ON public.tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Restore delete for authenticated users
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Household members can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_auth" ON public.tasks;

CREATE POLICY "Authenticated users can delete tasks"
  ON public.tasks FOR DELETE
  USING (auth.role() = 'authenticated');

-- 004.2: TASK_COMPLETIONS - Scope to own + household members
-- Uses user_id (confirmed column) and joins through profiles for household scoping
DROP POLICY IF EXISTS "Anyone can view completions" ON public.task_completions;
DROP POLICY IF EXISTS "Household members can view completions" ON public.task_completions;
DROP POLICY IF EXISTS "completions_select_own" ON public.task_completions;
DROP POLICY IF EXISTS "completions_select_household" ON public.task_completions;
DROP POLICY IF EXISTS "Users can view own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Household can view completions" ON public.task_completions;

-- Own completions
CREATE POLICY "Users can view own completions"
  ON public.task_completions FOR SELECT
  USING (user_id = auth.uid());

-- Household members can see each other's completions
CREATE POLICY "Household can view completions"
  ON public.task_completions FOR SELECT
  USING (
    user_id IN (
      SELECT p2.id
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.household_id = p2.household_id
      WHERE p1.id = auth.uid()
        AND p1.household_id IS NOT NULL
    )
  );

-- 004.3: CATEGORIES - Keep public read (reference data)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);


-- ============================================================
-- MIGRATION 006: Coaching Tracking
-- ============================================================
-- Adds coaching_events table for adaptive coaching system.
-- Tracks every WhatsApp coaching message sent so we can measure
-- which styles lead to task completions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coaching_events (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('morning_brief', 'evening_summary', 'nudge', 'celebration')),
  coaching_style text NOT NULL CHECK (coaching_style IN ('encouraging', 'factual', 'playful', 'urgent')),
  message_text text NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for queries by household + time window
CREATE INDEX IF NOT EXISTS coaching_events_household_sent_at
  ON public.coaching_events (household_id, sent_at DESC);

-- Enable RLS
ALTER TABLE public.coaching_events ENABLE ROW LEVEL SECURITY;

-- Household members can read their coaching events (dashboard widget)
-- Drop first for idempotency, then create
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view household coaching events" ON public.coaching_events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Members can view household coaching events"
  ON public.coaching_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = coaching_events.household_id
        AND hm.user_id = auth.uid()
    )
  );

-- Allow insert for household members (when called from signed-in user context)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can insert coaching events" ON public.coaching_events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Members can insert coaching events"
  ON public.coaching_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = coaching_events.household_id
        AND hm.user_id = auth.uid()
    )
  );


-- ============================================================
-- MIGRATION 007: Expand Shopping Categories
-- ============================================================
-- Drops the CHECK constraint on shopping_items.category to allow
-- new categories (טיפוח, תרופות) and custom categories.
-- The original constraint only allowed: מזון, ניקיון, חיות, בית, אחר
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_category_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;


-- ============================================================
-- MIGRATION 008: Custom Shopping Categories
-- ============================================================
-- Creates shopping_categories table allowing users to manage
-- their own shopping categories per household (add/edit/delete/reorder).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shopping_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🛒',
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_categories ENABLE ROW LEVEL SECURITY;

-- RLS: household members can view their own categories
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their household categories" ON public.shopping_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view their household categories"
  ON public.shopping_categories
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can insert categories
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert their household categories" ON public.shopping_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can insert their household categories"
  ON public.shopping_categories
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can update their household categories
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update their household categories" ON public.shopping_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can update their household categories"
  ON public.shopping_categories
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can delete their household categories
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete their household categories" ON public.shopping_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can delete their household categories"
  ON public.shopping_categories
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Index for fast household lookups
CREATE INDEX IF NOT EXISTS idx_shopping_categories_household
  ON public.shopping_categories(household_id);

-- Enable Realtime (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- VERIFICATION: Confirm all policies and tables are in place
-- ============================================================
-- Run this after the migration to verify everything was applied.
-- You should see rows for each policy/table listed below.
-- ============================================================

-- 1. Verify tasks policies (CRITICAL - migration 004)
SELECT
  'tasks' AS "table",
  policyname AS "policy",
  cmd AS "operation"
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;

-- 2. Verify task_completions policies (migration 004)
SELECT
  'task_completions' AS "table",
  policyname AS "policy",
  cmd AS "operation"
FROM pg_policies
WHERE tablename = 'task_completions'
ORDER BY policyname;

-- 3. Verify categories policies (migration 004)
SELECT
  'categories' AS "table",
  policyname AS "policy",
  cmd AS "operation"
FROM pg_policies
WHERE tablename = 'categories'
ORDER BY policyname;

-- 4. Verify coaching_events table exists (migration 006)
SELECT
  'coaching_events' AS "table",
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coaching_events'
ORDER BY ordinal_position;

-- 5. Verify shopping_items has NO category CHECK constraint (migration 007)
SELECT
  'shopping_items constraints' AS "check",
  conname AS "constraint_name"
FROM pg_constraint
WHERE conrelid = 'public.shopping_items'::regclass
  AND contype = 'c'
  AND conname LIKE '%category%';
-- Expected: 0 rows (constraint was dropped)

-- 6. Verify shopping_categories table and policies (migration 008)
SELECT
  'shopping_categories' AS "table",
  policyname AS "policy",
  cmd AS "operation"
FROM pg_policies
WHERE tablename = 'shopping_categories'
ORDER BY policyname;

-- 7. Summary: all tables with RLS enabled
SELECT
  tablename AS "table",
  rowsecurity AS "rls_enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'task_completions', 'categories', 'coaching_events', 'shopping_items', 'shopping_categories')
ORDER BY tablename;

COMMIT;

-- ============================================================
-- DONE! All 4 pending migrations applied.
--
-- Expected verification results:
--   tasks:              4 policies (select, insert, update, delete)
--   task_completions:   2 policies (own + household select)
--   categories:         1 policy  (select)
--   coaching_events:    table exists with 7 columns, 2 policies
--   shopping_items:     NO category CHECK constraint remaining
--   shopping_categories: table exists, 4 policies, 1 index, realtime enabled
-- ============================================================
