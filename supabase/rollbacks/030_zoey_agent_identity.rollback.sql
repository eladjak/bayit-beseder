-- Rollback of 030_zoey_agent_identity.sql. Revoke Zoey tokens FIRST, otherwise the
-- DELETE below removes them (they are meaningless without is_agent anyway).
BEGIN;
UPDATE public.household_agent_tokens SET revoked_at = now() WHERE is_agent AND revoked_at IS NULL;
ALTER TABLE public.household_agent_tokens DROP CONSTRAINT IF EXISTS household_agent_tokens_agent_named;
ALTER TABLE public.household_agent_tokens DROP COLUMN IF EXISTS agent_name;
ALTER TABLE public.household_agent_tokens DROP COLUMN IF EXISTS is_agent;
-- Audit columns are kept by default (evidence outlives the identity). Uncomment to drop:
-- ALTER TABLE public.agent_audit_log DROP COLUMN IF EXISTS confirm_text;
-- ALTER TABLE public.agent_audit_log DROP COLUMN IF EXISTS agent_name;
COMMIT;
