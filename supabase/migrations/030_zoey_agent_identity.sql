-- BayitBeSeder - named agent identity "Zoey (סוכנת)" (owner decision 12.11.2026).
--
-- EXTENDS the per-household token mechanism (020 + 024). No second mechanism:
-- a Zoey credential is a household_agent_tokens row (SHA-256 hashed like every
-- other token) flagged is_agent, pinned to ONE household, carrying all four scopes.
--
--   household_agent_tokens.is_agent / agent_name   which rows are the named agent
--   agent_audit_log.agent_name / confirm_text      who acted + the human instruction
--                                                  behind a guarded (delete/send) action
--
-- ADDITIVE and idempotent. DO NOT APPLY to a real project from this PR; it is applied
-- in the go-live phase (see GO-LIVE). Code degrades safely while it is NOT applied:
-- no is_agent column -> every token is a normal token, and Zoey keys cannot be issued.
-- Rollback: supabase/rollbacks/030_zoey_agent_identity.rollback.sql

BEGIN;

ALTER TABLE public.household_agent_tokens
  ADD COLUMN IF NOT EXISTS is_agent boolean NOT NULL DEFAULT false;
ALTER TABLE public.household_agent_tokens
  ADD COLUMN IF NOT EXISTS agent_name text;

-- A named agent must have a name; a normal token must not.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'household_agent_tokens_agent_named'
      AND conrelid = 'public.household_agent_tokens'::regclass
  ) THEN
    ALTER TABLE public.household_agent_tokens
      ADD CONSTRAINT household_agent_tokens_agent_named
      CHECK ((is_agent AND agent_name IS NOT NULL) OR (NOT is_agent AND agent_name IS NULL));
  END IF;
END $$;

ALTER TABLE public.agent_audit_log
  ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE public.agent_audit_log
  ADD COLUMN IF NOT EXISTS confirm_text text;

COMMENT ON COLUMN public.household_agent_tokens.is_agent IS
  'true = the named Zoey agent identity (guard rails: delete/send need X-Agent-Confirm, else 428; every write audited; 60 writes/min).';
COMMENT ON COLUMN public.agent_audit_log.confirm_text IS
  'The human instruction text carried in X-Agent-Confirm for a guarded action. Never contains secrets.';

COMMIT;
