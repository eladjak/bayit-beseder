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
-- Exception on purpose: a person can always READ THEIR OWN subscription rows
-- (user_id = auth.uid()), so the gate can offer "cancel my subscription".
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
      RAISE NOTICE 'consent gate: table % has row level security OFF, a policy would do nothing, skipped', t;
      CONTINUE;
    END IF;

    IF t = 'subscriptions' THEN
      -- reads of one's own rows stay possible without consent (to cancel a paid plan)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate_select') THEN
        EXECUTE format('CREATE POLICY bayit_consent_gate_select ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.bayit_has_current_consent() OR user_id = auth.uid())', t);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate_insert') THEN
        EXECUTE format('CREATE POLICY bayit_consent_gate_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.bayit_has_current_consent())', t);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate_update') THEN
        EXECUTE format('CREATE POLICY bayit_consent_gate_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.bayit_has_current_consent()) WITH CHECK (public.bayit_has_current_consent())', t);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate_delete') THEN
        EXECUTE format('CREATE POLICY bayit_consent_gate_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.bayit_has_current_consent())', t);
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'bayit_consent_gate') THEN
      EXECUTE format('CREATE POLICY bayit_consent_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.bayit_has_current_consent()) WITH CHECK (public.bayit_has_current_consent())', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
