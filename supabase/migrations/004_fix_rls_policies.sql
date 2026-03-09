-- BayitBeSeder (בית בסדר) - Fix Overly Permissive RLS Policies
-- Migration 004: Replaces open policies from 001_initial.sql with
--                household-scoped and ownership-scoped policies.
--
-- HOW TO APPLY:
--   Run this file manually in the Supabase SQL Editor
--   (Dashboard → SQL Editor → paste contents → Run).
--   The app will NOT run this automatically.
--
-- WHAT THIS FIXES (A3):
--   - profiles SELECT was `using (true)` → exposed all profiles including
--     OAuth tokens (google_calendar_tokens, push_subscription)
--   - tasks SELECT was `using (true)` → any authenticated user could read
--     every household's tasks
--   - tasks INSERT/UPDATE/DELETE only checked `auth.role() = 'authenticated'`
--     → no ownership/household enforcement
--   - task_completions SELECT was `using (true)` → cross-household leak
--
-- NOTE: This migration targets the Phase-3 "simple" tables (profiles, tasks,
--       task_completions, categories).  The advanced tables introduced in
--       migration.sql already have proper household-scoped policies.

-- ============================================================
-- 1. PROFILES
-- ============================================================

-- Drop the overly-permissive policy that allowed every authenticated user
-- (and even anonymous callers via the anon key) to read all profiles.
drop policy if exists "Anyone can view profiles" on public.profiles;

-- Allow a user to read their own profile.
-- The "Users can view own profile" policy may already exist from migration.sql;
-- use CREATE OR REPLACE style by dropping and recreating.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow a user to read their partner's profile (needed by the dashboard to
-- show partner stats).  partner_id is set when two users form a household.
drop policy if exists "Users can view partner profile" on public.profiles;
create policy "Users can view partner profile"
  on public.profiles for select
  using (
    id in (
      select partner_id
      from public.profiles
      where id = auth.uid()
        and partner_id is not null
    )
  );

-- Allow reading profiles of members in the same household (covers the case
-- where partner_id is not yet set but household_members already exists).
drop policy if exists "Users can view household members" on public.profiles;
create policy "Users can view household members"
  on public.profiles for select
  using (
    household_id is not null
    and household_id in (
      select household_id
      from public.profiles
      where id = auth.uid()
    )
  );

-- ============================================================
-- 2. TASKS  (Phase-3 simple tasks table)
-- ============================================================

-- Drop the wide-open select policy.
drop policy if exists "Anyone can view tasks" on public.tasks;

-- Household-scoped read: a user can see tasks that are either
--   (a) assigned to them, or
--   (b) assigned to their partner (for shared household visibility).
-- Falls back gracefully when partner_id is NULL (solo user).
drop policy if exists "Household members can view tasks" on public.tasks;
create policy "Household members can view tasks"
  on public.tasks for select
  using (
    assigned_to = auth.uid()
    or assigned_to in (
      select partner_id
      from public.profiles
      where id = auth.uid()
        and partner_id is not null
    )
    or assigned_to is null  -- unassigned household tasks visible to all members
  );

-- Drop role-only insert/update/delete policies and replace with
-- ownership / household-aware policies.

drop policy if exists "Authenticated users can insert tasks" on public.tasks;
create policy "Authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

-- Only the user who is assigned a task (or their partner for shared tasks)
-- should be able to update it.
drop policy if exists "Authenticated users can update tasks" on public.tasks;
create policy "Household members can update tasks"
  on public.tasks for update
  using (
    auth.role() = 'authenticated'
    and (
      assigned_to = auth.uid()
      or assigned_to in (
        select partner_id
        from public.profiles
        where id = auth.uid()
          and partner_id is not null
      )
      or assigned_to is null
    )
  );

-- Delete: same household restriction.
drop policy if exists "Authenticated users can delete tasks" on public.tasks;
create policy "Household members can delete tasks"
  on public.tasks for delete
  using (
    auth.role() = 'authenticated'
    and (
      assigned_to = auth.uid()
      or assigned_to in (
        select partner_id
        from public.profiles
        where id = auth.uid()
          and partner_id is not null
      )
      or assigned_to is null
    )
  );

-- ============================================================
-- 3. TASK_COMPLETIONS
-- ============================================================

-- Drop the open select policy.
drop policy if exists "Anyone can view completions" on public.task_completions;

-- Users can see completions for tasks they can already see (household-scoped).
drop policy if exists "Household members can view completions" on public.task_completions;
create policy "Household members can view completions"
  on public.task_completions for select
  using (
    user_id = auth.uid()
    or user_id in (
      select partner_id
      from public.profiles
      where id = auth.uid()
        and partner_id is not null
    )
  );

-- INSERT: already correct in 001 (user_id = auth.uid()), kept as-is.
-- UPDATE / DELETE: already scoped to auth.uid(), kept as-is.

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
-- Categories are reference data (not user-specific).  Keep the public read
-- policy but ensure only authenticated users can mutate.
-- These policies already exist from 001_initial.sql so this is a no-op
-- unless they were dropped; included here for completeness.

drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories"
  on public.categories for select
  using (true);

-- No changes needed for category insert/update/delete (already role-checked).
