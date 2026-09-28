-- BayitBeSeder - Add an optional city/town field to households
--
-- WHY THIS EXISTS:
-- Product decision (27.9.2026, approved by Elad): households can optionally
-- record which city/town (יישוב) they live in. Used for onboarding + the
-- household settings screen; not required for any existing feature to keep
-- working.
--
-- This is a purely additive, backward-compatible change:
--   - New column is NULLABLE with no default, so every existing row is valid
--     immediately (no backfill needed, no NOT NULL constraint).
--   - No existing column, table, index, or RLS policy is touched.
--   - RLS: `households` already has membership-scoped SELECT/UPDATE policies
--     from 019_close_live_rls_holes.sql ("Household members can view/update
--     households", both keyed on public.is_household_member(id)). Those
--     policies apply to the whole row, so they automatically cover the new
--     `city` column too — no new policy is needed or should be added here.
--
-- ⚠️ NOT applied to the live database by this file. This is a migration FILE
-- only, per the guarded production-apply process
-- (docs/archive or supabase/PRODUCTION-APPLY-2026-09-26.sql pattern) — Elad
-- (or an agent explicitly authorized to touch the shared production DB) must
-- run this migration before the feat/household-city PR that depends on it
-- is merged.

ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS city text;

COMMENT ON COLUMN public.households.city IS
  'Optional city/town (יישוב) the household is located in. Nullable — most households will not have set this. Free text, validated client + server side (max 100 chars, no HTML) but not constrained at the DB level to keep this additive-safe.';
