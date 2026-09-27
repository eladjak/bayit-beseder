-- BayitBeSeder — per-household agent tokens.
--
-- Closes the gap documented in docs/AGENT-API-MULTI-TENANT-GAP.md and designed
-- in docs/DESIGN-per-household-agent-tokens.md: today every /api/agent/*
-- request authenticates with ONE shared key (BAYIT_AGENT_KEY) and trusts a
-- `householdId` written into the request body/query by the caller itself.
-- Anyone holding the shared key can therefore act on ANY household.
--
-- This migration only adds a new table. It does not touch any existing
-- table, and it is additive/idempotent (every DROP/CREATE below is guarded)
-- so it is safe to re-run. Applying it does nothing on its own — the shared
-- key keeps working until src/lib/agent/auth.ts is deployed to prefer
-- per-household tokens (see this PR's application code changes).
--
-- Numbered after 019_close_live_rls_holes.sql (the latest migration in this
-- repo as of 2026-09-27).

BEGIN;

CREATE TABLE IF NOT EXISTS public.household_agent_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- SHA-256 hex digest of the raw token. The raw token is shown to whoever
  -- issues it exactly once (see scripts/issue-agent-token.mjs) and is never
  -- written to this table or anywhere else — only its hash is stored, the
  -- same principle as a password hash. A hash collision recovering the raw
  -- token is not feasible; a stolen hash cannot be replayed as a bearer
  -- token because the API compares hashes of PRESENTED tokens, never raw
  -- values from this table.
  token_hash text NOT NULL,
  -- Human label so an admin can tell tokens apart when listing/revoking
  -- (e.g. "Kami production", "dev worktree"). Not security-relevant.
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- NULL = active. Set once, never cleared — a revoked token is never
  -- un-revoked; issue a new one instead. Revocation is per-token, so
  -- revoking one household's leaked token cannot affect any other
  -- household's tokens.
  revoked_at timestamptz
);

-- A token hash must be unique across the whole table (not just per
-- household) — two different households must never be able to end up
-- pointing at the same hash, which would make the household lookup
-- ambiguous. This is also the index verifyAgentRequest's lookup uses.
DROP INDEX IF EXISTS household_agent_tokens_token_hash_key;
CREATE UNIQUE INDEX household_agent_tokens_token_hash_key
  ON public.household_agent_tokens (token_hash);

CREATE INDEX IF NOT EXISTS household_agent_tokens_household_id_idx
  ON public.household_agent_tokens (household_id);

-- Only rows that are still active are relevant to auth lookups; a partial
-- index keeps that lookup path small as the table grows with revoked history.
DROP INDEX IF EXISTS household_agent_tokens_active_hash_idx;
CREATE UNIQUE INDEX household_agent_tokens_active_hash_idx
  ON public.household_agent_tokens (token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.household_agent_tokens ENABLE ROW LEVEL SECURITY;

-- No policies for `anon` or `authenticated` are created on purpose. With RLS
-- enabled and zero policies, both roles are denied by default for every
-- DML operation (select/insert/update/delete). Only the service-role key
-- (which bypasses RLS entirely, by Postgres/PostgREST design) can read or
-- write this table — exactly what src/lib/agent/tokens.ts and
-- src/lib/agent/auth.ts use. This mirrors the task_instances/task_templates/
-- weekly_syncs sections of 019_close_live_rls_holes.sql, which use the same
-- "RLS on, no client policy" pattern for service-role-only tables.
--
-- RLS alone is NOT enough, though: TRUNCATE is not governed by row-level
-- policies at all (it is a table-level DDL-adjacent operation), and Supabase
-- grants PostgREST's `anon`/`authenticated` roles default table privileges
-- (SELECT/INSERT/UPDATE/DELETE — and, on some setups, TRUNCATE) on every new
-- table in `public` unless explicitly revoked. Revoking those privileges
-- outright closes that gap at the grant level, independent of RLS, and is a
-- second, independent reason `anon`/`authenticated` cannot touch this table
-- even if a future migration ever adds a client policy here by mistake.
REVOKE ALL ON TABLE public.household_agent_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.household_agent_tokens TO service_role;

COMMENT ON TABLE public.household_agent_tokens IS
  'Per-household bearer tokens for /api/agent/* (see docs/DESIGN-per-household-agent-tokens.md). Service-role only — no client policies.';

COMMIT;
