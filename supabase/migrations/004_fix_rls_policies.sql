-- BayitBeSeder - Fix Overly Permissive RLS Policies
-- Migration 004: Replaces open policies from 001_initial.sql with
--                household-scoped policies using household_id.
--
-- HOW TO APPLY:
--   Run this file manually in the Supabase SQL Editor
--   (Dashboard -> SQL Editor -> paste contents -> Run).
--
-- NOTE: Uses household_id (not partner_id) for scoping, matching
--       the production schema from migration.sql.

-- ============================================================
-- 1. PROFILES
-- ============================================================

-- Drop the overly-permissive policy
drop policy if exists "Anyone can view profiles" on public.profiles;

-- Own profile (may already exist from migration.sql - safe to recreate)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Household members can see each other
drop policy if exists "Users can view household members" on public.profiles;
create policy "Users can view household members"
  on public.profiles for select
  using (
    household_id is not null
    and household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- 2. TASKS
-- ============================================================

-- Drop the wide-open select policy
drop policy if exists "Anyone can view tasks" on public.tasks;

-- Household-scoped read: user can see tasks assigned to them,
-- tasks in their household, or unassigned tasks.
drop policy if exists "Household members can view tasks" on public.tasks;
create policy "Household members can view tasks"
  on public.tasks for select
  using (
    assigned_to = auth.uid()
    or household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
    or assigned_to is null
  );

-- Insert: any authenticated user
drop policy if exists "Authenticated users can insert tasks" on public.tasks;
create policy "Authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

-- Update: household-scoped
drop policy if exists "Authenticated users can update tasks" on public.tasks;
create policy "Household members can update tasks"
  on public.tasks for update
  using (
    auth.role() = 'authenticated'
    and (
      assigned_to = auth.uid()
      or household_id in (
        select household_id from public.profiles where id = auth.uid()
      )
      or assigned_to is null
    )
  );

-- Delete: household-scoped
drop policy if exists "Authenticated users can delete tasks" on public.tasks;
create policy "Household members can delete tasks"
  on public.tasks for delete
  using (
    auth.role() = 'authenticated'
    and (
      assigned_to = auth.uid()
      or household_id in (
        select household_id from public.profiles where id = auth.uid()
      )
      or assigned_to is null
    )
  );

-- ============================================================
-- 3. TASK_COMPLETIONS
-- ============================================================

drop policy if exists "Anyone can view completions" on public.task_completions;
drop policy if exists "Household members can view completions" on public.task_completions;
create policy "Household members can view completions"
  on public.task_completions for select
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

-- ============================================================
-- 4. CATEGORIES (keep public read - reference data)
-- ============================================================
drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories"
  on public.categories for select
  using (true);
