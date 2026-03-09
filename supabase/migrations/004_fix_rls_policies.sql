-- BayitBeSeder - Fix RLS Policies (v3 - Safe)
-- Migration 004: Restores + improves policies for the actual production schema.
--
-- HOW TO APPLY:
--   Run this file in Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).
--
-- IMPORTANT: The previous run of this migration partially succeeded:
--   ✅ Profiles policies already fixed (household-scoped)
--   ❌ Tasks SELECT policy was DROPPED but replacement failed
--   ❌ Task completions & categories were never reached
--
-- This version is fully idempotent - safe to run multiple times.
-- It does NOT reference household_id on the tasks table (it doesn't exist).

-- ============================================================
-- 1. PROFILES - Already fixed, skip
--    (household-scoped policies in place from previous run)
-- ============================================================

-- ============================================================
-- 2. TASKS - Shared catalog (no household_id column)
--    Keep public read - tasks are shared reference data,
--    similar to categories. Not sensitive.
-- ============================================================

-- Drop ALL possible policy names (from various migration attempts)
drop policy if exists "Anyone can view tasks" on public.tasks;
drop policy if exists "Household members can view tasks" on public.tasks;
drop policy if exists "tasks_select_all" on public.tasks;

create policy "Anyone can view tasks"
  on public.tasks for select
  using (true);

-- Restore insert/update/delete for authenticated users
drop policy if exists "Authenticated users can insert tasks" on public.tasks;
drop policy if exists "tasks_insert_auth" on public.tasks;

create policy "Authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update tasks" on public.tasks;
drop policy if exists "Household members can update tasks" on public.tasks;
drop policy if exists "tasks_update_auth" on public.tasks;

create policy "Authenticated users can update tasks"
  on public.tasks for update
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete tasks" on public.tasks;
drop policy if exists "Household members can delete tasks" on public.tasks;
drop policy if exists "tasks_delete_auth" on public.tasks;

create policy "Authenticated users can delete tasks"
  on public.tasks for delete
  using (auth.role() = 'authenticated');

-- ============================================================
-- 3. TASK_COMPLETIONS - Scope to own + household members
--    Uses user_id (confirmed column) and joins through profiles
--    for household scoping (avoids referencing household_id on
--    task_completions which may not exist).
-- ============================================================

-- Drop ALL possible policy names
drop policy if exists "Anyone can view completions" on public.task_completions;
drop policy if exists "Household members can view completions" on public.task_completions;
drop policy if exists "completions_select_own" on public.task_completions;
drop policy if exists "completions_select_household" on public.task_completions;
drop policy if exists "Users can view own completions" on public.task_completions;
drop policy if exists "Household can view completions" on public.task_completions;

-- Own completions
create policy "Users can view own completions"
  on public.task_completions for select
  using (user_id = auth.uid());

-- Household members can see each other's completions
-- (joins through profiles.household_id which is confirmed to exist)
create policy "Household can view completions"
  on public.task_completions for select
  using (
    user_id in (
      select p2.id
      from public.profiles p1
      join public.profiles p2 on p1.household_id = p2.household_id
      where p1.id = auth.uid()
        and p1.household_id is not null
    )
  );

-- ============================================================
-- 4. CATEGORIES (keep public read - reference data)
-- ============================================================
drop policy if exists "Anyone can view categories" on public.categories;
drop policy if exists "categories_select_all" on public.categories;

create policy "Anyone can view categories"
  on public.categories for select
  using (true);
