-- Migration 015: Meal-prep planner — the ORIGINAL pain-killer (docs/AGENT-INTERFACE.md, 27.5.2026)
-- Created 2026-07-05 as part of the home-launch 48h horizon (MASTERPIECE-PLAN.md).
--
-- NOT YET APPLIED. Do not run until:
--   1. Elad answers the 5-question intake (docs/MEAL-PLANNER-INTAKE.md) — the
--      rotation seed data comes from his answers, not from guesses.
--   2. Run on a Supabase BRANCH first, then prod (safe-live-refactor rule).
--
-- Purpose: remove the nightly "what to cook / what to defrost" decision.
--   meals      = the agreed rotation repertoire (a decision made ONCE, together)
--   meal_plan  = the concrete week (date x meal), drives the 21:00 defrost nudge:
--                "מחר {meal}. להוציא {defrost} מהמקפיא הערב" via Kami/WhatsApp.
--   who_eats   = per-person eating map — answers the "רק אני אכלתי את זה" waste.

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
  last_served_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  -- planned -> prepped (defrost done) -> cooked | skipped
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'prepped', 'cooked', 'skipped')),
  note TEXT CHECK (length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One meal slot per household per date (dinner-centric v1; expand later if needed)
  CONSTRAINT uq_meal_plan_household_date UNIQUE (household_id, plan_date)
);

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
