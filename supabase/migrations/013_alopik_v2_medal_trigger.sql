-- Migration 013: Alopik v2 — Auto-award medal at 50 stars threshold
-- Sprint 7.30 Loop C (2026-05-24 09:25 IDT)
-- Spec: docs/ALOPIK-INTEGRATION-SPEC.md
--
-- Pattern from Alopik: "כשהילד אוסף 50 כוכבים הוא זוכה במדליה".
-- For bayit-beseder couples: same threshold per user, awards trigger
-- couple-celebration event + entry in achievements table.

-- Threshold constant — adjust here if needed in future
CREATE OR REPLACE FUNCTION public.alopik_medal_threshold()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 50 $$;

-- ==========================================================================
-- Achievements ledger (if not exists — extends existing achievements pattern)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.user_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medal_number INT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_points_total INT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'auto_threshold',
  acknowledged_at TIMESTAMPTZ,
  CONSTRAINT unique_user_medal_number UNIQUE (user_id, medal_number)
);

CREATE INDEX IF NOT EXISTS idx_user_medals_household_awarded
  ON public.user_medals(household_id, awarded_at DESC);

ALTER TABLE public.user_medals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view medals"
  ON public.user_medals FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service can insert medals"
  ON public.user_medals FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "User can acknowledge their own medals"
  ON public.user_medals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================================================
-- Trigger function: award next medal when profile.points crosses
-- multiples of threshold (50, 100, 150, ...)
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.alopik_award_medal_on_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold INT := public.alopik_medal_threshold();
  v_old_medals INT;
  v_new_medals INT;
  v_medal_n INT;
BEGIN
  IF NEW.points IS NULL OR NEW.points <= 0 THEN
    RETURN NEW;
  END IF;

  v_old_medals := COALESCE(OLD.points, 0) / v_threshold;
  v_new_medals := NEW.points / v_threshold;

  IF v_new_medals > v_old_medals THEN
    FOR v_medal_n IN (v_old_medals + 1)..v_new_medals LOOP
      INSERT INTO public.user_medals (
        household_id, user_id, medal_number, trigger_points_total
      )
      VALUES (
        NEW.household_id, NEW.id, v_medal_n, NEW.points
      )
      ON CONFLICT (user_id, medal_number) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alopik_award_medal ON public.profiles;
CREATE TRIGGER trg_alopik_award_medal
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  WHEN (NEW.points IS DISTINCT FROM OLD.points)
  EXECUTE FUNCTION public.alopik_award_medal_on_points();

-- ==========================================================================
-- Helper view: unacknowledged medals per user (for UI badge count)
-- ==========================================================================

CREATE OR REPLACE VIEW public.v_unacknowledged_medals AS
SELECT
  user_id,
  household_id,
  COUNT(*)::INT AS pending_count,
  MAX(awarded_at) AS latest_awarded_at
FROM public.user_medals
WHERE acknowledged_at IS NULL
GROUP BY user_id, household_id;

-- View inherits RLS from underlying table (PostgreSQL behavior)
GRANT SELECT ON public.v_unacknowledged_medals TO authenticated;

-- ==========================================================================
-- ROLLBACK
-- ==========================================================================
-- DROP TRIGGER IF EXISTS trg_alopik_award_medal ON public.profiles;
-- DROP FUNCTION IF EXISTS public.alopik_award_medal_on_points();
-- DROP FUNCTION IF EXISTS public.alopik_medal_threshold();
-- DROP VIEW IF EXISTS public.v_unacknowledged_medals;
-- DROP TABLE IF EXISTS public.user_medals CASCADE;
