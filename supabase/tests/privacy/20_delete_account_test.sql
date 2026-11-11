-- Integration test for public.bayit_delete_account (migration 027) on a REAL Postgres.
-- Runs on the repo schema + a stand-in events app, or on the schema rebuilt from the live project.
--
-- Promises under test, each with TWO OR MORE people and a content-level (not row-count) comparison:
--   * the shared login (auth.users, profiles) is never deleted;
--   * OWN rows (the requester's alone) are deleted, other people's rows are byte-for-byte untouched;
--   * SHARED rows keep the other person's content: the requester's side is set to NULL, or the row is
--     kept and listed when the column is NOT NULL;
--   * the requester being the last CURRENT member does not make a FORMER member's rows theirs;
--   * a household left with nobody and its shared content are retained and marked for manual review.
\set ON_ERROR_STOP on
\pset tuples_only on

CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF c IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', m; END IF;
  RAISE NOTICE 'PASS %', m;
END $$;

-- Insert one row into a Bayit table with the columns given in vals; any other NOT NULL column without a
-- default gets a dummy of its type (so the same seed works on the repo schema and on the live schema).
CREATE FUNCTION pg_temp.ins(tbl text, vals jsonb) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record; cols text := ''; vs text := ''; v text;
BEGIN
  IF to_regclass(format('public.%I', tbl)) IS NULL THEN RETURN; END IF;
  FOR r IN SELECT column_name, data_type, is_nullable, column_default, is_generated FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = tbl ORDER BY ordinal_position LOOP
    IF vals ? r.column_name THEN
      v := format('%L::%s', vals ->> r.column_name, r.data_type);
      IF vals ->> r.column_name IS NULL THEN v := 'NULL'; END IF;
    ELSIF r.is_nullable = 'NO' AND r.column_default IS NULL AND r.is_generated = 'NEVER' THEN
      v := CASE r.data_type
        WHEN 'text' THEN '''x'''
        WHEN 'integer' THEN '1' WHEN 'smallint' THEN '1' WHEN 'bigint' THEN '1'
        WHEN 'date' THEN 'current_date'
        WHEN 'timestamp with time zone' THEN 'now()'
        WHEN 'boolean' THEN 'false'
        WHEN 'jsonb' THEN '''{}''::jsonb'
        WHEN 'uuid' THEN 'gen_random_uuid()'
        ELSE 'NULL' END;
    ELSE
      CONTINUE;
    END IF;
    cols := cols || CASE WHEN cols = '' THEN '' ELSE ',' END || quote_ident(r.column_name);
    vs := vs || CASE WHEN vs = '' THEN '' ELSE ',' END || v;
  END LOOP;
  EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s)', tbl, cols, vs);
END $$;

-- md5 of the full CONTENT of the rows of a table matching a condition (not just their number).
CREATE FUNCTION pg_temp.fp(tbl text, cond text DEFAULT 'true') RETURNS text LANGUAGE plpgsql AS $$
DECLARE h text;
BEGIN
  IF to_regclass(format('public.%I', tbl)) IS NULL THEN RETURN 'absent'; END IF;
  EXECUTE format('SELECT md5(coalesce(string_agg(t::text, ''|'' ORDER BY t::text), '''')) FROM public.%I t WHERE %s', tbl, cond) INTO h;
  RETURN h;
END $$;

CREATE FUNCTION pg_temp.cnt(tbl text, cond text DEFAULT 'true') RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  IF to_regclass(format('public.%I', tbl)) IS NULL THEN RETURN 0; END IF;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %s', tbl, cond) INTO n;
  RETURN n;
END $$;

CREATE FUNCTION pg_temp.is_nullable(tbl text, col text) RETURNS boolean LANGUAGE sql AS $$
  SELECT coalesce((SELECT is_nullable = 'YES' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = col), false)
$$;

-- Counts AND contents of every table that is NOT this app's: must be identical before and after.
CREATE FUNCTION pg_temp.other_app_fingerprint() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record; out text := '';
  bayit text[] := ARRAY['achievements','agent_audit_log','agent_confirmations','app_feedback','billing_events','categories','coaching_events','coaching_messages','household_agent_tokens','household_members','households','love_tokens','meal_plan','meals','privacy_consents','profiles','shopping_categories','shopping_items','streaks','subscriptions','surprise_box_opens','task_categories','task_completions','task_instances','task_templates','tasks','user_achievements','user_medals','weekly_syncs','whatsapp_webhook_events','wheel_spins','bayit_identity_deletion_requests','bayit_storage_cleanup','bayit_household_cleanup'];
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND NOT (c.relname = ANY (bayit)) ORDER BY 1 LOOP
    out := out || r.relname || '=' || pg_temp.fp(r.relname) || ';';
  END LOOP;
  RETURN out;
END $$;

CREATE FUNCTION pg_temp.mk_person(u uuid, hh uuid, role_in_hh text DEFAULT 'member') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (id, email) VALUES (u, u || '@t.test');
  -- (live schema: a trigger creates the profile; repo schema: the test does. NOT NULL is checked before ON CONFLICT, so test for existence.)
  INSERT INTO public.profiles (id, display_name) SELECT u, 'n' WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u);
  IF hh IS NOT NULL THEN
    INSERT INTO public.households (id, name) VALUES (hh, 'h-' || hh) ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET household_id = hh WHERE id = u;
    INSERT INTO public.household_members (household_id, user_id, role) VALUES (hh, u, role_in_hh);
  END IF;
  UPDATE public.profiles SET points = 5, streak = 3, whatsapp_phone = '0500000000' WHERE id = u;
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


\set R 10000000-0000-0000-0000-00000000000a
\set P 20000000-0000-0000-0000-00000000000b
\set F 30000000-0000-0000-0000-00000000000f
\set B 90000000-0000-0000-0000-000000000009
\set HS 11111111-0000-0000-0000-0000000000a1
\set HE 22222222-0000-0000-0000-0000000000e1
\set HZ 33333333-0000-0000-0000-0000000000f1
\set HB 99999999-0000-0000-0000-0000000000b9

-- R: the requester. P: R's partner, still a member of HS. F: a FORMER member of HE (no membership row,
-- but data left there). B: a bystander in HB.
SELECT pg_temp.mk_person(:'R', :'HS', 'owner');
SELECT pg_temp.mk_person(:'P', :'HS', 'member');
SELECT pg_temp.mk_person(:'F', NULL);
SELECT pg_temp.mk_person(:'B', :'HB', 'owner');
INSERT INTO public.households (id, name) VALUES (:'HE', 'he'), (:'HZ', 'hz');
INSERT INTO public.household_members (household_id, user_id, role) VALUES (:'HE', :'R', 'owner'), (:'HZ', :'R', 'owner');
DO $$
BEGIN
  IF to_regclass('public.zz_unknown_app_table') IS NOT NULL THEN
    INSERT INTO public.event_assignments (user_id) VALUES ('10000000-0000-0000-0000-00000000000a');
    INSERT INTO public.events (title, created_by) VALUES ('keep-me', '10000000-0000-0000-0000-00000000000a');
    INSERT INTO public.volunteer_notes (volunteer_id, note) VALUES ('10000000-0000-0000-0000-00000000000a', 'keep-note');
    INSERT INTO public.zz_unknown_app_table (owner_ref) VALUES ('10000000-0000-0000-0000-00000000000a');
  END IF;
END $$;

SELECT pg_temp.ins('tasks', jsonb_build_object('id','a0000000-0000-0000-0000-00000000000a','title','t-R','household_id',:'HS','assigned_to',:'R'));
SELECT pg_temp.ins('tasks', jsonb_build_object('id','b0000000-0000-0000-0000-00000000000b','title','t-P','household_id',:'HS','assigned_to',:'P'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','a0000000-0000-0000-0000-00000000000a','user_id',:'R','photo_url','https://x.example/storage/v1/object/public/task-photos/a0000000-0000-0000-0000-00000000000a-shared.webp'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','a0000000-0000-0000-0000-00000000000a','user_id',:'R','photo_url','https://x.example/storage/v1/object/public/task-photos/' || :'R' || '/a-1.webp'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','b0000000-0000-0000-0000-00000000000b','user_id',:'P','photo_url','https://x.example/storage/v1/object/public/task-photos/' || :'P' || '/b-1.webp'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','b0000000-0000-0000-0000-00000000000b','user_id',:'R','notes','R helped with the P task'));
SELECT pg_temp.ins('task_templates', jsonb_build_object('id','c0000000-0000-0000-0000-00000000000c','household_id',:'HS','title','tpl-R','category','general','recurrence_type','daily','default_assignee',:'R'));
SELECT pg_temp.ins('task_templates', jsonb_build_object('id','d0000000-0000-0000-0000-00000000000d','household_id',:'HS','title','tpl-P','category','general','recurrence_type','daily','default_assignee',:'P'));
SELECT pg_temp.ins('task_instances', jsonb_build_object('id','e0000000-0000-0000-0000-00000000000e','household_id',:'HS','template_id','c0000000-0000-0000-0000-00000000000c','title','inst-1','category','general','assigned_to',:'R','completed_by',:'P'));
SELECT pg_temp.ins('task_instances', jsonb_build_object('id','f0000000-0000-0000-0000-00000000000f','household_id',:'HS','template_id','d0000000-0000-0000-0000-00000000000d','title','inst-2','category','general','assigned_to',:'P','completed_by',:'R'));
SELECT pg_temp.ins('shopping_items', jsonb_build_object('household_id',:'HS','title','item-R','added_by',:'R'));
SELECT pg_temp.ins('shopping_items', jsonb_build_object('household_id',:'HS','title','item-P','added_by',:'P'));
SELECT pg_temp.ins('streaks', jsonb_build_object('user_id',:'R','household_id',:'HS','streak_type','daily'));
SELECT pg_temp.ins('user_medals', jsonb_build_object('user_id',:'R','household_id',:'HS','medal_number','1','trigger_points_total','10'));
SELECT pg_temp.ins('surprise_box_opens', jsonb_build_object('user_id',:'R','household_id',:'HS','opened_date','2026-11-01','reward_type','x','reward_tier','small'));
SELECT pg_temp.ins('streaks', jsonb_build_object('user_id',:'P','household_id',:'HS','streak_type','daily'));
SELECT pg_temp.ins('user_medals', jsonb_build_object('user_id',:'P','household_id',:'HS','medal_number','1','trigger_points_total','10'));
SELECT pg_temp.ins('surprise_box_opens', jsonb_build_object('user_id',:'P','household_id',:'HS','opened_date','2026-11-01','reward_type','x','reward_tier','small'));
SELECT pg_temp.ins('app_feedback', jsonb_build_object('user_id',:'R','household_id',:'HS','rating','5'));
SELECT pg_temp.ins('app_feedback', jsonb_build_object('user_id',:'P','household_id',:'HS','rating','4'));
DO $$
DECLARE a uuid := gen_random_uuid();
BEGIN
  IF to_regclass('public.achievements') IS NOT NULL THEN
    PERFORM pg_temp.ins('achievements', jsonb_build_object('id', a, 'category', 'special'));
    PERFORM pg_temp.ins('user_achievements', jsonb_build_object('user_id','10000000-0000-0000-0000-00000000000a','achievement_id', a));
    PERFORM pg_temp.ins('user_achievements', jsonb_build_object('user_id','20000000-0000-0000-0000-00000000000b','achievement_id', a));
  END IF;
END $$;
SELECT pg_temp.ins('love_tokens', jsonb_build_object('household_id',:'HS','sender_id',:'R','recipient_id',:'P','value','1'));
SELECT pg_temp.ins('love_tokens', jsonb_build_object('household_id',:'HS','sender_id',:'P','recipient_id',:'R','value','2'));
SELECT pg_temp.ins('weekly_syncs', jsonb_build_object('household_id',:'HS','created_by',:'R','week_start','2026-11-02'));
SELECT pg_temp.ins('weekly_syncs', jsonb_build_object('household_id',:'HS','created_by',:'P','week_start','2026-11-09'));
SELECT pg_temp.ins('wheel_spins', jsonb_build_object('household_id',:'HS','spun_by_user_id',:'R','spin_week_iso','2026-W45','segment_id','s1','segment_label','R-alone'));
SELECT pg_temp.ins('wheel_spins', jsonb_build_object('household_id',:'HS','spun_by_user_id',:'R','redeemed_by_user_id',:'P','spin_week_iso','2026-W44','segment_id','s2','segment_label','R-spun-P-redeemed'));
SELECT pg_temp.ins('wheel_spins', jsonb_build_object('household_id',:'HS','spun_by_user_id',:'P','redeemed_by_user_id',:'R','spin_week_iso','2026-W43','segment_id','s3','segment_label','P-spun-R-redeemed'));
SELECT pg_temp.ins('agent_audit_log', jsonb_build_object('household_id',:'HS','action','a-R','outcome','ok','actor_user_id',:'R'));
SELECT pg_temp.ins('agent_audit_log', jsonb_build_object('household_id',:'HS','action','a-P','outcome','ok','actor_user_id',:'P'));
SELECT pg_temp.ins('household_agent_tokens', jsonb_build_object('household_id',:'HS','token_hash','hash-by-R','created_by',:'R'));
SELECT pg_temp.ins('household_agent_tokens', jsonb_build_object('household_id',:'HS','token_hash','hash-by-P','created_by',:'P'));
DO $$
BEGIN
  IF pg_temp.is_nullable('profiles', 'partner_id') THEN
    UPDATE public.profiles SET partner_id = '10000000-0000-0000-0000-00000000000a' WHERE id = '20000000-0000-0000-0000-00000000000b';
  END IF;
END $$;
SELECT pg_temp.ins('tasks', jsonb_build_object('id','10000000-0000-0000-0000-000000000001','title','t-F-completed','household_id',:'HE'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','10000000-0000-0000-0000-000000000001','user_id',:'F','notes','F did this'));
CREATE TABLE public.unknown_household_parent (id integer PRIMARY KEY, household_id uuid REFERENCES public.households(id) ON DELETE CASCADE);
CREATE TABLE public.unknown_household_child (parent_id integer REFERENCES public.unknown_household_parent(id) ON DELETE CASCADE, content text);
INSERT INTO public.unknown_household_parent VALUES (1, :'HZ');
INSERT INTO public.unknown_household_child VALUES (1, 'former member content');
SELECT pg_temp.ins('tasks', jsonb_build_object('id','20000000-0000-0000-0000-000000000002','title','t-nobody','household_id',:'HE'));
SELECT pg_temp.ins('tasks', jsonb_build_object('id','30000000-0000-0000-0000-000000000003','title','t-R-only','household_id',:'HE','assigned_to',:'R'));
SELECT pg_temp.ins('task_templates', jsonb_build_object('id','40000000-0000-0000-0000-000000000004','household_id',:'HE','title','tpl-nobody','category','general','recurrence_type','daily'));
SELECT pg_temp.ins('meals', jsonb_build_object('household_id',:'HE','name','soup'));
SELECT pg_temp.ins('shopping_categories', jsonb_build_object('household_id',:'HE','name','cat'));
SELECT pg_temp.ins('shopping_items', jsonb_build_object('household_id',:'HE','title','item-nobody'));
SELECT pg_temp.ins('shopping_items', jsonb_build_object('household_id',:'HE','title','item-F','added_by',:'F'));
SELECT pg_temp.ins('streaks', jsonb_build_object('user_id',:'F','household_id',:'HE','streak_type','daily'));
SELECT pg_temp.ins('app_feedback', jsonb_build_object('user_id',:'F','household_id',:'HE','rating','3'));
SELECT pg_temp.ins('weekly_syncs', jsonb_build_object('household_id',:'HE','created_by',:'F','week_start','2026-10-26'));
SELECT pg_temp.ins('love_tokens', jsonb_build_object('household_id',:'HE','sender_id',:'F','recipient_id',:'R','value','4'));
SELECT pg_temp.ins('love_tokens', jsonb_build_object('household_id',:'HE','sender_id',:'R','recipient_id',:'F','value','5'));
SELECT pg_temp.ins('household_agent_tokens', jsonb_build_object('household_id',:'HE','token_hash','hash-HE'));
SELECT pg_temp.ins('user_medals', jsonb_build_object('user_id',:'F','household_id',:'HE','medal_number','1','trigger_points_total','10'));
SELECT pg_temp.ins('tasks', jsonb_build_object('id','50000000-0000-0000-0000-000000000005','title','t-solo','household_id',:'HZ','assigned_to',:'R'));
SELECT pg_temp.ins('meals', jsonb_build_object('household_id',:'HZ','name','solo-soup'));
SELECT pg_temp.ins('tasks', jsonb_build_object('id','60000000-0000-0000-0000-000000000006','title','t-B','household_id',:'HB','assigned_to',:'B'));
SELECT pg_temp.ins('streaks', jsonb_build_object('user_id',:'B','household_id',:'HB','streak_type','daily'));
CREATE TEMP TABLE snap AS SELECT
  pg_temp.other_app_fingerprint() AS other_app,
  to_jsonb((SELECT p FROM public.profiles p WHERE id = '90000000-0000-0000-0000-000000000009')) AS b_profile,
  pg_temp.fp('streaks', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS streaks_others,
  pg_temp.fp('user_medals', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS medals_others,
  pg_temp.fp('user_achievements', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS ach_others,
  pg_temp.fp('surprise_box_opens', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS box_others,
  pg_temp.fp('app_feedback', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS fb_others,
  pg_temp.fp('task_completions', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS comp_others,
  pg_temp.fp('privacy_consents', 'user_id <> ''10000000-0000-0000-0000-00000000000a''') AS consent_others,
  pg_temp.fp('household_members', 'user_id <> ''10000000-0000-0000-0000-00000000000a'' AND household_id <> ''11111111-0000-0000-0000-0000000000a1''') AS members_others,
  pg_temp.fp('weekly_syncs', 'household_id = ''22222222-0000-0000-0000-0000000000e1''') AS syncs_he;

-- ================================ RUN IT: R asks to be deleted
SELECT pg_temp.delete_as_service(:'R') AS r \gset


-- the shared identity
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = :'R') AND EXISTS (SELECT 1 FROM public.profiles WHERE id = :'R'), 'IDENTITY the auth user and the shared profile row are KEPT');
SELECT pg_temp.ok((:'r'::jsonb ->> 'identity_deletion_requested')::boolean AND EXISTS (SELECT 1 FROM public.bayit_identity_deletion_requests WHERE user_id = :'R' AND status = 'pending'), 'IDENTITY a full identity deletion is REQUESTED for the owner, not done');
SELECT pg_temp.ok((SELECT household_id IS NULL AND points = 0 AND streak = 0 AND whatsapp_phone IS NULL FROM public.profiles WHERE id = :'R'), 'IDENTITY only this app columns on the profile are cleared');
SELECT pg_temp.ok((:'r'::jsonb -> 'kept_shared') @> to_jsonb('photo_unverified:a0000000-0000-0000-0000-00000000000a-shared.webp'::text), 'ROUND4 unverified photo retained for manual review');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.bayit_storage_cleanup WHERE object_name = 'a0000000-0000-0000-0000-00000000000a-shared.webp'), 'ROUND4 task-only photo ownership is unproven');
SELECT pg_temp.ok(pg_temp.cnt('tasks', 'title = ''t-R-only'' AND assigned_to IS NULL') = 1, 'ROUND4 shared task assigned to requester survives');
SELECT pg_temp.ok(pg_temp.other_app_fingerprint() = (SELECT other_app FROM snap), 'IDENTITY the CONTENT of every other-app table is identical (hash of every row, not a row count)');
SELECT pg_temp.ok(to_jsonb((SELECT p FROM public.profiles p WHERE id = :'B')) = (SELECT b_profile FROM snap) AND pg_temp.cnt('tasks', 'household_id = ''' || :'HB' || '''') = 1 AND pg_temp.cnt('streaks', 'user_id = ''' || :'B' || '''') = 1, 'IDENTITY a bystander in another household is untouched');

-- OWN: R rows gone, everybody else byte-for-byte the same
SELECT pg_temp.ok(pg_temp.cnt('streaks', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('streaks', 'user_id <> ''' || :'R' || '''') = (SELECT streaks_others FROM snap), 'OWN streaks: R rows deleted, P/F/B rows identical');
SELECT pg_temp.ok(pg_temp.cnt('user_medals', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('user_medals', 'user_id <> ''' || :'R' || '''') = (SELECT medals_others FROM snap), 'OWN user_medals: R rows deleted, others identical');
SELECT pg_temp.ok(pg_temp.cnt('user_achievements', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('user_achievements', 'user_id <> ''' || :'R' || '''') = (SELECT ach_others FROM snap), 'OWN user_achievements: R rows deleted, others identical');
SELECT pg_temp.ok(pg_temp.cnt('surprise_box_opens', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('surprise_box_opens', 'user_id <> ''' || :'R' || '''') = (SELECT box_others FROM snap), 'OWN surprise_box_opens: R rows deleted, others identical');
SELECT pg_temp.ok(pg_temp.cnt('app_feedback', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('app_feedback', 'user_id <> ''' || :'R' || '''') = (SELECT fb_others FROM snap), 'OWN app_feedback: R rows deleted, P and the FORMER member F rows identical');
SELECT pg_temp.ok(pg_temp.cnt('task_completions', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('task_completions', 'user_id <> ''' || :'R' || '''') = (SELECT comp_others FROM snap), 'OWN task_completions: R rows deleted, P and F completions (R rows deleted, including R on a P task) identical');
SELECT pg_temp.ok(pg_temp.cnt('privacy_consents', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('privacy_consents', 'user_id <> ''' || :'R' || '''') = (SELECT consent_others FROM snap), 'OWN privacy_consents: R rows deleted, others identical');
SELECT pg_temp.ok(pg_temp.cnt('household_members', 'user_id = ''' || :'R' || '''') = 0 AND pg_temp.fp('household_members', 'user_id <> ''' || :'R' || ''' AND household_id <> ''' || :'HS' || '''') = (SELECT members_others FROM snap), 'OWN household_members: R membership gone, memberships of other households identical (P role handover is checked under HS)');
SELECT pg_temp.ok((SELECT count(*) FROM public.bayit_storage_cleanup WHERE object_name LIKE :'R' || '/%') = 1 AND NOT EXISTS (SELECT 1 FROM public.bayit_storage_cleanup WHERE object_name LIKE :'P' || '/%'), 'OWN photos: R photo queued for removal, P photo is not');

-- SHARED: the other person content stays
SELECT pg_temp.ok(pg_temp.cnt('tasks', 'title = ''t-R'' AND assigned_to IS NULL AND household_id = ''' || :'HS' || '''') = 1 AND pg_temp.cnt('tasks', 'title = ''t-P'' AND assigned_to = ''' || :'P' || '''') = 1, 'SHARED tasks: R task stays with its assignee anonymised (NULL), P task untouched');
SELECT pg_temp.ok(pg_temp.cnt('task_instances', 'id = ''e0000000-0000-0000-0000-00000000000e'' AND assigned_to IS NULL AND completed_by = ''' || :'P' || '''') = 1 AND pg_temp.cnt('task_instances', 'id = ''f0000000-0000-0000-0000-00000000000f'' AND assigned_to = ''' || :'P' || ''' AND completed_by IS NULL') = 1, 'SHARED task_instances: only the R side is set to NULL, P side kept');
SELECT pg_temp.ok(pg_temp.cnt('task_templates', 'title = ''tpl-R'' AND default_assignee IS NULL') = 1 AND pg_temp.cnt('task_templates', 'title = ''tpl-P'' AND default_assignee = ''' || :'P' || '''') = 1, 'SHARED task_templates: default assignee anonymised, template kept');
SELECT pg_temp.ok(pg_temp.cnt('shopping_items', 'title = ''item-R'' AND added_by IS NULL') = 1 AND pg_temp.cnt('shopping_items', 'title = ''item-P'' AND added_by = ''' || :'P' || '''') = 1, 'SHARED shopping_items: R item kept, added_by anonymised; P item untouched');
SELECT pg_temp.ok(pg_temp.cnt('agent_audit_log', 'action = ''a-R'' AND actor_user_id IS NULL') = 1 AND pg_temp.cnt('agent_audit_log', 'action = ''a-P'' AND actor_user_id = ''' || :'P' || '''') = 1, 'SHARED agent_audit_log: R entry kept, actor anonymised');
SELECT pg_temp.ok(pg_temp.cnt('household_agent_tokens', 'token_hash = ''hash-by-R'' AND created_by IS NULL AND revoked_at IS NOT NULL') = 1 AND pg_temp.cnt('household_agent_tokens', 'token_hash = ''hash-by-P'' AND created_by = ''' || :'P' || ''' AND revoked_at IS NULL') = 1, 'SHARED agent tokens: R token revoked and anonymised, P token untouched and still valid');
SELECT pg_temp.ok(CASE WHEN pg_temp.is_nullable('weekly_syncs', 'created_by') THEN pg_temp.cnt('weekly_syncs', 'household_id = ''' || :'HS' || ''' AND created_by IS NULL') = 1 ELSE pg_temp.cnt('weekly_syncs', 'created_by = ''' || :'R' || '''') = 1 AND (:'r'::jsonb -> 'kept_shared') @> to_jsonb('weekly_syncs.created_by'::text) END AND pg_temp.cnt('weekly_syncs', 'created_by = ''' || :'P' || '''') = 1, 'SHARED weekly_syncs: R sync kept (anonymised, or listed in kept_shared when the column is NOT NULL), P sync untouched');
SELECT pg_temp.ok(pg_temp.cnt('love_tokens', 'sender_id = ''' || :'R' || ''' AND recipient_id = ''' || :'P' || '''') = 1 AND pg_temp.cnt('love_tokens', 'sender_id = ''' || :'P' || ''' AND recipient_id = ''' || :'R' || '''') = 1 AND pg_temp.cnt('love_tokens', 'sender_id = recipient_id') = 0, 'SHARED love_tokens: tokens between R and P are BOTH kept (they are P content too); only the token R sent to R is deleted');
SELECT pg_temp.ok((:'r'::jsonb -> 'kept_shared') @> to_jsonb('love_tokens.sender_id'::text) AND (SELECT kept_shared @> ARRAY['love_tokens.sender_id'] FROM public.bayit_identity_deletion_requests WHERE user_id = :'R'), 'SHARED the rows that still carry the R id are LISTED for the owner (kept_shared)');
SELECT pg_temp.ok(pg_temp.cnt('wheel_spins', 'segment_label = ''R-alone''') = 0 AND pg_temp.cnt('wheel_spins', 'segment_label = ''R-spun-P-redeemed'' AND redeemed_by_user_id = ''' || :'P' || '''') = 1 AND pg_temp.cnt('wheel_spins', 'segment_label = ''P-spun-R-redeemed'' AND redeemed_by_user_id IS NULL AND spun_by_user_id = ''' || :'P' || '''') = 1, 'SHARED wheel_spins: R own spin deleted; the spin R made that P redeemed kept; P spin R redeemed keeps the P side, R side NULL');
SELECT pg_temp.ok(CASE WHEN pg_temp.is_nullable('profiles', 'partner_id') THEN pg_temp.cnt('profiles', 'partner_id IS NOT NULL AND id = ''' || :'P' || '''') = 0 ELSE true END, 'SHARED profiles.partner_id: the P pointer to R is set to NULL');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = :'HS') AND (SELECT role FROM public.household_members WHERE user_id = :'P') = 'owner' AND (:'r'::jsonb ->> 'new_owner_id') = :'P', 'HS the household carries on: P became owner');

SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.unknown_household_child WHERE content = 'former member content') AND EXISTS (SELECT 1 FROM public.households WHERE id = :'HZ'), 'ROUND4 unknown household cascade survives');

-- HE: R was the last CURRENT member; F is a former one
SELECT pg_temp.ok(pg_temp.cnt('task_completions', 'user_id = ''' || :'F' || '''') = 1 AND pg_temp.cnt('tasks', 'title = ''t-F-completed''') = 1, 'FORMER MEMBER F task completion and the task it belongs to are KEPT (R being last current member does not make them R)');
SELECT pg_temp.ok(pg_temp.cnt('app_feedback', 'user_id = ''' || :'F' || '''') = (CASE WHEN to_regclass('public.app_feedback') IS NULL THEN 0 ELSE 1 END) AND pg_temp.cnt('streaks', 'user_id = ''' || :'F' || '''') = 1 AND pg_temp.cnt('user_medals', 'user_id = ''' || :'F' || '''') = 1 AND pg_temp.cnt('shopping_items', 'title = ''item-F'' AND added_by = ''' || :'F' || '''') = 1, 'FORMER MEMBER F feedback, streak, medal and shopping item are KEPT');
SELECT pg_temp.ok(pg_temp.fp('weekly_syncs', 'household_id = ''' || :'HE' || '''') = (SELECT syncs_he FROM snap), 'FORMER MEMBER F weekly sync is byte-for-byte unchanged');
SELECT pg_temp.ok(pg_temp.cnt('love_tokens', 'sender_id = ''' || :'F' || ''' AND recipient_id = ''' || :'R' || '''') = 1 AND pg_temp.cnt('love_tokens', 'sender_id = ''' || :'R' || ''' AND recipient_id = ''' || :'F' || '''') = 1, 'FORMER MEMBER F love tokens to and from R are KEPT (F content)');
SELECT pg_temp.ok(pg_temp.cnt('tasks', 'title = ''t-nobody''') = 1 AND pg_temp.cnt('tasks', 'title = ''t-R-only''') = 1 AND pg_temp.cnt('shopping_items', 'title = ''item-nobody''') = 1, 'HE shared content retained for review');
SELECT pg_temp.ok((:'r'::jsonb ->> 'household') = 'emptied' AND EXISTS (SELECT 1 FROM public.households WHERE id = :'HE') AND EXISTS (SELECT 1 FROM public.bayit_household_cleanup WHERE household_id = :'HE'), 'HE the household is KEPT and MARKED for cleanup (deleting it would cascade over F rows)');
SELECT pg_temp.ok((SELECT remaining_tables @> ARRAY['tasks','love_tokens','weekly_syncs'] FROM public.bayit_household_cleanup WHERE household_id = :'HE'), 'HE the mark says which tables still hold other people rows');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.households WHERE id = :'HZ') AND EXISTS (SELECT 1 FROM public.bayit_household_cleanup WHERE household_id = :'HZ'), 'HZ retained and marked for manual review');

-- a second run is harmless
SELECT pg_temp.delete_as_service(:'R') AS r2 \gset
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM auth.users WHERE id = :'R') AND (SELECT count(*) FROM public.bayit_identity_deletion_requests WHERE user_id = :'R') = 1 AND pg_temp.cnt('task_completions', 'user_id = ''' || :'F' || '''') = 1, 'RERUN a second run changes nothing and keeps one request');

SELECT pg_temp.ok((SELECT kept_shared @> ARRAY['photo_unverified:a0000000-0000-0000-0000-00000000000a-shared.webp'] FROM public.bayit_identity_deletion_requests WHERE user_id = :'R'), 'RETRY preserves legacy photo review list');
UPDATE public.bayit_identity_deletion_requests SET status = 'done' WHERE user_id = :'R';
SELECT pg_temp.delete_as_service(:'R');
SELECT pg_temp.ok((SELECT status = 'done' FROM public.bayit_identity_deletion_requests WHERE user_id = :'R'), 'RETRY does not reopen completed review');

SELECT pg_temp.mk_person('61000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'owner');
SELECT pg_temp.mk_person('61000000-0000-0000-0000-000000000002', NULL);
UPDATE public.profiles SET household_id = '62000000-0000-0000-0000-000000000001' WHERE id = '61000000-0000-0000-0000-000000000002';
SELECT pg_temp.delete_as_service('61000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.household_members WHERE household_id = '62000000-0000-0000-0000-000000000001' AND user_id = '61000000-0000-0000-0000-000000000002' AND role = 'owner'), 'HANDOVER profile-only remaining member becomes owner');

-- ================================================================= which subscriptions block
\set S1 40000000-0000-0000-0000-0000000000a1
\set S2 40000000-0000-0000-0000-0000000000a2
\set SH1 44444444-0000-0000-0000-0000000000a1
\set SH2 44444444-0000-0000-0000-0000000000a2
SELECT pg_temp.mk_person(:'S1', :'SH1', 'owner');
SELECT pg_temp.ins('subscriptions', jsonb_build_object('household_id',:'SH1','user_id',:'S1','tier','free','status','active','current_period_end', (now() + interval '30 days')::text));
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('40000000-0000-0000-0000-0000000000a1');
  RAISE NOTICE 'PASS SUB a FREE active subscription row does not block deletion';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'active_subscription' THEN RAISE EXCEPTION 'ASSERT FAILED: SUB a FREE active subscription row blocked deletion'; END IF;
  RAISE;
END $$;
SELECT pg_temp.mk_person(:'S2', :'SH2', 'owner');
SELECT pg_temp.ins('subscriptions', jsonb_build_object('household_id',:'SH2','user_id',:'S2','tier','plus','status','active','sumit_subscription_id','sub-1'));
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('40000000-0000-0000-0000-0000000000a2');
  RAISE EXCEPTION 'ASSERT FAILED: SUB deletion went through with a billing subscription';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'active_subscription' THEN RAISE; END IF;
  RAISE NOTICE 'PASS SUB a paid plan with a provider subscription id blocks deletion';
END $$;
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.household_members WHERE user_id = :'S2'), 'SUB nothing was deleted when it blocked');
UPDATE public.subscriptions SET canceled_at = now() WHERE user_id = :'S2';
SELECT pg_temp.delete_as_service(:'S2') AS r3 \gset
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = :'S2'), 'SUB once cancelled, the same plan no longer blocks');

-- ================================================================= atomicity
\set A1 50000000-0000-0000-0000-0000000000a1
\set AH1 55555555-0000-0000-0000-0000000000a1
SELECT pg_temp.mk_person(:'A1', :'AH1', 'owner');
SELECT pg_temp.ins('streaks', jsonb_build_object('user_id',:'A1','household_id',:'AH1','streak_type','daily'));
CREATE FUNCTION public.zz_boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure at the final step'; END $$;
CREATE TRIGGER zz_boom BEFORE INSERT ON public.bayit_identity_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.zz_boom();
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service('50000000-0000-0000-0000-0000000000a1');
  RAISE EXCEPTION 'ASSERT FAILED: ATOMIC the injected failure did not surface';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'injected failure%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS ATOMIC failure surfaced';
END $$;
DROP TRIGGER zz_boom ON public.bayit_identity_deletion_requests;
DROP FUNCTION public.zz_boom();
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.streaks WHERE user_id = :'A1') AND EXISTS (SELECT 1 FROM public.household_members WHERE user_id = :'A1') AND EXISTS (SELECT 1 FROM public.privacy_consents WHERE user_id = :'A1') AND (SELECT points FROM public.profiles WHERE id = :'A1') > 0, 'ATOMIC a failure at the last step leaves nothing half-deleted');

-- ================================================================= privileges, unknown user, crafted photo URL
DO $$
DECLARE who text;
BEGIN
  FOREACH who IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', who);
      PERFORM public.bayit_delete_account('90000000-0000-0000-0000-000000000009');
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION 'ASSERT FAILED: PRIV % could call the delete function', who;
    EXCEPTION WHEN insufficient_privilege THEN
      EXECUTE 'RESET ROLE';
      RAISE NOTICE 'PASS PRIV % is refused', who;
    END;
  END LOOP;
END $$;
SELECT pg_temp.ok(NOT has_table_privilege('authenticated', 'public.bayit_identity_deletion_requests', 'SELECT') AND NOT has_table_privilege('anon', 'public.bayit_storage_cleanup', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.bayit_household_cleanup', 'SELECT'), 'PRIV the three service-only tables are closed to browser roles');
DO $$
BEGIN
  PERFORM pg_temp.delete_as_service(gen_random_uuid());
  RAISE EXCEPTION 'ASSERT FAILED: UNKNOWN accepted a user that does not exist';
EXCEPTION WHEN no_data_found THEN
  RAISE NOTICE 'PASS UNKNOWN unknown user refused';
END $$;
\set C1 70000000-0000-0000-0000-0000000000a1
\set CH1 77777777-0000-0000-0000-0000000000a1
SELECT pg_temp.mk_person(:'C1', :'CH1', 'owner');
SELECT pg_temp.ins('tasks', jsonb_build_object('id','70000000-0000-0000-0000-0000000000f1','title','t-crafted','household_id',:'CH1'));
SELECT pg_temp.ins('task_completions', jsonb_build_object('task_id','70000000-0000-0000-0000-0000000000f1','user_id',:'C1','photo_url','https://x.example/storage/v1/object/public/task-photos/' || :'B' || '/somebody-elses-photo.webp'));
TRUNCATE public.bayit_storage_cleanup;
SELECT pg_temp.delete_as_service(:'C1') AS r7 \gset
SELECT pg_temp.ok(jsonb_array_length(:'r7'::jsonb -> 'object_names') = 0 AND (SELECT count(*) FROM public.bayit_storage_cleanup) = 0, 'PHOTO an object that is not provably the person own is never queued for removal');
