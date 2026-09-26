-- BayitBeSeder - Close cross-household INSERT hole on shopping_items
--
-- WHY THIS EXISTS:
-- 003_shopping_items.sql created the correct household-scoped policies
-- ("Members can view shopping items" / "Members can manage shopping items"),
-- but ALSO added two permissive "simple mode" fallback policies:
--
--   CREATE POLICY "Authenticated users can manage own items" ON public.shopping_items
--     FOR ALL USING (added_by = auth.uid());
--
--   CREATE POLICY "Authenticated users can insert items" ON public.shopping_items
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
--
-- Postgres RLS policies for the same command are OR'd together. Because the
-- second policy above has NO household check at all, ANY authenticated user
-- — regardless of household membership — could INSERT an item into ANY
-- household's shopping list. And because the first policy keys only on
-- `added_by = auth.uid()`, a user could still UPDATE/DELETE an item they
-- added even after it (or they) no longer belong to that item's household.
--
-- This migration drops both fallback policies. Once they are gone, INSERT
-- (and UPDATE/DELETE) fall back to the single remaining "Members can manage
-- shopping items" FOR ALL policy, which uses household_members membership
-- and covers all four commands (Postgres uses the USING expression as the
-- implicit WITH CHECK for INSERT/UPDATE when no WITH CHECK is given on a
-- FOR ALL policy) — see the belt-and-suspenders explicit WITH CHECK we add
-- below for INSERT, so this is not relying on that implicit behavior alone.

-- Drop the two permissive fallback policies.
DROP POLICY IF EXISTS "Authenticated users can manage own items" ON public.shopping_items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.shopping_items;

-- Re-create "Members can manage shopping items" with an explicit WITH CHECK
-- so INSERT/UPDATE are provably restricted to the caller's own household,
-- not just relying on Postgres defaulting WITH CHECK to USING. Same idiom
-- as 015_meals.sql's "Household members can manage meals".
DROP POLICY IF EXISTS "Members can manage shopping items" ON public.shopping_items;

CREATE POLICY "Members can manage shopping items" ON public.shopping_items
  FOR ALL USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
