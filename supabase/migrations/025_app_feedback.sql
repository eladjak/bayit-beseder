-- BayitBeSeder — in-app feedback (1-5 star rating + optional free text).
--
-- ADDITIVE ONLY. One new Bayit-owned table. Nothing here touches profiles,
-- user_roles, notifications, the auth trigger, or any existing table, policy
-- or function (those are shared with Kidushishi). Idempotent: safe to re-run.
--
-- Access model: an authenticated user may INSERT a row only for themselves
-- (user_id = auth.uid()) and may SELECT only their own rows. There are NO
-- update/delete policies, so feedback is append-only from the app. Reading all
-- feedback is done by the owner with the service role / SQL editor.
--
-- NOT APPLIED automatically. Applying it on the shared Supabase project needs
-- Elad's explicit approval.
--
-- Numbered after 024_agent_token_scopes.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informational only (no FK on purpose: feedback must survive household deletion).
  household_id uuid NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NULL CHECK (message IS NULL OR char_length(message) <= 2000),
  page text NULL CHECK (page IS NULL OR char_length(page) <= 200),
  app_version text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx
  ON public.app_feedback (created_at);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_feedback'
      AND policyname = 'bayit_feedback_insert_own'
  ) THEN
    CREATE POLICY "bayit_feedback_insert_own"
      ON public.app_feedback
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_feedback'
      AND policyname = 'bayit_feedback_select_own'
  ) THEN
    CREATE POLICY "bayit_feedback_select_own"
      ON public.app_feedback
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE public.app_feedback IS
  'In-app user feedback (rating 1-5 + optional text). Append-only from the app; owner-readable only.';

COMMIT;

-- ROLLBACK (manual, only if this migration must be undone; deletes all feedback):
--   BEGIN;
--   DROP TABLE IF EXISTS public.app_feedback;
--   COMMIT;
