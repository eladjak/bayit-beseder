-- BayitBeSeder — privacy gate: one consent record per user per policy version.
--
-- ADDITIVE ONLY. One new Bayit-owned table. Nothing here touches profiles,
-- user_roles, notifications, the auth trigger, or any existing table, policy
-- or function (the Supabase project is shared with the events app, "kidushishi").
-- Idempotent: safe to re-run.
--
-- Access model: an authenticated user may INSERT a row only for themselves
-- (user_id = auth.uid()) and only a row that records all three confirmations
-- (age 18+, privacy policy, terms), and may SELECT only their own rows.
-- There are NO update/delete policies: a record is append-only from the app.
-- Rows disappear only when the auth user is deleted (ON DELETE CASCADE),
-- which is what the "delete my account" flow does.
--
-- Bumping POLICY_VERSION in src/lib/privacy/policy.ts makes every user without
-- a row for that exact version see the gate again.
--
-- Rollback: supabase/rollbacks/026_privacy_consent_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.privacy_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 40),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  age_confirmed boolean NOT NULL,
  privacy_accepted boolean NOT NULL,
  terms_accepted boolean NOT NULL,
  locale text NOT NULL DEFAULT 'he' CHECK (locale IN ('he', 'en')),
  -- Where the consent was given: 'register' | 'gate' | 'invite'. Informational.
  source text NOT NULL DEFAULT 'gate' CHECK (char_length(source) <= 20),
  PRIMARY KEY (user_id, policy_version)
);

ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'privacy_consents'
      AND policyname = 'bayit_consent_insert_own'
  ) THEN
    CREATE POLICY "bayit_consent_insert_own"
      ON public.privacy_consents
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND age_confirmed = true
        AND privacy_accepted = true
        AND terms_accepted = true
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'privacy_consents'
      AND policyname = 'bayit_consent_select_own'
  ) THEN
    CREATE POLICY "bayit_consent_select_own"
      ON public.privacy_consents
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE public.privacy_consents IS
  'Privacy gate: user confirmed age 18+, privacy policy and terms, for one policy version. Append-only from the app.';

COMMIT;
