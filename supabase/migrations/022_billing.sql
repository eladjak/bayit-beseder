-- 022_billing.sql — Real, Sumit-only billing (Elad, 28.9.2026).
--
-- Consolidates and REPLACES 010_subscriptions.sql / 011_subscriptions_sumit.sql.
-- Those two were never applied to production (confirmed before writing this
-- file — see the PR description), so there is no live data to migrate off
-- of; this migration defines the final schema directly rather than layering
-- another ALTER TABLE on top of a table that was never actually created live.
-- It is still written to be idempotent and safe to re-run, and defensive
-- against the (unlikely, but possible on some other environment) case where
-- 010/011 WERE applied — every ALTER/DROP below is guarded.
--
-- Business shape (do not re-litigate — decided by Elad 28.9.2026):
--   - ONE paid tier: 'plus', 19 NIS/month per household.
--   - No 'family' tier/SKU — it never was a real purchasable thing.
--   - No yearly pricing, no free trial.
--   - Elad is an עוסק פטור (VAT-exempt) — Sumit documents are receipts, not
--     invoices; that's a Sumit-account-level setting, not something this
--     migration or the app code controls.
--
-- At most ONE 'active' subscription row per household, enforced by a partial
-- unique index (not the household_id+status composite unique that 010 used —
-- that would have allowed row (H,'active') AND row (H,'active') to collide
-- correctly but also silently allowed multiple 'canceled' rows to violate
-- nothing, which is what we want, so this is actually the same intent as 010
-- just expressed the way Postgres is built for it). Historical
-- past_due/canceled rows are NOT deleted — they are the audit trail.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── subscriptions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id uuid,                               -- Supabase auth user that started the checkout (nullable: a webhook-created row may not know it)
    tier text NOT NULL DEFAULT 'free',
    status text NOT NULL DEFAULT 'active',
    sumit_customer_id text,
    sumit_subscription_id text,
    sumit_payment_method_id text,
    sumit_last_document_id text,                -- last invoice/receipt id — for showing the user their kabbalah
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at timestamptz,
    canceled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Defensive normalization in case an older 010/011 run already created this
-- table with Stripe columns and a wider tier/status vocabulary.
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS sumit_customer_id text,
    ADD COLUMN IF NOT EXISTS sumit_subscription_id text,
    ADD COLUMN IF NOT EXISTS sumit_payment_method_id text,
    ADD COLUMN IF NOT EXISTS sumit_last_document_id text,
    ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
    ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

ALTER TABLE public.subscriptions
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS stripe_price_id,
    DROP COLUMN IF EXISTS trial_end;

-- Drop the old composite unique (household_id, status) if 010 ever ran —
-- superseded by the partial unique index below.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS unique_active_household_sub;

-- tier / status vocabulary — 'family' and 'trialing'/'incomplete' removed:
-- no code path in this app writes them any more.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_tier_check CHECK (tier IN ('free', 'plus'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'past_due', 'canceled'));

-- At most one ACTIVE row per household. Historical past_due/canceled rows
-- are unrestricted — they're the audit trail, not the entitlement.
DROP INDEX IF EXISTS idx_subscriptions_one_active_per_household;
CREATE UNIQUE INDEX idx_subscriptions_one_active_per_household
    ON public.subscriptions (household_id)
    WHERE status = 'active';

-- sumit_subscription_id: unique when present, but multiple NULLs are fine
-- (a Postgres unique index never treats NULL as a duplicate of NULL).
DROP INDEX IF EXISTS idx_subscriptions_sumit_subscription_unique;
CREATE UNIQUE INDEX idx_subscriptions_sumit_subscription_unique
    ON public.subscriptions (sumit_subscription_id)
    WHERE sumit_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_household ON public.subscriptions(household_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sumit_customer ON public.subscriptions(sumit_customer_id);

-- ─── RLS — read own household's sub, write via service role only ──────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (public.is_household_member(household_id));

-- No INSERT/UPDATE/DELETE policies for authenticated/anon on purpose — with
-- RLS enabled and zero write policies, both roles are denied by default for
-- every DML write. Only the service-role key (used by /api/sumit/webhook and
-- /api/sumit/cancel-subscription) can write this table. Same pattern as
-- 020_household_agent_tokens.sql.
DROP POLICY IF EXISTS "subscriptions_no_user_writes" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_no_user_updates" ON public.subscriptions;

-- ─── billing_events — webhook idempotency + audit log ──────────────────────

CREATE TABLE IF NOT EXISTS public.billing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sumit_payment_id text,
    sumit_document_id text,
    event_type text NOT NULL,
    raw_payload jsonb NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    error text
);

ALTER TABLE public.billing_events
    ADD COLUMN IF NOT EXISTS sumit_payment_id text,
    ADD COLUMN IF NOT EXISTS sumit_document_id text;

ALTER TABLE public.billing_events DROP COLUMN IF EXISTS stripe_event_id;

DROP INDEX IF EXISTS idx_billing_events_sumit_payment_unique;
CREATE UNIQUE INDEX idx_billing_events_sumit_payment_unique
    ON public.billing_events (sumit_payment_id)
    WHERE sumit_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON public.billing_events(processed_at DESC);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- Service-role only, same reasoning as subscriptions above.
DROP POLICY IF EXISTS "billing_events_service_only" ON public.billing_events;

-- ─── updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bayit_subscriptions_touch_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_touch ON public.subscriptions;
CREATE TRIGGER subscriptions_touch
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.bayit_subscriptions_touch_updated_at();

-- ─── seed: every existing household gets a 'free' row ──────────────────────
-- (so useSubscription's "active row for this household" lookup always has
-- something to find rather than silently defaulting via absence — an
-- explicit 'free'/'active' row is the same entitlement as "no row" today,
-- but keeps the query shape identical whether a household has ever paid or
-- not, and gives a stable row to look at in the Supabase dashboard.)
INSERT INTO public.subscriptions (household_id, user_id, tier, status)
SELECT h.id, h.created_by, 'free', 'active'
FROM public.households h
WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.household_id = h.id AND s.status = 'active'
);

COMMIT;

-- ─── verification queries — uncomment and run manually in the Supabase SQL
-- editor after applying this migration ─────────────────────────────────────

-- 1. Every household has exactly one 'active' subscription row.
-- SELECT h.id, count(s.id) AS active_subs
-- FROM public.households h
-- LEFT JOIN public.subscriptions s ON s.household_id = h.id AND s.status = 'active'
-- GROUP BY h.id
-- HAVING count(s.id) <> 1;
-- -- expect: 0 rows

-- 2. The tier/status check constraints exist and reject 'family'.
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.subscriptions'::regclass
--   AND conname IN ('subscriptions_tier_check', 'subscriptions_status_check');
-- -- expect: 2 rows; the tier one must NOT mention 'family'

-- 3. The partial unique index enforcing "at most one active sub per
--    household" exists.
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'subscriptions'
--   AND indexname = 'idx_subscriptions_one_active_per_household';
-- -- expect: 1 row, indexdef contains "WHERE (status = 'active'::text)"

-- 4. RLS is enabled and only the read policy exists (no write policy for
--    authenticated/anon).
-- SELECT polname, polcmd FROM pg_policy
-- WHERE polrelid = 'public.subscriptions'::regclass;
-- -- expect: exactly 1 row — "subscriptions_select_own", cmd 'r' (SELECT)

-- 5. Stripe columns are gone.
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'subscriptions'
--   AND column_name LIKE 'stripe_%';
-- -- expect: 0 rows
