-- Rollback for supabase/migrations/027_bayit_delete_account.sql.
-- Refuses while identity-deletion requests or queued photo cleanups exist: those are work the
-- owner still has to do, and dropping the tables would lose them. Export or finish them first.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.bayit_identity_deletion_requests') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.bayit_identity_deletion_requests) THEN
    RAISE EXCEPTION 'pending identity deletion requests exist; handle or export them before rolling back';
  END IF;
  IF to_regclass('public.bayit_storage_cleanup') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.bayit_storage_cleanup) THEN
    RAISE EXCEPTION 'queued photo cleanups exist; finish or export them before rolling back';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.bayit_delete_account(uuid);
DROP TABLE IF EXISTS public.bayit_storage_cleanup;
DROP TABLE IF EXISTS public.bayit_identity_deletion_requests;
COMMIT;
