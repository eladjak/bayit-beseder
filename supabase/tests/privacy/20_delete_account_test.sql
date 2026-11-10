-- Integration test for public.bayit_delete_account against a REAL Postgres with
-- the real Bayit schema, a stand-in for the events app, and real foreign keys.
\set ON_ERROR_STOP on
\pset tuples_only on

CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF c IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', m; END IF;
  RAISE NOTICE 'PASS %', m;
END $$;

-- A person with a household and some Bayit data of every kind.
CREATE FUNCTION pg_temp.mk_person(u uuid, hh uuid, role_in_hh text DEFAULT 'owner') RETURNS void LANGUAGE plpgsql AS $$
DECLARE t uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, u || '@t.test');          -- fires the events default-role trigger
  INSERT INTO public.households (id, name) VALUES (hh, 'h-' || hh) ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, display_name, household_id, points, streak, whatsapp_phone)
    VALUES (u, 'n', hh, 5, 3, '0500000000')
    ON CONFLICT (id) DO UPDATE SET household_id = hh, points = 5, streak = 3, whatsapp_phone = '0500000000';
  INSERT INTO public.household_members (household_id, user_id, role) VALUES (hh, u, role_in_hh);
  INSERT INTO public.tasks (id, title, household_id, assigned_to) VALUES (t, 'task-' || u, hh, u);
  INSERT INTO public.task_completions (task_id, user_id, photo_url) VALUES (t, u, 'https://x/task-photos/' || u || '.jpg');
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

-- ---------------------------------------------------------------- bystander
-- Somebody who must be completely unaffected by every deletion below.
SELECT pg_temp.mk_person('90000000-0000-0000-0000-000000000009', '99999999-0000-0000-0000-000000000009');
INSERT INTO public.event_assignments (user_id) VALUES ('90000000-0000-0000-0000-000000000009');
-- Triggers award points on completions, so compare against a snapshot instead of fixed numbers.
CREATE TEMP TABLE bystander_before AS SELECT to_jsonb(p) AS j FROM public.profiles p WHERE id = '90000000-0000-0000-0000-000000000009';

-- ------------------------------------------------ S1: only ever used this app
SELECT pg_temp.mk_person('10000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001');
SELECT pg_temp.delete_as_service('10000000-0000-0000-0000-000000000001') AS r1 \gset
SELECT pg_temp.ok((:'r1'::jsonb ->> 'auth_user_deleted')::boolean, 'S1 auth user deleted when the events app has nothing');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000001'), 'S1 auth.users row gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'), 'S1 profile gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '10000000-0000-0000-0000-000000000001'), 'S1 default role row gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.households WHERE id = '11111111-0000-0000-0000-000000000001'), 'S1 last-member household deleted');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '11111111-0000-0000-0000-000000000001'), 'S1 household tasks gone');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '10000000-0000-0000-0000-000000000001'), 'S1 consent record gone');
SELECT pg_temp.ok((:'r1'::jsonb -> 'photo_urls') @> to_jsonb('https://x/task-photos/10000000-0000-0000-0000-000000000001.jpg'::text), 'S1 photo list returned for storage cleanup');
SELECT pg_temp.ok(:'r1'::jsonb ->> 'household' = 'deleted', 'S1 reports household deleted');

-- ------------- S2: also used by the events app, one case per kind of footprint
CREATE FUNCTION pg_temp.shared_case(u uuid, hh uuid, label text, setup text, expect_table text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
  PERFORM pg_temp.mk_person(u, hh);
  EXECUTE setup;
  r := pg_temp.delete_as_service(u);
  PERFORM pg_temp.ok(NOT (r ->> 'auth_user_deleted')::boolean, label || ': reports the auth user was KEPT');
  PERFORM pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = u), label || ': auth user still exists (EVENTS_DAMAGED if not)');
  PERFORM pg_temp.ok(EXISTS (SELECT 1 FROM public.profiles WHERE id = u), label || ': profile still exists');
  PERFORM pg_temp.ok(EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u), label || ': events role row still exists');
  PERFORM pg_temp.ok((r -> 'kept_because') @> to_jsonb(expect_table), label || ': says why (' || expect_table || ')');
  PERFORM pg_temp.ok((SELECT household_id IS NULL AND points = 0 AND streak = 0 AND whatsapp_phone IS NULL FROM public.profiles WHERE id = u), label || ': only this app profile columns were cleared');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.tasks WHERE household_id = hh), label || ': this app household data is gone');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = u), label || ': this app consent record is gone');
END $$;

SELECT pg_temp.shared_case('20000000-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-00000000000a', 'S2a event_assignments (FK to auth.users)',
  $q$INSERT INTO public.event_assignments (user_id) VALUES ('20000000-0000-0000-0000-00000000000a')$q$, 'public.event_assignments');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.event_assignments WHERE user_id = '20000000-0000-0000-0000-00000000000a'), 'S2a events row survived');

SELECT pg_temp.shared_case('20000000-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-00000000000b', 'S2b events.created_by (FK to profiles, CASCADE)',
  $q$INSERT INTO public.events (title, created_by) VALUES ('keep-me', '20000000-0000-0000-0000-00000000000b')$q$, 'public.events');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.events WHERE title = 'keep-me'), 'S2b events row survived (a profile delete would have cascaded it away)');

SELECT pg_temp.shared_case('20000000-0000-0000-0000-00000000000c', '22222222-0000-0000-0000-00000000000c', 'S2c volunteer_notes (no FK at all)',
  $q$INSERT INTO public.volunteer_notes (volunteer_id, note) VALUES ('20000000-0000-0000-0000-00000000000c', 'keep-note')$q$, 'public.volunteer_notes');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.volunteer_notes WHERE note = 'keep-note'), 'S2c notes row survived');

SELECT pg_temp.shared_case('20000000-0000-0000-0000-00000000000d', '22222222-0000-0000-0000-00000000000d', 'S2d table nobody listed (FK found from the catalog)',
  $q$INSERT INTO public.zz_unknown_app_table (owner_ref) VALUES ('20000000-0000-0000-0000-00000000000d')$q$, 'public.zz_unknown_app_table');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.zz_unknown_app_table WHERE owner_ref = '20000000-0000-0000-0000-00000000000d'), 'S2d unknown-table row survived');

SELECT pg_temp.shared_case('20000000-0000-0000-0000-00000000000e', '22222222-0000-0000-0000-00000000000e', 'S2e elevated events role',
  $q$UPDATE public.user_roles SET role = 'coordinator' WHERE user_id = '20000000-0000-0000-0000-00000000000e'$q$, 'public.user_roles(non-default role)');
SELECT pg_temp.ok((SELECT role FROM public.user_roles WHERE user_id = '20000000-0000-0000-0000-00000000000e') = 'coordinator', 'S2e role untouched');

-- ------------------------------------------ S3: household that carries on without me
SELECT pg_temp.mk_person('30000000-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000003', 'owner');
SELECT pg_temp.mk_person('30000000-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'member');
SELECT pg_temp.delete_as_service('30000000-0000-0000-0000-000000000005') AS r3 \gset
SELECT pg_temp.ok(:'r3'::jsonb ->> 'household' = 'left', 'S3 reports the household was left, not deleted');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = '33333333-0000-0000-0000-000000000003'), 'S3 household still exists for the partner');
SELECT pg_temp.ok((SELECT role FROM public.household_members WHERE user_id = '30000000-0000-0000-0000-000000000006') = 'owner', 'S3 partner became owner');
SELECT pg_temp.ok(:'r3'::jsonb ->> 'new_owner_id' = '30000000-0000-0000-0000-000000000006', 'S3 new owner reported');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.tasks WHERE title = 'task-30000000-0000-0000-0000-000000000006'), 'S3 partner task kept');
SELECT pg_temp.ok((SELECT assigned_to IS NULL FROM public.tasks WHERE title = 'task-30000000-0000-0000-0000-000000000005'), 'S3 shared task kept but no longer points at the deleted person');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '30000000-0000-0000-0000-000000000005'), 'S3 leaver auth user deleted');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '30000000-0000-0000-0000-000000000006'), 'S3 partner untouched');

-- ------------------------------------------ S4: a failure at the last step undoes everything
SELECT pg_temp.mk_person('40000000-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000007');
CREATE FUNCTION public.zz_boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure at the final delete'; END $$;
CREATE TRIGGER zz_boom BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.zz_boom();
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('40000000-0000-0000-0000-000000000007');
  RAISE EXCEPTION 'ASSERT FAILED: S4 the injected failure did not surface';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'injected failure%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS S4 failure surfaced';
END $$;
DROP TRIGGER zz_boom ON auth.users;
DROP FUNCTION public.zz_boom();
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '40000000-0000-0000-0000-000000000007'), 'S4 auth user still there');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = '44444444-0000-0000-0000-000000000007'), 'S4 household still there (nothing half-deleted)');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '44444444-0000-0000-0000-000000000007'), 'S4 tasks still there');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '40000000-0000-0000-0000-000000000007'), 'S4 consent record still there');

-- ------------------------------------------ S5: a paying subscription blocks deletion
SELECT pg_temp.mk_person('50000000-0000-0000-0000-000000000008', '55555555-0000-0000-0000-000000000008');
INSERT INTO public.subscriptions (household_id, user_id, tier, status) VALUES ('55555555-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000008', 'plus', 'active');
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('50000000-0000-0000-0000-000000000008');
  RAISE EXCEPTION 'ASSERT FAILED: S5 deletion went through with an active subscription';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'active_subscription' THEN RAISE; END IF;
  RAISE NOTICE 'PASS S5 refused with active_subscription';
END $$;
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '50000000-0000-0000-0000-000000000008') AND EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '55555555-0000-0000-0000-000000000008'), 'S5 nothing was deleted');

-- ------------------------------------------ S6: only the service role may call it
DO $$
DECLARE who text;
BEGIN
  FOREACH who IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', who);
      PERFORM public.bayit_delete_account('90000000-0000-0000-0000-000000000009');
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION 'ASSERT FAILED: S6 % could call the delete function', who;
    EXCEPTION WHEN insufficient_privilege THEN
      EXECUTE 'RESET ROLE';
      RAISE NOTICE 'PASS S6 % is refused', who;
    END;
  END LOOP;
END $$;

-- ------------------------------------------ S7: unknown user
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service(gen_random_uuid());
  RAISE EXCEPTION 'ASSERT FAILED: S7 deleted a user that does not exist';
EXCEPTION WHEN no_data_found THEN
  RAISE NOTICE 'PASS S7 unknown user refused';
END $$;

-- ------------------------------------------ S8: the bystander was never touched
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = '90000000-0000-0000-0000-000000000009'), 'S8 bystander auth user untouched');
SELECT pg_temp.ok((SELECT to_jsonb(p) FROM public.profiles p WHERE id = '90000000-0000-0000-0000-000000000009') = (SELECT j FROM bystander_before), 'S8 bystander profile is byte-for-byte what it was');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.tasks WHERE household_id = '99999999-0000-0000-0000-000000000009'), 'S8 bystander household data untouched');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.event_assignments WHERE user_id = '90000000-0000-0000-0000-000000000009'), 'S8 bystander events data untouched');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = '90000000-0000-0000-0000-000000000009'), 'S8 bystander consent untouched');
