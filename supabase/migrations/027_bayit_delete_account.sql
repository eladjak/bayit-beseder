-- BayitBeSeder: "delete my account", in ONE transaction, WITHOUT ever touching the shared identity.
--
-- The Supabase project is SHARED with the events app ("kidushishi"): auth.users and
-- public.profiles belong to both apps. Whether the events app still needs a given login
-- cannot be proven from the database (references by e-mail, by differently named columns,
-- by JSON or indirectly are invisible), so this function does not try:
--
--   * It deletes THIS app's own rows for the user (list below) and, if the user is the last
--     member of a household, that household.
--   * It clears this app's own columns on the shared profiles row. The profile row and the
--     auth user are NEVER deleted here.
--   * It records "full identity deletion requested" in public.bayit_identity_deletion_requests.
--     The owner checks by hand and removes the login within the legal time.
--   * Stored photo objects are queued in public.bayit_storage_cleanup (durable), and returned
--     so the caller can remove them now. Only object names that provably belong to the person
--     (the name starts with the id of the completion's own task, or with the person's id) are queued.
--   * Only a subscription that actually bills blocks deletion (a paid tier, not cancelled,
--     with a provider subscription id or a future period end). Free "active" rows never do.
--   * Everything is rolled back if any step fails. The households involved are locked first.
--
-- Callable ONLY with the service role. Additive: two small service-only tables and one function.
-- Rollback: supabase/rollbacks/027_bayit_delete_account_rollback.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.bayit_identity_deletion_requests (
  user_id uuid PRIMARY KEY,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done'))
);
COMMENT ON TABLE public.bayit_identity_deletion_requests IS
  'Bayit BeSeder: the person asked for their whole login to be deleted. The owner handles it by hand (shared with the events app).';

CREATE TABLE IF NOT EXISTS public.bayit_storage_cleanup (
  object_name text PRIMARY KEY,
  queued_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.bayit_storage_cleanup IS
  'Bayit BeSeder: stored photo objects (bucket task-photos) still to be removed after an account deletion.';

ALTER TABLE public.bayit_identity_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bayit_storage_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bayit_identity_deletion_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bayit_storage_cleanup FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bayit_delete_account(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  -- Household-scoped tables, children first.
  v_hh_children text[] := ARRAY[
    'meal_plan','meals','shopping_items','task_instances','task_templates','streaks',
    'love_tokens','wheel_spins','surprise_box_opens','user_medals','coaching_events',
    'weekly_syncs','agent_confirmations','agent_audit_log','household_agent_tokens',
    'subscriptions','shopping_categories','task_categories','app_feedback'
  ];
  -- (table, column): this person's own rows, deleted wherever they are.
  v_personal_delete text[][] := ARRAY[
    ['love_tokens','sender_id'],['love_tokens','recipient_id'],
    ['wheel_spins','spun_by_user_id'],['surprise_box_opens','user_id'],
    ['user_medals','user_id'],['user_achievements','user_id'],['streaks','user_id'],
    ['task_completions','user_id'],['coaching_events','user_id'],
    ['weekly_syncs','created_by'],['app_feedback','user_id'],
    ['subscriptions','user_id'],['privacy_consents','user_id'],
    ['household_members','user_id']
  ];
  -- (table, column): pointers to this person that are cleared, so other people's rows survive.
  v_personal_null text[][] := ARRAY[
    ['wheel_spins','redeemed_by_user_id'],['profiles','partner_id'],
    ['tasks','assigned_to'],['task_instances','assigned_to'],['task_instances','completed_by'],
    ['task_templates','default_assignee'],['shopping_items','added_by'],
    ['agent_audit_log','actor_user_id'],['household_agent_tokens','created_by']
  ];
  -- This app's own columns on the shared profiles row, and what they are reset to.
  v_profile_scrub text[][] := ARRAY[
    ['household_id','NULL'],['partner_id','NULL'],['points','0'],['streak','0'],
    ['push_subscription','NULL'],['notification_preferences','NULL'],
    ['google_calendar_tokens','NULL'],['google_calendar_id','NULL'],['whatsapp_phone','NULL']
  ];
  v_hhs uuid[];
  hh uuid;
  v_others int;
  v_next uuid;
  v_new_owner uuid := NULL;
  v_household text := 'none';
  v_photos text[] := ARRAY[]::text[];
  v_more text[];
  i int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;
  -- Serialise two deletions of the same person.
  PERFORM 1 FROM public.profiles WHERE id = p_user FOR UPDATE;

  -- A subscription that really bills must be cancelled first. Free rows never block.
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

  -- Lock the households (in id order) so a concurrent join / leave cannot invalidate
  -- the "last member" decision or the ownership hand-over below.
  PERFORM 1 FROM public.households WHERE id = ANY (v_hhs) ORDER BY id FOR UPDATE;

  FOREACH hh IN ARRAY v_hhs LOOP
    SELECT count(*) INTO v_others FROM (
      SELECT user_id AS u FROM public.household_members WHERE household_id = hh AND user_id <> p_user
      UNION
      SELECT id FROM public.profiles WHERE household_id = hh AND id <> p_user
    ) o;

    IF v_others = 0 THEN
      -- The last person: the household goes with them.
      UPDATE public.profiles SET household_id = NULL WHERE id = p_user;
      SELECT coalesce(array_agg(DISTINCT regexp_replace(split_part(tc.photo_url, '/task-photos/', 2), '\?.*$', '')), ARRAY[]::text[])
        INTO v_more
        FROM public.task_completions tc JOIN public.tasks t ON t.id = tc.task_id
       WHERE t.household_id = hh AND tc.photo_url IS NOT NULL AND tc.photo_url LIKE '%/task-photos/%'
         AND (regexp_replace(split_part(tc.photo_url, '/task-photos/', 2), '\?.*$', '') LIKE t.id::text || '-%'
              OR regexp_replace(split_part(tc.photo_url, '/task-photos/', 2), '\?.*$', '') LIKE p_user::text || '/%');
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
      -- Others remain: hand over ownership if needed, then leave. Records this person
      -- sent or received (e.g. love tokens) are part of this person's own data and go.
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
      IF v_household <> 'deleted' THEN v_household := 'left'; END IF;
    END IF;
  END LOOP;

  -- This person's own records, in any household.
  FOR i IN 1 .. array_length(v_personal_delete, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                   AND table_name = v_personal_delete[i][1] AND column_name = v_personal_delete[i][2]) THEN
      CONTINUE;
    END IF;
    IF v_personal_delete[i][1] = 'task_completions' THEN
      SELECT coalesce(array_agg(DISTINCT regexp_replace(split_part(photo_url, '/task-photos/', 2), '\?.*$', '')), ARRAY[]::text[])
        INTO v_more
        FROM public.task_completions
       WHERE user_id = p_user AND photo_url IS NOT NULL AND photo_url LIKE '%/task-photos/%'
         AND (regexp_replace(split_part(photo_url, '/task-photos/', 2), '\?.*$', '') LIKE task_id::text || '-%'
              OR regexp_replace(split_part(photo_url, '/task-photos/', 2), '\?.*$', '') LIKE p_user::text || '/%');
      v_photos := v_photos || v_more;
    END IF;
    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_personal_delete[i][1], v_personal_delete[i][2])
      USING p_user;
  END LOOP;
  FOR i IN 1 .. array_length(v_personal_null, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
               AND table_name = v_personal_null[i][1] AND column_name = v_personal_null[i][2]) THEN
      IF v_personal_null[i][1] = 'household_agent_tokens' THEN
        EXECUTE 'UPDATE public.household_agent_tokens SET revoked_at = now(), created_by = NULL WHERE created_by = $1' USING p_user;
      ELSE
        EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1',
                       v_personal_null[i][1], v_personal_null[i][2], v_personal_null[i][2]) USING p_user;
      END IF;
    END IF;
  END LOOP;

  -- The shared profile and the auth user are KEPT. Only this app's own columns are cleared.
  FOR i IN 1 .. array_length(v_profile_scrub, 1) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
               AND table_name = 'profiles' AND column_name = v_profile_scrub[i][1]) THEN
      EXECUTE format('UPDATE public.profiles SET %I = %s WHERE id = $1',
                     v_profile_scrub[i][1], v_profile_scrub[i][2]) USING p_user;
    END IF;
  END LOOP;

  -- Photo objects: queue durably (the caller removes them now and clears the queue).
  INSERT INTO public.bayit_storage_cleanup (object_name)
    SELECT DISTINCT n FROM unnest(v_photos) AS n WHERE n <> '' ON CONFLICT DO NOTHING;

  -- The login itself is for the owner to remove by hand.
  INSERT INTO public.bayit_identity_deletion_requests (user_id) VALUES (p_user)
    ON CONFLICT (user_id) DO UPDATE SET requested_at = now(), status = 'pending';

  RETURN jsonb_build_object(
    'identity_deletion_requested', true,
    'household', v_household,
    'new_owner_id', v_new_owner,
    'object_names', to_jsonb(ARRAY(SELECT DISTINCT n FROM unnest(v_photos) AS n WHERE n <> ''))
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bayit_delete_account(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bayit_delete_account(uuid) TO service_role;

COMMENT ON FUNCTION public.bayit_delete_account(uuid) IS
  'BayitBeSeder delete-my-account. Service role only. One transaction. Never deletes auth.users or public.profiles (shared with the events app); records an identity-deletion request instead.';

COMMIT;
