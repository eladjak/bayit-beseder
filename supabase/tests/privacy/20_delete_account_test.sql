-- Integration test for public.bayit_delete_account (migration 027) on a REAL Postgres.
-- Runs on the repo schema + a stand-in events app, or on the schema dumped from the live project.
-- Core promise: the shared identity (auth.users, profiles) is NEVER deleted by this function.
\set ON_ERROR_STOP on
\pset tuples_only on

CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF c IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', m; END IF;
  RAISE NOTICE 'PASS %', m;
END $$;

-- Counts of every table that is NOT this app's, as one text blob: must be identical before and after.
CREATE FUNCTION pg_temp.other_app_fingerprint() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record; out text := ''; n bigint;
  bayit text[] := ARRAY['achievements','agent_audit_log','agent_confirmations','app_feedback','billing_events','categories','coaching_events','coaching_messages','household_agent_tokens','household_members','households','love_tokens','meal_plan','meals','privacy_consents','shopping_categories','shopping_items','streaks','subscriptions','surprise_box_opens','task_categories','task_completions','task_instances','task_templates','tasks','user_achievements','user_medals','weekly_syncs','whatsapp_webhook_events','wheel_spins','bayit_identity_deletion_requests','bayit_storage_cleanup'];
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND NOT (c.relname = ANY (bayit)) ORDER BY 1 LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.relname) INTO n;
    out := out || r.relname || '=' || n || ';';
  END LOOP;
  RETURN out;
END $$;

CREATE FUNCTION pg_temp.mk_person(u uuid, hh uuid, role_in_hh text DEFAULT 'owner') RETURNS void LANGUAGE plpgsql AS $$
DECLARE t uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, u || '@t.test');
  INSERT INTO public.households (id, name) VALUES (hh, 'h-' || hh) ON CONFLICT DO NOTHING;
  -- (live schema: a trigger creates the profile; repo schema: the test does. NOT NULL is checked before ON CONFLICT, so test for existence.)
  INSERT INTO public.profiles (id, display_name) SELECT u, 'n' WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u);
  UPDATE public.profiles SET household_id = hh, points = 5, streak = 3, whatsapp_phone = '0500000000' WHERE id = u;
  INSERT INTO public.household_members (household_id, user_id, role) VALUES (hh, u, role_in_hh);
  INSERT INTO public.tasks (id, title, household_id, assigned_to) VALUES (t, 'task-' || u, hh, u);
  INSERT INTO public.task_completions (task_id, user_id, photo_url)
    VALUES (t, u, 'https://x.example/storage/v1/object/public/task-photos/' || u || '/' || t || '-1.webp');
  INSERT INTO public.streaks (user_id, household_id, streak_type) VALUES (u, hh, 'daily');
  INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted)
    VALUES (u, '2026-11-10', true, true, true);
END $$;

CREATE FUNCTION pg_temp.delete_as_service(u uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
  EXECUTE 'SET LOCAL ROLE service_role';
  SELECT public.bayit_delete_account(u) INTO r;
  EXECUTE 'RESET ROLE';
  RETURN r;
END $$;

-- bystander: another person, and, where the stand-in events app exists, with events data
SELECT pg_temp.mk_person('90000000-0000-0000-0000-000000000009', '99999999-0000-0000-0000-000000000009');
DO $$
BEGIN
  IF to_regclass('public.event_assignments') IS NOT NULL AND to_regclass('public.zz_unknown_app_table') IS NOT NULL THEN
    INSERT INTO public.event_assignments (user_id) VALUES ('90000000-0000-0000-0000-000000000009');
  END IF;
END $$;
CREATE TEMP TABLE bystander_before AS SELECT to_jsonb(p) AS j FROM public.profiles p WHERE id = '90000000-0000-0000-0000-000000000009';

-- ------------------------------------------------ S1: the shared identity is NEVER deleted
SELECT pg_temp.mk_person('10000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001');
-- the other app's data about this very person, wherever a stand-in exists:
DO $$
DECLARE u uuid := '10000000-0000-0000-0000-000000000001';
BEGIN
  IF to_regclass('public.zz_unknown_app_table') IS NOT NULL THEN
    INSERT INTO public.event_assignments (user_id) VALUES (u);
    INSERT INTO public.events (title, created_by) VALUES ('keep-me', u);
    INSERT INTO public.volunteer_notes (volunteer_id, note) VALUES (u, 'keep-note');
    INSERT INTO public.zz_unknown_app_table (owner_ref) VALUES (u);
  END IF;
END $$;
CREATE TEMP TABLE fp_before AS SELECT pg_temp.other_app_fingerprint() AS f;
SELECT pg_temp.delete_as_service('10000000-0000-0000-0000-000000000001') AS r1 \gset
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000001'), 'S1 the auth user is KEPT (shared with the events app)');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'), 'S1 the shared profile row is KEPT');
SELECT pg_temp.ok((:'r1'::jsonb ->> 'identity_deletion_requested')::boolean, 'S1 reports that a full identity deletion was requested');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.bayit_identity_deletion_requests WHERE user_id = '10000000-0000-0000-0000-000000000001' AND status = 'pending'), 'S1 the request is recorded for the owner');
SELECT pg_temp.ok((SELECT household_id IS NULL AND points = 0 AND streak = 0 AND whatsapp_phone IS NULL FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'), 'S1 this app columns on the profile are cleared');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.households WHERE id = '11111111-0000-0000-0000-000000000001'), 'S1 last-member household deleted');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '11111111-0000-0000-0000-000000000001'), 'S1 household tasks gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '10000000-0000-0000-0000-000000000001'), 'S1 consent record gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = '10000000-0000-0000-0000-000000000001'), 'S1 membership gone');
SELECT pg_temp.ok(pg_temp.other_app_fingerprint() = (SELECT f FROM fp_before), 'S1 NOTHING in any other-app table changed (row counts of every non-Bayit table identical)');
SELECT pg_temp.ok(:'r1'::jsonb ->> 'household' = 'deleted', 'S1 reports household deleted');
SELECT pg_temp.ok((:'r1'::jsonb -> 'object_names') @> to_jsonb((SELECT object_name FROM public.bayit_storage_cleanup LIMIT 1)), 'S1 the own photo is returned and queued durably');
SELECT pg_temp.ok((SELECT count(*) FROM public.bayit_storage_cleanup) = 1, 'S1 exactly one object queued');

-- running it twice is harmless
SELECT pg_temp.delete_as_service('10000000-0000-0000-0000-000000000001') AS r1b \gset
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000001') AND (SELECT count(*) FROM public.bayit_identity_deletion_requests WHERE user_id = '10000000-0000-0000-0000-000000000001') = 1, 'S1b second run: still kept, still exactly one request');

-- ------------------------------------------------ S2: which subscriptions block
SELECT pg_temp.mk_person('20000000-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-00000000000a');
INSERT INTO public.subscriptions (household_id, user_id, tier, status, current_period_end) VALUES ('22222222-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'free', 'active', now() + interval '30 days');
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('20000000-0000-0000-0000-00000000000a');
  RAISE NOTICE 'PASS S2a a FREE active subscription row does not block deletion';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'active_subscription' THEN RAISE EXCEPTION 'ASSERT FAILED: S2a a FREE active subscription row blocked deletion'; END IF;
  RAISE;
END $$;
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.households WHERE id = '22222222-0000-0000-0000-00000000000a'), 'S2a the household was deleted');

SELECT pg_temp.mk_person('20000000-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-00000000000b');
INSERT INTO public.subscriptions (household_id, user_id, tier, status, sumit_subscription_id) VALUES ('22222222-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'plus', 'active', 'sub-1');
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('20000000-0000-0000-0000-00000000000b');
  RAISE EXCEPTION 'ASSERT FAILED: S2b deletion went through with a billing subscription';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'active_subscription' THEN RAISE; END IF;
  RAISE NOTICE 'PASS S2b a paid plan with a provider subscription id blocks deletion';
END $$;
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '22222222-0000-0000-0000-00000000000b'), 'S2b nothing was deleted');
UPDATE public.subscriptions SET canceled_at = now() WHERE user_id = '20000000-0000-0000-0000-00000000000b';
SELECT pg_temp.delete_as_service('20000000-0000-0000-0000-00000000000b') AS r2c \gset
SELECT pg_temp.ok(:'r2c'::jsonb ->> 'household' = 'deleted', 'S2c once cancelled, the same plan no longer blocks');

-- ------------------------------------------------ S3: a household that carries on
SELECT pg_temp.mk_person('30000000-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000003', 'owner');
SELECT pg_temp.mk_person('30000000-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'member');
INSERT INTO public.task_templates (household_id, title, category, recurrence_type, default_assignee)
  VALUES ('33333333-0000-0000-0000-000000000003', 'tpl', 'general', 'daily', '30000000-0000-0000-0000-000000000005');
SELECT pg_temp.delete_as_service('30000000-0000-0000-0000-000000000005') AS r3 \gset
SELECT pg_temp.ok(:'r3'::jsonb ->> 'household' = 'left', 'S3 reports the household was left');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = '33333333-0000-0000-0000-000000000003'), 'S3 household still exists for the partner');
SELECT pg_temp.ok((SELECT role FROM public.household_members WHERE user_id = '30000000-0000-0000-0000-000000000006') = 'owner', 'S3 partner became owner');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.tasks WHERE title = 'task-30000000-0000-0000-0000-000000000006'), 'S3 partner task kept');
SELECT pg_temp.ok((SELECT assigned_to IS NULL FROM public.tasks WHERE title = 'task-30000000-0000-0000-0000-000000000005'), 'S3 shared task kept but no longer points at the person');
SELECT pg_temp.ok((SELECT default_assignee IS NULL FROM public.task_templates WHERE title = 'tpl'), 'S3 a template default assignee no longer points at the person (surviving household)');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '30000000-0000-0000-0000-000000000005'), 'S3 leaver auth user kept');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '30000000-0000-0000-0000-000000000006'), 'S3 partner consent untouched');

-- ------------------------------------------------ S4: a failure at the very end undoes everything
SELECT pg_temp.mk_person('40000000-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000007');
CREATE FUNCTION public.zz_boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure at the final step'; END $$;
CREATE TRIGGER zz_boom BEFORE INSERT ON public.bayit_identity_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.zz_boom();
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('40000000-0000-0000-0000-000000000007');
  RAISE EXCEPTION 'ASSERT FAILED: S4 the injected failure did not surface';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'injected failure%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS S4 failure surfaced';
END $$;
DROP TRIGGER zz_boom ON public.bayit_identity_deletion_requests;
DROP FUNCTION public.zz_boom();
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = '44444444-0000-0000-0000-000000000007') AND EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '44444444-0000-0000-0000-000000000007') AND EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '40000000-0000-0000-0000-000000000007') AND (SELECT points FROM public.profiles WHERE id = '40000000-0000-0000-0000-000000000007') > 0, 'S4 nothing half-deleted');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.bayit_storage_cleanup WHERE object_name LIKE '40000000-%'), 'S4 no photo was queued');

-- ------------------------------------------------ S5: only the service role may call it
DO $$
DECLARE who text;
BEGIN
  FOREACH who IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', who);
      PERFORM public.bayit_delete_account('90000000-0000-0000-0000-000000000009');
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION 'ASSERT FAILED: S5 % could call the delete function', who;
    EXCEPTION WHEN insufficient_privilege THEN
      EXECUTE 'RESET ROLE';
      RAISE NOTICE 'PASS S5 % is refused', who;
    END;
  END LOOP;
END $$;
SELECT pg_temp.ok(NOT has_table_privilege('authenticated', 'public.bayit_identity_deletion_requests', 'SELECT') AND NOT has_table_privilege('anon', 'public.bayit_storage_cleanup', 'SELECT'), 'S5b the two service-only tables are closed to browser roles');

-- ------------------------------------------------ S6: unknown user
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service(gen_random_uuid());
  RAISE EXCEPTION 'ASSERT FAILED: S6 accepted a user that does not exist';
EXCEPTION WHEN no_data_found THEN
  RAISE NOTICE 'PASS S6 unknown user refused';
END $$;

-- ------------------------------------------------ S7: a crafted photo URL cannot queue someone else's object
SELECT pg_temp.mk_person('70000000-0000-0000-0000-000000000011', '77777777-0000-0000-0000-000000000011');
UPDATE public.task_completions SET photo_url = 'https://x.example/storage/v1/object/public/task-photos/90000000-0000-0000-0000-000000000009/somebody-elses-photo.webp'
  WHERE user_id = '70000000-0000-0000-0000-000000000011';
TRUNCATE public.bayit_storage_cleanup;
SELECT pg_temp.delete_as_service('70000000-0000-0000-0000-000000000011') AS r7 \gset
SELECT pg_temp.ok(jsonb_array_length(:'r7'::jsonb -> 'object_names') = 0 AND (SELECT count(*) FROM public.bayit_storage_cleanup) = 0, 'S7 an object that is not provably the person own is never queued for removal');

-- ------------------------------------------------ S8: the bystander was never touched
SELECT pg_temp.ok((SELECT to_jsonb(p) FROM public.profiles p WHERE id = '90000000-0000-0000-0000-000000000009') = (SELECT j FROM bystander_before), 'S8 bystander profile is byte-for-byte what it was');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '90000000-0000-0000-0000-000000000009') AND EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '99999999-0000-0000-0000-000000000009') AND EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '90000000-0000-0000-0000-000000000009'), 'S8 bystander login, household data and consent untouched');
