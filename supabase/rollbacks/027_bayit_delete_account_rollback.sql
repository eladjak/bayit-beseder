-- Rollback for supabase/migrations/027_bayit_delete_account.sql.
-- Removes only the function. No data is touched.
BEGIN;
DROP FUNCTION IF EXISTS public.bayit_delete_account(uuid);
COMMIT;
