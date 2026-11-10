-- Rollback for supabase/migrations/026_privacy_consent.sql.
-- Deletes every recorded consent (everyone will see the privacy gate again).
BEGIN;
DROP POLICY IF EXISTS "bayit_consent_insert_own" ON public.privacy_consents;
DROP POLICY IF EXISTS "bayit_consent_select_own" ON public.privacy_consents;
DROP TABLE IF EXISTS public.privacy_consents;
DROP FUNCTION IF EXISTS public.bayit_consent_server_time();
COMMIT;
