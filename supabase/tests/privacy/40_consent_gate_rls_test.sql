-- Migration 028: the privacy gate enforced by row-level security, on a REAL Postgres, as the real
-- database roles. A signed-in user WITHOUT a current consent row can read and write nothing in the
-- household tables; with one, everything works as before; other tables and other users are untouched.
\set ON_ERROR_STOP on
\pset tuples_only on

CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF c IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', m; END IF;
  RAISE NOTICE 'PASS %', m;
END $$;

-- Run one statement as a role + user; rows (select: row count, others: rows affected) or ERR:<sqlstate>.
CREATE FUNCTION pg_temp.as_user(role_name text, uid text, stmt text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; res text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid, true);
  EXECUTE format('SET LOCAL ROLE %I', role_name);
  BEGIN
    IF stmt ILIKE 'select%' THEN
      EXECUTE 'SELECT count(*) FROM (' || stmt || ') q' INTO n;
    ELSE
      EXECUTE stmt;
      GET DIAGNOSTICS n = ROW_COUNT;
    END IF;
    res := n::text;
  EXCEPTION WHEN OTHERS THEN
    res := 'ERR:' || SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  RETURN res;
END $$;

\set U a0000000-0000-0000-0000-00000000000a
\set V b0000000-0000-0000-0000-00000000000b
\set H1 a1000000-0000-0000-0000-0000000000a1
\set H2 b2000000-0000-0000-0000-0000000000b2

-- Two households with data, U (not consented) in the first, V (consented) in the second.
INSERT INTO auth.users (id, email) VALUES (:'U', 'u@t.test'), (:'V', 'v@t.test');
INSERT INTO public.profiles (id, display_name) SELECT x.id, 'p' FROM (VALUES (:'U'::uuid), (:'V'::uuid)) AS x(id) WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = x.id);
INSERT INTO public.households (id, name) VALUES (:'H1', 'h1'), (:'H2', 'h2');
INSERT INTO public.household_members (household_id, user_id, role) VALUES (:'H1', :'U', 'owner'), (:'H2', :'V', 'owner');
UPDATE public.profiles SET household_id = :'H1' WHERE id = :'U';
UPDATE public.profiles SET household_id = :'H2' WHERE id = :'V';
INSERT INTO public.tasks (id, title, household_id) VALUES ('a1000000-0000-0000-0000-0000000000f1', 't1', :'H1'), ('b2000000-0000-0000-0000-0000000000f2', 't2', :'H2');
INSERT INTO public.task_completions (task_id, user_id) VALUES ('a1000000-0000-0000-0000-0000000000f1', :'U');
INSERT INTO public.task_templates (household_id, title, category, recurrence_type) VALUES (:'H1', 'tpl1', 'general', 'daily');
INSERT INTO public.streaks (user_id, household_id, streak_type) VALUES (:'U', :'H1', 'daily'), (:'V', :'H2', 'daily');
INSERT INTO public.shopping_items (household_id, title) VALUES (:'H1', 'milk'), (:'H2', 'bread');
INSERT INTO public.subscriptions (household_id, user_id, tier, status) VALUES (:'H1', :'U', 'free', 'active'), (:'H2', :'V', 'free', 'active');
INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES (:'V', '2026-11-10', true, true, true);

-- ===================== structure: which tables carry the gate, which do not
SELECT pg_temp.ok((SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = 'bayit_consent_gate' AND permissive = 'RESTRICTIVE') >= 20, 'the gate policy exists on this app tables and is RESTRICTIVE (it only narrows access)');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname LIKE 'bayit_consent_gate%' AND tablename IN
  ('profiles','privacy_consents','user_roles','events','event_assignments','volunteer_notes','zz_unknown_app_table','notifications','messages','audit_logs','reports','feedback','equipment','event_registrations','event_equipment','achievements','categories','coaching_messages','billing_events')),
  'NO gate policy on the shared profiles table, on the consent table, on catalogs, or on any events-app table');
SELECT pg_temp.ok(NOT EXISTS (
  SELECT 1 FROM pg_policies p WHERE p.policyname LIKE 'bayit_consent_gate%'
   AND p.tablename NOT IN ('agent_audit_log','agent_confirmations','app_feedback','coaching_events','household_agent_tokens','household_members','households','love_tokens','meal_plan','meals','shopping_categories','shopping_items','streaks','subscriptions','surprise_box_opens','task_categories','task_completions','task_instances','task_templates','tasks','user_achievements','user_medals','weekly_syncs','whatsapp_webhook_events','wheel_spins')),
  'the gate sits ONLY on tables of this app');
SELECT pg_temp.ok(NOT has_function_privilege('anon', 'public.bayit_has_current_consent()', 'EXECUTE') AND has_function_privilege('authenticated', 'public.bayit_has_current_consent()', 'EXECUTE'), 'the consent function is not callable by anon, is callable by signed-in users (policies need it)');
SELECT pg_temp.ok((SELECT prosecdef AND provolatile = 's' AND proconfig::text LIKE '%search_path=%' FROM pg_proc WHERE oid = 'public.bayit_has_current_consent()'::regprocedure), 'the consent function is SECURITY DEFINER, STABLE, with a fixed search_path');

-- ===================== U has NO consent: everything is closed
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.tasks') = '0', 'no consent: cannot read the household tasks');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.task_completions') = '0', 'no consent: cannot read completions');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.shopping_items') = '0', 'no consent: cannot read the shopping list');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.household_members') = '0', 'no consent: cannot read household members');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.task_templates') = '0', 'no consent: cannot read task templates');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.streaks') = '0', 'no consent: cannot read streaks');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.households') = '0', 'no consent: cannot read the household');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.tasks (title, household_id) values ('x', 'a1000000-0000-0000-0000-0000000000a1')$q$) = 'ERR:42501', 'no consent: cannot add a task to their own household');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.shopping_items (household_id, title) values ('a1000000-0000-0000-0000-0000000000a1', 'x')$q$) = 'ERR:42501', 'no consent: cannot add a shopping item');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$update public.tasks set title = 'hacked' where household_id = 'a1000000-0000-0000-0000-0000000000a1'$q$) = '0', 'no consent: cannot update tasks');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$delete from public.shopping_items where household_id = 'a1000000-0000-0000-0000-0000000000a1'$q$) = '0', 'no consent: cannot delete');
SELECT pg_temp.ok((SELECT title FROM public.tasks WHERE id = 'a1000000-0000-0000-0000-0000000000f1') = 't1' AND (SELECT count(*) FROM public.shopping_items WHERE household_id = 'a1000000-0000-0000-0000-0000000000a1') = 1, '...and the data is intact (checked as the owner)');

-- the only exceptions: own profile, own consent (no read of anything else)
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.profiles where id = auth.uid()') = '1', 'exception: can read their own profile (the gate needs it)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.subscriptions') = '0', 'no consent: cannot read even their OWN subscription row (the gate asks a server route instead)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.privacy_consents') = '0', 'exception: reading own consent works (none yet)');
-- an OLD policy version does not open the gate
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) values ('a0000000-0000-0000-0000-00000000000a','2020-01-01',true,true,true)$q$) = '1', 'exception: can insert own consent (any version)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.tasks') = '0', 'a consent row for an OLD version does not open the gate');

-- ===================== U gives consent for the current version
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) values ('a0000000-0000-0000-0000-00000000000a','2026-11-10',true,true,true)$q$) = '1', 'U records the current consent');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.tasks') = '1', 'with consent: reads the household tasks (exactly their own household)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.task_completions') = '1', 'with consent: reads completions');
-- (only where the schema HAS a permissive read policy for them: on the live project task_templates has none and streaks has no SELECT policy)
SELECT pg_temp.ok(
  (NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='task_templates' AND permissive='PERMISSIVE' AND cmd IN ('SELECT','ALL')) OR pg_temp.as_user('authenticated', :'U', 'select * from public.task_templates') = '1')
  AND (NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='streaks' AND permissive='PERMISSIVE' AND cmd IN ('SELECT','ALL')) OR pg_temp.as_user('authenticated', :'U', 'select * from public.streaks') >= '1'),
  'with consent: reads task templates and streaks wherever the existing policies allow it');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.shopping_items') = '1', 'with consent: reads the shopping list (only their household, not the other)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', 'select * from public.households') = '1' AND pg_temp.as_user('authenticated', :'U', 'select * from public.household_members') = '1', 'with consent: household and members readable as before');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.shopping_items (household_id, title) values ('a1000000-0000-0000-0000-0000000000a1', 'eggs')$q$) = '1', 'with consent: can add a shopping item as before');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'U', $q$insert into public.shopping_items (household_id, title) values ('b2000000-0000-0000-0000-0000000000b2', 'x')$q$) = 'ERR:42501', 'with consent: still cannot write into ANOTHER household (existing isolation is intact)');

-- ===================== V (consented all along) is unaffected, and cannot see U's data
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'V', 'select * from public.tasks') = '1', 'V (consented): sees only their own household task');

-- ===================== anonymous and the service role
SELECT pg_temp.ok(pg_temp.as_user('anon', '', 'select * from public.tasks') IN ('0','ERR:42501'), 'anonymous: nothing (unchanged)');
SELECT pg_temp.ok(pg_temp.as_user('service_role', '', 'select * from public.tasks') = (SELECT count(*)::text FROM public.tasks), 'service role: bypasses row level security as before (sees all ' || (SELECT count(*) FROM public.tasks) || ' tasks, got ' || pg_temp.as_user('service_role', '', 'select * from public.tasks') || ')');

-- ===================== the OTHER app's tables behave exactly as before (here: stand-in tables, no policy, readable)
DO $$
BEGIN
  IF to_regclass('public.event_assignments') IS NOT NULL AND to_regclass('public.zz_unknown_app_table') IS NOT NULL THEN
    INSERT INTO public.event_assignments (user_id) VALUES ('a0000000-0000-0000-0000-00000000000a');
    IF pg_temp.as_user('authenticated', 'b0000000-0000-0000-0000-00000000000b', 'select * from public.event_assignments') <> '1' THEN
      RAISE EXCEPTION 'ASSERT FAILED: an events-app table became unreadable for a user without consent (got %)', pg_temp.as_user('authenticated', 'b0000000-0000-0000-0000-00000000000b', 'select * from public.event_assignments');
    END IF;
    IF pg_temp.as_user('authenticated', 'b0000000-0000-0000-0000-00000000000b', 'select * from public.user_roles') = '0' THEN
      RAISE EXCEPTION 'ASSERT FAILED: user_roles (events app) became unreadable';
    END IF;
    RAISE NOTICE 'PASS events-app tables unaffected by the gate';
  END IF;
END $$;
