-- Migration 015: Meal-prep planner — the ORIGINAL pain-killer (docs/AGENT-INTERFACE.md, 27.5.2026)
-- Created 2026-07-05 as part of the home-launch 48h horizon (MASTERPIECE-PLAN.md).
-- Extended 2026-09-25 for meal-planner v1 (Elad: "תתחיל מברירת מחדל" — build with
-- sensible defaults, no intake answers required). See docs/MEAL-PLANNER-INTAKE.md
-- for the original (still-unanswered, no-longer-blocking) 5-question intake.
--
-- NOT YET APPLIED to production. Do not run until:
--   1. Run on a Supabase BRANCH first, then prod (safe-live-refactor rule).
--   2. Elad explicitly asks for it to run in prod (this task is forbidden from
--      running it — see PR description).
--
-- Purpose: remove the nightly "what to cook / what to defrost" decision.
--   meals      = the agreed rotation repertoire. Seeded per-household from a
--                ~25-meal default pack on first use (application code, not
--                global rows here — see src/lib/meals/seed-data.ts).
--   meal_plan  = the concrete week (date x meal), drives the "מה להפשיר הערב"
--                defrost reminder via GET /api/agent/prep, and the nightly
--                Kami/WhatsApp nudge.
--   who_eats   = per-person eating map — answers the "רק אני אכלתי את זה" waste.
--   ingredients (added 2026-09-25) = jsonb list feeding shopping suggestions.
--
-- This file is written to be re-runnable even if an earlier, narrower version
-- of it was already applied on some branch: every ADD COLUMN / constraint
-- change below uses IF NOT EXISTS / DROP+ADD so running it twice is a no-op.

-- ==========================================================================
-- 1. MEALS — the rotation repertoire
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  -- Who actually eats this meal (display names / member keys), e.g. ['אלעד','ענבל']
  who_eats TEXT[] NOT NULL DEFAULT '{}',
  -- Hours of prep lead needed BEFORE cooking (defrost = ~12-24h -> nudge the night before)
  prep_lead_hours INT NOT NULL DEFAULT 0 CHECK (prep_lead_hours BETWEEN 0 AND 72),
  -- What must be taken out of the freezer / prepared ahead (free text)
  prep_note TEXT CHECK (length(prep_note) <= 200),
  -- Minimum days between repeats (the "must always vary" pressure, made explicit and agreed)
  min_repeat_days INT NOT NULL DEFAULT 3 CHECK (min_repeat_days BETWEEN 0 AND 30),
  tags TEXT[] NOT NULL DEFAULT '{}',
  -- Ingredient lines for this meal, e.g. [{"name":"עוף","quantity":1,"unit":"ק\"ג"}].
  -- Feeds the "הוסף מצרכים לרשימה" shopping-suggestion flow (v1, 2026-09-25).
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

CREATE POLICY "Household members can view meals"
  ON public.meals FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

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

-- ==========================================================================
-- 2. MEAL_PLAN — the agreed week (date x meal)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- Nullable (2026-09-25): a day can be marked skipped/leftovers with no
  -- concrete meal chosen yet, or lose its meal if that meal is later deleted.
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL,
  -- planned -> prepped (defrost done) -> cooked | skipped | leftovers
  -- "leftovers" (added 2026-09-25) = eating a previous day's meal again;
  -- meal_id keeps pointing at the ORIGINAL meal that was cooked.
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'prepped', 'cooked', 'skipped', 'leftovers')),
  note TEXT CHECK (length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One meal slot per household per date (dinner-centric v1; expand later if needed)
  CONSTRAINT uq_meal_plan_household_date UNIQUE (household_id, plan_date)
);

-- Idempotent guards for branches that already had the narrower, pre-2026-09-25 shape.
ALTER TABLE public.meal_plan ALTER COLUMN meal_id DROP NOT NULL;
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_status_check;
ALTER TABLE public.meal_plan
  ADD CONSTRAINT meal_plan_status_check
  CHECK (status IN ('planned', 'prepped', 'cooked', 'skipped', 'leftovers'));
-- meal_id's FK was ON DELETE CASCADE originally; re-point it to SET NULL so
-- deleting a meal never silently deletes plan history.
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_meal_id_fkey;
ALTER TABLE public.meal_plan
  ADD CONSTRAINT meal_plan_meal_id_fkey
  FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plan_household_date
  ON public.meal_plan(household_id, plan_date);

ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view meal plan"
  ON public.meal_plan FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

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
