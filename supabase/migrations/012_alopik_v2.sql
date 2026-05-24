-- Migration 012: Alopik v2 — love tokens + surprise box + weekly wheel
-- Sprint 7.30 (2026-05-24)
-- Spec: docs/ALOPIK-INTEGRATION-SPEC.md (commit b0f7561)
-- 3 tables: love_tokens (Quick Love), surprise_box_opens (Daily Box), wheel_spins (Friday Wheel)

-- ==========================================================================
-- 1. LOVE TOKENS — Quick Love button between household members
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.love_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value INT NOT NULL CHECK (value > 0 AND value <= 100),
  message TEXT CHECK (length(message) <= 200),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT no_self_send CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_love_tokens_household_sent ON public.love_tokens(household_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_love_tokens_recipient_unread ON public.love_tokens(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_love_tokens_sender_daily ON public.love_tokens(sender_id, sent_at);

ALTER TABLE public.love_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view love tokens"
  ON public.love_tokens FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can send love tokens"
  ON public.love_tokens FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
    AND recipient_id IN (
      SELECT id FROM public.profiles WHERE household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Recipient can mark tokens as read"
  ON public.love_tokens FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ==========================================================================
-- 2. SURPRISE BOX OPENS — Daily Surprise Box on first task of day
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.surprise_box_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_date DATE NOT NULL,
  reward_tier TEXT NOT NULL CHECK (reward_tier IN ('small', 'medium', 'large')),
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL DEFAULT '{}',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_box_per_user_per_day UNIQUE (user_id, opened_date)
);

CREATE INDEX IF NOT EXISTS idx_surprise_box_household_date ON public.surprise_box_opens(household_id, opened_date DESC);

ALTER TABLE public.surprise_box_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view box opens"
  ON public.surprise_box_opens FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can open their own box"
  ON public.surprise_box_opens FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ==========================================================================
-- 3. WHEEL SPINS — Weekly Wheel of Fortune (Friday 14:00 IDT)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  spun_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spin_week_iso TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  segment_label TEXT NOT NULL,
  segment_emoji TEXT,
  token_status TEXT NOT NULL DEFAULT 'unredeemed' CHECK (token_status IN ('unredeemed', 'redeemed', 'expired')),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES auth.users(id),
  spun_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_spin_per_household_per_week UNIQUE (household_id, spin_week_iso)
);

CREATE INDEX IF NOT EXISTS idx_wheel_spins_household_unredeemed
  ON public.wheel_spins(household_id, token_status)
  WHERE token_status = 'unredeemed';

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view spins"
  ON public.wheel_spins FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can spin the wheel"
  ON public.wheel_spins FOR INSERT
  WITH CHECK (
    spun_by_user_id = auth.uid()
    AND household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can redeem spins"
  ON public.wheel_spins FOR UPDATE
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
-- 4. HELPER FUNCTION — Daily love tokens count per sender (for rate-limit)
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.count_love_tokens_today(p_sender_id UUID, p_recipient_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count
  FROM public.love_tokens
  WHERE sender_id = p_sender_id
    AND recipient_id = p_recipient_id
    AND sent_at >= (CURRENT_DATE AT TIME ZONE 'Asia/Jerusalem');
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_love_tokens_today(UUID, UUID) TO authenticated;

-- ==========================================================================
-- ROLLBACK (manual — NOT run automatically)
-- ==========================================================================
-- DROP FUNCTION IF EXISTS public.count_love_tokens_today(UUID, UUID);
-- DROP TABLE IF EXISTS public.wheel_spins CASCADE;
-- DROP TABLE IF EXISTS public.surprise_box_opens CASCADE;
-- DROP TABLE IF EXISTS public.love_tokens CASCADE;
