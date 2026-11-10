-- BayitBeSeder: "delete my account": ONLY the requesting person's own records, in ONE transaction,
-- and NEVER the shared identity.
--
-- THREE RULES
--  1. The shared login (auth.users) and the shared profile row (public.profiles) are never deleted
--     here: the events app shares them and that cannot be proven from the database. A "full identity
--     deletion requested" row is recorded for the owner, who removes the login by hand within the legal time.
--  2. Only the requester's OWN records go. Nothing authored by, or addressed to, another person is
--     deleted, not even when the requester is the last CURRENT member of a household (former members'
--     task completions, weekly syncs, feedback, love tokens, streaks, medals stay).
--  3. Where a row is SHARED, the requester's side is anonymised (their id is set to NULL) and the other
--     person's content stays. If that column is NOT NULL the row is kept as it is and listed in
--     bayit_identity_deletion_requests.kept_shared, for the owner's manual identity removal to handle.
--
-- WHAT HAPPENS TO EACH TABLE (class: OWN = the requester's alone, SHARED = involves someone else,
-- OTHER = someone else's or nobody's, HOUSEHOLD = belongs to the household, not to a person)
--
--  table                  class        what is done
--  app_feedback           OWN          rows with user_id = requester are deleted
--  coaching_events        OWN/HOUSEHOLD rows with user_id = requester deleted; rows with no person are household-level
--  household_members      OWN          the requester's membership row is deleted
--  privacy_consents       OWN          the requester's consent record is deleted
--  streaks                OWN          rows with user_id = requester are deleted
--  surprise_box_opens     OWN          rows with user_id = requester are deleted
--  task_completions       OWN          rows with user_id = requester are deleted (photos queued, see below)
--  user_achievements      OWN          rows with user_id = requester are deleted
--  user_medals            OWN          rows with user_id = requester are deleted
--  wheel_spins            OWN/SHARED   spun by the requester and redeemed by nobody/themselves: deleted.
--                                      redeemed_by = requester: set NULL. Spun by the requester but redeemed by
--                                      someone else: kept (spun_by is NOT NULL), listed in kept_shared
--  love_tokens            SHARED       a token between two people is both people's: KEPT (sender/recipient are
--                                      NOT NULL, so it cannot be anonymised: listed in kept_shared); only a
--                                      token the requester sent to themselves is deleted
--  weekly_syncs           SHARED       created_by = requester: set NULL if nullable, otherwise kept and listed
--  tasks                  SHARED       assigned_to = requester: set NULL; the task stays
--  task_instances         SHARED       assigned_to / completed_by = requester: set NULL; the row stays
--  task_templates         SHARED       default_assignee = requester: set NULL; the template stays
--  shopping_items         SHARED       added_by = requester: set NULL; the item stays
--  agent_audit_log        SHARED       actor_user_id = requester: set NULL; the entry stays
--  household_agent_tokens SHARED       tokens the requester created are revoked and created_by set NULL
--  subscriptions          SHARED       user_id = requester: set NULL if nullable (billing rows block deletion)
--  profiles.partner_id    SHARED       other people's pointers to the requester are set NULL (this app's column)
--  profiles (this app's columns) OWN   household_id, partner_id, points, streak, push_subscription,
--                                      notification_preferences, google_calendar_tokens/id, whatsapp_phone cleared;
--                                      the row itself and the shared columns stay
--  meals, meal_plan, shopping_categories, task_categories, agent_confirmations   HOUSEHOLD
--                                      kept while anybody belongs to the household; deleted when it is empty
--  achievements, categories, coaching_messages, billing_events    catalogs / provider events: never touched
--
-- A household with NO current member left is MARKED for cleanup (bayit_household_cleanup). Its rows that
-- belong to nobody else are deleted (tasks nobody completed and nobody is assigned to, unassigned
-- instances/templates/items, household-level rows, access tokens). Rows that belong to someone else are
-- kept; the household row itself is deleted only when nothing at all remains in it (it would otherwise
-- cascade over someone else's rows), otherwise it stays marked.
--
-- OTHER RULES
--   * Only a subscription that LOOKS like billing in our own records blocks deletion (a paid tier, active or
--     past due, not cancelled, with a provider subscription id or a future period end). We do not ask the
--     payment provider; free "active" rows never block.
--   * Stored photo objects are queued durably (bayit_storage_cleanup); only object names that provably
--     belong to the person (name starts with the id of the completion's own task, or with the person's id).
--   * Everything is rolled back if any step fails; the households involved are locked first.
--
-- Callable ONLY with the service role. Additive: three small service-only tables and one function.
-- Rollback: supabase/rollbacks/027_bayit_delete_account_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.bayit_identity_deletion_requests (
  user_id uuid PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  kept_shared text[] NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE public.bayit_identity_deletion_requests IS
  'Bayit BeSeder: the person asked for their whole login to be deleted. The owner handles it by hand (the login is shared with the events app). kept_shared lists shared rows that still carry their id.';

CREATE TABLE IF NOT EXISTS public.bayit_household_cleanup (
  household_id uuid PRIMARY KEY,
  marked_at timestamptz NOT NULL DEFAULT now(),
  remaining_tables text[] NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE public.bayit_household_cleanup IS
  'Bayit BeSeder: households with no current member whose remaining rows belong to former members. Marked for the owner to review.';

CREATE TABLE IF NOT EXISTS public.bayit_storage_cleanup (
  object_name text PRIMARY KEY,
  queued_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.bayit_storage_cleanup IS
  'Bayit BeSeder: stored photo objects (bucket task-photos) still to be removed after an account deletion.';

ALTER TABLE public.bayit_identity_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bayit_household_cleanup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bayit_storage_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bayit_identity_deletion_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bayit_household_cleanup FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bayit_storage_cleanup FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bayit_delete_account(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  -- Household-scoped tables: used to decide whether anything is left in a household.
  v_hh_tables text[] := ARRAY[
    'tasks','task_instances','task_templates','meals','meal_plan','shopping_items','shopping_categories',
    'task_categories','agent_confirmations','agent_audit_log','household_agent_tokens','coaching_events',
    'streaks','love_tokens','wheel_spins','surprise_box_opens','user_medals','weekly_syncs','app_feedback',
    'subscriptions'
  ];
  -- OWN: the requester's alone.
  v_own_delete text[][] := ARRAY[
    ['app_feedback','user_id'],['coaching_events','user_id'],['streaks','user_id'],
    ['surprise_box_opens','user_id'],['user_medals','user_id'],['user_achievements','user_id'],
    ['privacy_consents','user_id'],['household_members','user_id']
  ];
  -- SHARED: the requester's side is anonymised if the column allows NULL; otherwise the row is kept and listed.
  v_shared_null text[][] := ARRAY[
    ['wheel_spins','redeemed_by_user_id'],['wheel_spins','spun_by_user_id'],
    ['love_tokens','sender_id'],['love_tokens','recipient_id'],
    ['agent_audit_log','actor_user_id'],['tasks','assigned_to'],
    ['task_instances','assigned_to'],['task_instances','completed_by'],
    ['task_templates','default_assignee'],['shopping_items','added_by'],
    ['weekly_syncs','created_by'],['subscriptions','user_id'],['profiles','partner_id']
  ];
  -- HOUSEHOLD cleanup when nobody is left: (table, columns that must exist ('!x' = must NOT exist), rows that belong to nobody else).
  v_cleanup text[][] := ARRAY[
    ['whatsapp_webhook_events','task_id','task_id IN (SELECT t.id FROM public.tasks t WHERE t.household_id = $1 AND t.assigned_to IS NULL AND NOT EXISTS (SELECT 1 FROM public.task_completions c WHERE c.task_id = t.id))'],
    ['tasks','assigned_to','household_id = $1 AND assigned_to IS NULL AND NOT EXISTS (SELECT 1 FROM public.task_completions c WHERE c.task_id = tasks.id)'],
    ['task_instances','assigned_to,completed_by','household_id = $1 AND assigned_to IS NULL AND completed_by IS NULL'],
    ['task_templates','default_assignee','household_id = $1 AND default_assignee IS NULL AND NOT EXISTS (SELECT 1 FROM public.task_instances i WHERE i.template_id = task_templates.id)'],
    ['meal_plan','household_id','household_id = $1'],
    ['meals','household_id','household_id = $1'],
    ['shopping_items','added_by','household_id = $1 AND added_by IS NULL'],
    ['shopping_categories','household_id','household_id = $1'],
    ['task_categories','household_id','household_id = $1'],
    ['agent_confirmations','household_id','household_id = $1'],
    ['agent_audit_log','actor_user_id','household_id = $1 AND actor_user_id IS NULL'],
    ['household_agent_tokens','household_id','household_id = $1'],
    ['coaching_events','user_id','household_id = $1 AND user_id IS NULL'],
    ['coaching_events','!user_id','household_id = $1'],
    ['weekly_syncs','created_by','household_id = $1 AND created_by IS NULL'],
    ['subscriptions','user_id','household_id = $1 AND user_id IS NULL AND NOT (tier <> ''free'' AND status IN (''active'', ''past_due'') AND canceled_at IS NULL)']
  ];
  -- This app's own columns on the shared profiles row, and what they are reset to.
  v_profile_scrub text[][] := ARRAY[
    ['household_id','NULL'],['partner_id','NULL'],['points','0'],['streak','0'],
    ['push_subscription','NULL'],['notification_preferences','NULL'],
    ['google_calendar_tokens','NULL'],['google_calendar_id','NULL'],['whatsapp_phone','NULL']
  ];
  v_hhs uuid[];
  hh uuid;
  v_remaining int;
  v_next uuid;
  v_new_owner uuid := NULL;
  v_household text := 'none';
  v_photos text[] := ARRAY[]::text[];
  v_more text[];
  v_kept text[] := ARRAY[]::text[];
  v_left text[];
  v_has boolean;
  v_nullable text;
  v_ok boolean;
  v_cols text[];
  c text;
  i int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user FOR UPDATE;

  -- Blocks only what LOOKS like billing in our own records (we do not query the payment provider).
  IF to_regclass('public.subscriptions') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = p_user
       AND tier <> 'free'
       AND status IN ('active', 'past_due')
       AND canceled_at IS NULL
       AND (sumit_subscription_id IS NOT NULL OR current_period_end > now())
  ) THEN
    RAISE EXCEPTION 'active_subscription' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(array_agg(DISTINCT h), ARRAY[]::uuid[]) INTO v_hhs FROM (
    SELECT household_id AS h FROM public.profiles WHERE id = p_user AND household_id IS NOT NULL
    UNION
    SELECT household_id FROM public.household_members WHERE user_id = p_user
  ) s;
  PERFORM 1 FROM public.households WHERE id = ANY (v_hhs) ORDER BY id FOR UPDATE;

  -- 1. OWN: photos first (names that provably belong to the person), then the rows.
  SELECT coalesce(array_agg(DISTINCT n), ARRAY[]::text[]) INTO v_more FROM (
    SELECT regexp_replace(split_part(photo_url, '/task-photos/', 2), '\?.*$', '') AS n, task_id
      FROM public.task_completions WHERE user_id = p_user AND photo_url LIKE '%/task-photos/%'
  ) x WHERE n LIKE task_id::text || '-%' OR n LIKE p_user::text || '/%';
  v_photos := v_photos || v_more;
  DELETE FROM public.task_completions WHERE user_id = p_user;

  FOR i IN 1 .. array_length(v_own_delete, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
               AND table_name = v_own_delete[i][1] AND column_name = v_own_delete[i][2]) THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_own_delete[i][1], v_own_delete[i][2]) USING p_user;
    END IF;
  END LOOP;
  -- a spin the requester made that nobody else redeemed, and a token they sent to themselves
  IF to_regclass('public.wheel_spins') IS NOT NULL THEN
    DELETE FROM public.wheel_spins WHERE spun_by_user_id = p_user AND (redeemed_by_user_id IS NULL OR redeemed_by_user_id = p_user);
  END IF;
  IF to_regclass('public.love_tokens') IS NOT NULL THEN
    DELETE FROM public.love_tokens WHERE sender_id = p_user AND recipient_id = p_user;
  END IF;

  -- 2. SHARED: anonymise the requester's side. NOT NULL columns cannot be: the row is kept and listed.
  FOR i IN 1 .. array_length(v_shared_null, 1) LOOP
    SELECT is_nullable INTO v_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = v_shared_null[i][1] AND column_name = v_shared_null[i][2];
    IF v_nullable IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1)', v_shared_null[i][1], v_shared_null[i][2]) INTO v_has USING p_user;
    IF NOT v_has THEN CONTINUE; END IF;
    IF v_nullable = 'YES' THEN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', v_shared_null[i][1], v_shared_null[i][2], v_shared_null[i][2]) USING p_user;
    ELSE
      v_kept := array_append(v_kept, v_shared_null[i][1] || '.' || v_shared_null[i][2]);
    END IF;
  END LOOP;
  IF to_regclass('public.household_agent_tokens') IS NOT NULL THEN
    UPDATE public.household_agent_tokens SET revoked_at = now(), created_by = NULL WHERE created_by = p_user;
  END IF;

  -- 3. Households: hand over ownership, or clean up when nobody is left.
  FOREACH hh IN ARRAY v_hhs LOOP
    UPDATE public.profiles SET household_id = NULL WHERE id = p_user AND household_id = hh;
    SELECT count(*) INTO v_remaining FROM (
      SELECT user_id AS u FROM public.household_members WHERE household_id = hh AND user_id <> p_user
      UNION
      SELECT id FROM public.profiles WHERE household_id = hh AND id <> p_user
    ) o;

    IF v_remaining > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE household_id = hh AND user_id <> p_user AND role = 'owner') THEN
        SELECT user_id INTO v_next FROM public.household_members
          WHERE household_id = hh AND user_id <> p_user ORDER BY joined_at, user_id LIMIT 1;
        IF v_next IS NOT NULL THEN
          UPDATE public.household_members SET role = 'owner' WHERE household_id = hh AND user_id = v_next;
          v_new_owner := v_next;
        END IF;
      END IF;
      IF v_household NOT IN ('emptied', 'deleted') THEN v_household := 'left'; END IF;
    ELSE
      -- Nobody left: delete only what belongs to nobody else.
      FOR i IN 1 .. array_length(v_cleanup, 1) LOOP
        IF to_regclass(format('public.%I', v_cleanup[i][1])) IS NULL THEN CONTINUE; END IF;
        v_ok := true;
        FOREACH c IN ARRAY string_to_array(v_cleanup[i][2], ',') LOOP
          IF left(c, 1) = '!' THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_cleanup[i][1] AND column_name = substr(c, 2)) THEN v_ok := false; END IF;
          ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_cleanup[i][1] AND column_name = c) THEN
            v_ok := false;
          END IF;
        END LOOP;
        IF v_ok THEN
          EXECUTE format('DELETE FROM public.%I WHERE ' || v_cleanup[i][3], v_cleanup[i][1]) USING hh;
        END IF;
      END LOOP;
      -- Is anything left in the household (rows of former members)?
      v_left := ARRAY[]::text[];
      FOR i IN 1 .. array_length(v_hh_tables, 1) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = v_hh_tables[i] AND column_name = 'household_id') THEN
          EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE household_id = $1)', v_hh_tables[i]) INTO v_has USING hh;
          IF v_has THEN v_left := array_append(v_left, v_hh_tables[i]); END IF;
        END IF;
      END LOOP;
      IF cardinality(v_left) = 0 THEN
        DELETE FROM public.bayit_household_cleanup WHERE household_id = hh;
        DELETE FROM public.households WHERE id = hh;
        IF v_household <> 'emptied' THEN v_household := 'deleted'; END IF;
      ELSE
        INSERT INTO public.bayit_household_cleanup (household_id, remaining_tables) VALUES (hh, v_left)
          ON CONFLICT (household_id) DO UPDATE SET marked_at = now(), remaining_tables = EXCLUDED.remaining_tables;
        v_household := 'emptied';
      END IF;
    END IF;
  END LOOP;

  -- 4. The shared profile is KEPT; only this app's own columns are cleared.
  FOR i IN 1 .. array_length(v_profile_scrub, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
               AND table_name = 'profiles' AND column_name = v_profile_scrub[i][1]) THEN
      EXECUTE format('UPDATE public.profiles SET %I = %s WHERE id = $1', v_profile_scrub[i][1], v_profile_scrub[i][2]) USING p_user;
    END IF;
  END LOOP;

  INSERT INTO public.bayit_storage_cleanup (object_name)
    SELECT DISTINCT n FROM unnest(v_photos) AS n WHERE n <> '' ON CONFLICT DO NOTHING;

  INSERT INTO public.bayit_identity_deletion_requests (user_id, kept_shared) VALUES (p_user, v_kept)
    ON CONFLICT (user_id) DO UPDATE SET requested_at = now(), status = 'pending', kept_shared = EXCLUDED.kept_shared;

  RETURN jsonb_build_object(
    'identity_deletion_requested', true,
    'household', v_household,
    'new_owner_id', v_new_owner,
    'object_names', to_jsonb(ARRAY(SELECT DISTINCT n FROM unnest(v_photos) AS n WHERE n <> '')),
    'kept_shared', to_jsonb(v_kept)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bayit_delete_account(uuid) TO service_role;

COMMENT ON FUNCTION public.bayit_delete_account(uuid) IS
  'BayitBeSeder delete-my-account. Service role only. One transaction. Deletes only the requester''s own records, anonymises shared ones, never touches auth.users or public.profiles beyond this app''s columns; records an identity-deletion request.';

COMMIT;
