-- BayitBeSeder: "delete my account", done safely in ONE transaction.
--
-- WHY A DATABASE FUNCTION
-- The Supabase project is SHARED with the events app ("kidushishi"): the auth
-- users and public.profiles belong to both apps. Deleting through many separate
-- API calls cannot be made atomic and cannot be made race-free: between "no
-- events data found" and "delete the sign-in", the other app could write a row.
-- Here the check and the delete happen inside one transaction, with the auth
-- user row locked (FOR UPDATE). Any other-app insert that references that user
-- needs a key-share lock on the same row, so it waits and then fails its
-- foreign key instead of slipping in. A failure anywhere rolls back everything.
--
-- WHAT IT REMOVES
--   * Rows of THIS app's own tables (list in v_bayit below; every name is a table
--     created by supabase/migration.sql or migrations 001..026), for this user and
--     for any household the user is the LAST member of.
--   * The profile row, the default 'youth_volunteer' role row and the auth user
--     ONLY IF no other-app footprint exists (see below). Otherwise they are KEPT,
--     and only this app's own profile columns are cleared.
--
-- "OTHER-APP FOOTPRINT" (any one of these keeps the auth user)
--   1. a user_roles row whose role is not the automatic default;
--   2. a row in ANY table outside this app's list whose foreign key points at
--      auth.users(id) or public.profiles(id) for this user (found from the
--      catalog at run time, so tables we do not know about are still seen);
--   3. a row in any public table outside this app's list that has a uuid column
--      with a person-like name (user_id, created_by, sender_id, ...), even
--      without a foreign key. Over-detecting only keeps the account: safe.
--
-- Callable ONLY with the service role. Additive: creates one function.
-- Rollback: supabase/rollbacks/027_bayit_delete_account_rollback.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.bayit_delete_account(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  -- Tables owned by BayitBeSeder. NOTE: public.profiles is shared; it is listed
  -- here only so that it is not mistaken for another app's table.
  v_bayit text[] := ARRAY[
    'achievements','agent_audit_log','agent_confirmations','app_feedback','billing_events',
    'categories','coaching_events','coaching_messages','household_agent_tokens',
    'household_members','households','love_tokens','meal_plan','meals','privacy_consents',
    'profiles','shopping_categories','shopping_items','streaks','subscriptions',
    'surprise_box_opens','task_categories','task_completions','task_instances',
    'task_templates','tasks','user_achievements','user_medals','weekly_syncs',
    'whatsapp_webhook_events','wheel_spins'
  ];
  -- Household-scoped tables, children first.
  v_hh_children text[] := ARRAY[
    'meal_plan','meals','shopping_items','task_instances','task_templates','streaks',
    'love_tokens','wheel_spins','surprise_box_opens','user_medals','coaching_events',
    'weekly_syncs','agent_confirmations','agent_audit_log','household_agent_tokens',
    'subscriptions','shopping_categories','task_categories','app_feedback'
  ];
  -- (table, column) personal rows that are deleted outright.
  v_personal_delete text[][] := ARRAY[
    ['love_tokens','sender_id'],['love_tokens','recipient_id'],
    ['wheel_spins','spun_by_user_id'],['surprise_box_opens','user_id'],
    ['user_medals','user_id'],['user_achievements','user_id'],['streaks','user_id'],
    ['task_completions','user_id'],['coaching_events','user_id'],
    ['weekly_syncs','created_by'],['app_feedback','user_id'],
    ['subscriptions','user_id'],['privacy_consents','user_id'],
    ['household_members','user_id']
  ];
  -- (table, column) references to this user that are cleared, not deleted.
  v_personal_null text[][] := ARRAY[
    ['wheel_spins','redeemed_by_user_id'],['profiles','partner_id']
  ];
  -- Same, but only inside a household that continues without this user.
  v_hh_null text[][] := ARRAY[
    ['tasks','assigned_to'],['task_instances','assigned_to'],['task_instances','completed_by'],
    ['shopping_items','added_by'],['agent_audit_log','actor_user_id']
  ];
  -- This app's own columns on the shared profiles row, and what they are reset to.
  v_profile_scrub text[][] := ARRAY[
    ['household_id','NULL'],['partner_id','NULL'],['points','0'],['streak','0'],
    ['push_subscription','NULL'],['notification_preferences','NULL'],
    ['google_calendar_tokens','NULL'],['google_calendar_id','NULL'],['whatsapp_phone','NULL']
  ];
  v_default_role constant text := 'youth_volunteer';
  v_person_cols constant text :=
    '^(user_id|profile_id|owner_id|author_id|creator_id|sender_id|recipient_id|member_id|volunteer_id|assignee_id|assigned_to|created_by|updated_by|approved_by|uploaded_by|reviewed_by|organizer_id|host_id)$';

  v_hhs uuid[];
  hh uuid;
  v_others int;
  v_next uuid;
  v_new_owner uuid := NULL;
  v_household text := 'none';
  v_photos text[] := ARRAY[]::text[];
  v_more text[];
  v_blockers text[] := ARRAY[]::text[];
  v_found boolean;
  v_deleted boolean := false;
  i int;
  r record;
BEGIN
  -- 1. Lock the shared rows first. Everything below is decided under this lock.
  PERFORM 1 FROM auth.users WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user FOR UPDATE;

  -- 2. A subscription that still bills must be cancelled first.
  IF to_regclass('public.subscriptions') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id = p_user AND status IN ('active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'active_subscription' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Households this person is in.
  SELECT coalesce(array_agg(DISTINCT h), ARRAY[]::uuid[]) INTO v_hhs FROM (
    SELECT household_id AS h FROM public.profiles WHERE id = p_user AND household_id IS NOT NULL
    UNION
    SELECT household_id FROM public.household_members WHERE user_id = p_user
  ) s;

  FOREACH hh IN ARRAY v_hhs LOOP
    SELECT count(*) INTO v_others FROM (
      SELECT user_id AS u FROM public.household_members WHERE household_id = hh AND user_id <> p_user
      UNION
      SELECT id FROM public.profiles WHERE household_id = hh AND id <> p_user
    ) o;

    IF v_others = 0 THEN
      -- The last person: the household goes with them.
      UPDATE public.profiles SET household_id = NULL WHERE id = p_user;
      SELECT coalesce(array_agg(tc.photo_url), ARRAY[]::text[]) INTO v_more
        FROM public.task_completions tc JOIN public.tasks t ON t.id = tc.task_id
        WHERE t.household_id = hh AND tc.photo_url IS NOT NULL;
      v_photos := v_photos || v_more;
      IF to_regclass('public.whatsapp_webhook_events') IS NOT NULL THEN
        DELETE FROM public.whatsapp_webhook_events
          WHERE task_id IN (SELECT id FROM public.tasks WHERE household_id = hh);
      END IF;
      DELETE FROM public.task_completions WHERE task_id IN (SELECT id FROM public.tasks WHERE household_id = hh);
      DELETE FROM public.tasks WHERE household_id = hh;
      FOR i IN 1 .. array_length(v_hh_children, 1) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                   AND table_name = v_hh_children[i] AND column_name = 'household_id') THEN
          EXECUTE format('DELETE FROM public.%I WHERE household_id = $1', v_hh_children[i]) USING hh;
        END IF;
      END LOOP;
      DELETE FROM public.household_members WHERE household_id = hh;
      DELETE FROM public.households WHERE id = hh;
      v_household := 'deleted';
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.household_members WHERE household_id = hh AND user_id <> p_user AND role = 'owner'
      ) THEN
        SELECT user_id INTO v_next FROM public.household_members
          WHERE household_id = hh AND user_id <> p_user ORDER BY joined_at, user_id LIMIT 1;
        IF v_next IS NOT NULL THEN
          UPDATE public.household_members SET role = 'owner' WHERE household_id = hh AND user_id = v_next;
          v_new_owner := v_next;
        END IF;
      END IF;
      FOR i IN 1 .. array_length(v_hh_null, 1) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                   AND table_name = v_hh_null[i][1] AND column_name = v_hh_null[i][2]) THEN
          EXECUTE format('UPDATE public.%I SET %I = NULL WHERE household_id = $1 AND %I = $2',
                         v_hh_null[i][1], v_hh_null[i][2], v_hh_null[i][2]) USING hh, p_user;
        END IF;
      END LOOP;
      -- Assistant access tokens this person created stop working.
      IF to_regclass('public.household_agent_tokens') IS NOT NULL THEN
        UPDATE public.household_agent_tokens SET revoked_at = now(), created_by = NULL
          WHERE household_id = hh AND created_by = p_user;
      END IF;
      DELETE FROM public.household_members WHERE household_id = hh AND user_id = p_user;
      IF v_household <> 'deleted' THEN v_household := 'left'; END IF;
    END IF;
  END LOOP;

  -- 4. This person's own records, in any household.
  FOR i IN 1 .. array_length(v_personal_delete, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                   AND table_name = v_personal_delete[i][1] AND column_name = v_personal_delete[i][2]) THEN
      CONTINUE;
    END IF;
    IF v_personal_delete[i][1] = 'task_completions' AND v_personal_delete[i][2] = 'user_id' THEN
      SELECT coalesce(array_agg(photo_url), ARRAY[]::text[]) INTO v_more
        FROM public.task_completions WHERE user_id = p_user AND photo_url IS NOT NULL;
      v_photos := v_photos || v_more;
    END IF;
    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_personal_delete[i][1], v_personal_delete[i][2])
      USING p_user;
  END LOOP;
  FOR i IN 1 .. array_length(v_personal_null, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
               AND table_name = v_personal_null[i][1] AND column_name = v_personal_null[i][2]) THEN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1',
                     v_personal_null[i][1], v_personal_null[i][2], v_personal_null[i][2]) USING p_user;
    END IF;
  END LOOP;

  -- 5. Does the OTHER app still need this person? Decided under the lock from step 1.
  IF to_regclass('public.user_roles') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role::text <> v_default_role
  ) THEN
    v_blockers := array_append(v_blockers, 'public.user_roles(non-default role)'::text);
  END IF;

  FOR r IN
    SELECT DISTINCT s.sch, s.tbl, s.col FROM (
      SELECT n.nspname::text AS sch, c.relname::text AS tbl, a.attname::text AS col
        FROM pg_constraint k
        JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
       WHERE k.contype = 'f' AND cardinality(k.conkey) = 1
         AND k.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
      UNION
      SELECT n.nspname::text, c.relname::text, a.attname::text
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
         AND a.attnum > 0 AND NOT a.attisdropped
         AND a.atttypid = 'uuid'::regtype AND a.attname ~ v_person_cols
    ) s
    WHERE s.sch NOT IN ('auth','storage','realtime','vault','extensions','graphql','graphql_public',
                        'pgsodium','supabase_functions','supabase_migrations','net','cron',
                        'pg_catalog','information_schema')
      AND NOT (s.sch = 'public' AND (s.tbl = ANY (v_bayit) OR s.tbl = 'user_roles'))
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1::text)', r.sch, r.tbl, r.col)
      INTO v_found USING p_user;
    IF v_found THEN
      v_blockers := array_append(v_blockers, (r.sch || '.' || r.tbl)::text);
    END IF;
  END LOOP;

  -- 6. Profile and sign-in.
  IF cardinality(v_blockers) = 0 THEN
    IF to_regclass('public.user_roles') IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = p_user AND role::text = v_default_role;
    END IF;
    DELETE FROM public.profiles WHERE id = p_user;
    DELETE FROM auth.users WHERE id = p_user;
    v_deleted := true;
  ELSE
    -- Keep the shared profile and sign-in; clear only this app's own columns.
    FOR i IN 1 .. array_length(v_profile_scrub, 1) LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                 AND table_name = 'profiles' AND column_name = v_profile_scrub[i][1]) THEN
        EXECUTE format('UPDATE public.profiles SET %I = %s WHERE id = $1',
                       v_profile_scrub[i][1], v_profile_scrub[i][2]) USING p_user;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'auth_user_deleted', v_deleted,
    'household', v_household,
    'new_owner_id', v_new_owner,
    'photo_urls', to_jsonb(v_photos),
    'kept_because', to_jsonb(v_blockers)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bayit_delete_account(uuid) TO service_role;

COMMENT ON FUNCTION public.bayit_delete_account(uuid) IS
  'BayitBeSeder delete-my-account. Service role only. One transaction; keeps the shared auth user when the events app still has data for it.';

COMMIT;
