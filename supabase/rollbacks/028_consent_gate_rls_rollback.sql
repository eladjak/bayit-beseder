-- Rollback for supabase/migrations/028_consent_gate_rls.sql: removes the restrictive policies and
-- the helper function, nothing else. Data is untouched.
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
            WHERE schemaname = 'public' AND policyname IN
              ('bayit_consent_gate','bayit_consent_gate_select','bayit_consent_gate_insert','bayit_consent_gate_update','bayit_consent_gate_delete')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.bayit_has_current_consent();
COMMIT;
