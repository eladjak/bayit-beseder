-- BayitBeSeder: the privacy gate, enforced in the database (not only in the Next.js server).
--
-- Why: existing row-level security says WHICH household's rows a signed-in user may reach. It
-- does not say the person accepted the current policy, so a browser holding a valid session
-- could read and write household data directly through the Supabase API. This migration adds
-- one RESTRICTIVE policy per Bayit table: permissive policies stay exactly as they are, and
-- this one is ANDed to them, so nobody gains access, people without a current consent row lose it.
--
-- SCOPE: only tables that belong to BayitBeSeder (list below). NOTHING is added to the events
-- app's tables, and NOTHING to public.profiles (shared with the events app, whose users have no
-- consent row; the profile stays reachable, which is also what the gate needs to render).
-- public.privacy_consents itself has no restrictive policy: own insert / own select (migration 026).
-- NO read exceptions: a person without a current consent reads NOTHING of this app's data from the
-- browser, not even their own subscription rows. The gate screen learns "is there a billing
-- subscription to cancel" from a server route (GET /api/sumit/cancel-subscription, a boolean only),
-- and cancelling goes through the same allow-listed route.
-- The deletion function (027) is SECURITY DEFINER and is not subject to these policies.
-- Service role bypasses row-level security as before.
--
-- Bumping the policy version: src/lib/privacy/policy.ts POLICY_VERSION and the literal in
-- public.bayit_has_current_consent() below must change together (a test compares them).
-- Additive and idempotent. Rollback: supabase/rollbacks/028_consent_gate_rls_rollback.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.bayit_has_current_consent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM public.privacy_consents c
     WHERE c.user_id = auth.uid()
       AND c.policy_version = '2026-11-10'
       AND c.age_confirmed IS TRUE
       AND c.privacy_accepted IS TRUE
       AND c.terms_accepted IS TRUE
  );
$fn$;

REVOKE ALL ON FUNCTION public.bayit_has_current_consent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bayit_has_current_consent() TO authenticated, service_role;

DO $$
DECLARE
  t text;
  v_tables text[] := ARRAY[
    'agent_audit_log','agent_confirmations','app_feedback','coaching_events',
    'household_agent_tokens','household_members','households','love_tokens','meal_plan','meals',
    'shopping_categories','shopping_items','streaks','subscriptions','surprise_box_opens',
    'task_categories','task_completions','task_instances','task_templates','tasks',
    'user_achievements','user_medals','weekly_syncs','whatsapp_webhook_events','wheel_spins'
  ];
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'consent gate: table % does not exist here, skipped', t;
      CONTINUE;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', t)::regclass) THEN
      -- A policy on a table with row level security OFF would silently do nothing, and turning it on here
      -- would lock people out. Refuse: this must be decided deliberately, not skipped.
      RAISE EXCEPTION 'consent gate: table public.% has row level security OFF; enable it deliberately before applying this migration', t;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate') THEN
      EXECUTE format('CREATE POLICY bayit_consent_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.bayit_has_current_consent()) WITH CHECK (public.bayit_has_current_consent())', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
