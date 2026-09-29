-- BayitBeSeder — agent token scopes, two-step confirmations, audit log.
--
-- Elad's rule (29.9.2026): actions the agent API deliberately excludes CAN be
-- allowed, but only on the user's own instruction and only for their own
-- household/account. This migration adds the storage for that:
--
--   1. household_agent_tokens.scopes      what a token may do (chosen at creation)
--   2. household_agent_tokens.created_by  which member created the token, so
--                                         "deliver to me" can only ever mean
--                                         THAT member's own phone
--   3. agent_confirmations                single-use, 5-minute confirm tokens
--                                         for the two sensitive actions
--   4. agent_audit_log                    who/what/when for sensitive actions
--
-- ADDITIVE ONLY. Nothing here alters profiles, user_roles, notifications or the
-- auth trigger (those are shared with Kidushishi). Only Bayit-owned tables are
-- touched: household_agent_tokens gets two new columns; two new tables are
-- created. Idempotent (IF NOT EXISTS / guarded blocks) so it is safe to re-run.
--
-- The application code degrades safely while this is NOT applied: a token with
-- no `scopes` column is treated as the default scopes (read + add/complete
-- tasks), `deliver_to_me` / `delete_tasks` cannot exist, and the two new tables
-- are only touched by those two sensitive actions (which then fail closed).
--
-- Numbered after 023_task_review_flag.sql.

BEGIN;

-- 1 + 2. New columns on the Bayit-owned token table.
-- Existing rows get the default scopes automatically (ADD COLUMN ... DEFAULT
-- fills them) and created_by = NULL (=> they can never use deliver_to_me).
ALTER TABLE public.household_agent_tokens
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT ARRAY['read', 'write']::text[];

ALTER TABLE public.household_agent_tokens
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Only known scope names may be stored.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'household_agent_tokens_scopes_known'
      AND conrelid = 'public.household_agent_tokens'::regclass
  ) THEN
    ALTER TABLE public.household_agent_tokens
      ADD CONSTRAINT household_agent_tokens_scopes_known
      CHECK (scopes <@ ARRAY['read', 'write', 'deliver_to_me', 'delete_tasks']::text[]);
  END IF;
END $$;

COMMENT ON COLUMN public.household_agent_tokens.scopes IS
  'What this token may do. Default {read,write} = list/add/complete tasks, plans, briefs. Opt-in: deliver_to_me (WhatsApp to the creator''s own phone only), delete_tasks. Fixed at creation; never widened in place.';
COMMENT ON COLUMN public.household_agent_tokens.created_by IS
  'auth.users id of the household member who created the token. "deliver_to_me" resolves "me" from this. NULL for tokens issued before this migration or by script.';

-- 3. Single-use confirmations. Only the SHA-256 of the confirm token is stored.
CREATE TABLE IF NOT EXISTS public.agent_confirmations (
  confirm_hash text PRIMARY KEY,
  token_id uuid NOT NULL REFERENCES public.household_agent_tokens(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- 'delete_task' | 'deliver_to_me'
  action text NOT NULL,
  -- What the confirmation is bound to: the task id, or "<what>:<hash of the
  -- recipient number>". A confirm token cannot be replayed on another target.
  target text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_confirmations_token_idx
  ON public.agent_confirmations (token_id);
CREATE INDEX IF NOT EXISTS agent_confirmations_expires_idx
  ON public.agent_confirmations (expires_at);

-- 4. Audit log of sensitive actions.
CREATE TABLE IF NOT EXISTS public.agent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- Kept as plain uuid (no FK): the log must outlive a revoked/removed token.
  token_id uuid,
  token_label text,
  actor_user_id uuid,
  -- 'delete_task' | 'deliver_to_me'
  action text NOT NULL,
  target text,
  -- 'preview' | 'executed' | 'denied' | 'rejected' | 'failed'
  outcome text NOT NULL,
  -- Short human note (e.g. the deleted task's title). Never a phone number.
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_audit_log_household_created_idx
  ON public.agent_audit_log (household_id, created_at DESC);

-- Service-role only, same pattern as household_agent_tokens (migration 020):
-- RLS on with zero client policies, and privileges revoked at the grant level.
ALTER TABLE public.agent_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agent_confirmations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.agent_confirmations TO service_role;
REVOKE ALL ON TABLE public.agent_audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.agent_audit_log TO service_role;

COMMENT ON TABLE public.agent_confirmations IS
  'Single-use 5-minute confirm tokens for agent delete_task / deliver_to_me. Service-role only.';
COMMENT ON TABLE public.agent_audit_log IS
  'Audit trail of sensitive agent actions (previews, executions, denials). Service-role only.';

COMMIT;
