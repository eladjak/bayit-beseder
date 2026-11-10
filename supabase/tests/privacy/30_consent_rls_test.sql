-- Row-level security of public.privacy_consents (migration 026), tested as the
-- three real database roles: two different signed-in users and an anonymous caller.
\set ON_ERROR_STOP on
\pset tuples_only on

CREATE FUNCTION pg_temp.ok(c boolean, m text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF c IS NOT TRUE THEN RAISE EXCEPTION 'ASSERT FAILED: %', m; END IF;
  RAISE NOTICE 'PASS %', m;
END $$;

-- Run one statement as a role + user, report rows affected (or the error name).
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

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'a@t.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'b@t.test');

\set A a0000000-0000-0000-0000-00000000000a
\set B b0000000-0000-0000-0000-00000000000b

SELECT pg_temp.ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.privacy_consents'::regclass), 'RLS is enabled on privacy_consents');
SELECT pg_temp.ok((SELECT count(*) FROM pg_policies WHERE tablename = 'privacy_consents') = 2, 'exactly two policies exist (insert own, select own)');

-- A inserts own consent
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A',
  $q$INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES ('a0000000-0000-0000-0000-00000000000a','v1',true,true,true)$q$) = '1',
  'user A can record their own consent');
-- B inserts own consent
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'B',
  $q$INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES ('b0000000-0000-0000-0000-00000000000b','v1',true,true,true)$q$) = '1',
  'user B can record their own consent');

-- A cannot write a consent FOR B
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A',
  $q$INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES ('b0000000-0000-0000-0000-00000000000b','v2',true,true,true)$q$) = 'ERR:42501',
  'user A cannot record consent for user B (row-level security violation)');
-- A cannot record a consent with a box left unticked
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A',
  $q$INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES ('a0000000-0000-0000-0000-00000000000a','v3',true,false,true)$q$) = 'ERR:42501',
  'a consent with an unticked box is refused');

-- Reads
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', 'select * from public.privacy_consents') = '1', 'user A sees exactly one row (their own)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', $q$select * from public.privacy_consents where user_id = 'b0000000-0000-0000-0000-00000000000b'$q$) = '0', 'user A cannot read B''s consent');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'B', $q$select * from public.privacy_consents where user_id = 'a0000000-0000-0000-0000-00000000000a'$q$) = '0', 'user B cannot read A''s consent');

-- Update / delete: no policy, so zero rows are touched, for own and for others
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', $q$update public.privacy_consents set locale = 'en' where user_id = 'a0000000-0000-0000-0000-00000000000a'$q$) IN ('0','ERR:42501'), 'user A cannot update their own record (append-only)');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', $q$update public.privacy_consents set terms_accepted = false where user_id = 'b0000000-0000-0000-0000-00000000000b'$q$) IN ('0','ERR:42501'), 'user A cannot update B''s record');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', $q$delete from public.privacy_consents where user_id = 'b0000000-0000-0000-0000-00000000000b'$q$) IN ('0','ERR:42501'), 'user A cannot delete B''s record');
SELECT pg_temp.ok(pg_temp.as_user('authenticated', :'A', $q$delete from public.privacy_consents where user_id = 'a0000000-0000-0000-0000-00000000000a'$q$) IN ('0','ERR:42501'), 'user A cannot delete their own record');
SELECT pg_temp.ok((SELECT count(*) FROM public.privacy_consents) = 2 AND (SELECT bool_and(terms_accepted AND locale = 'he') FROM public.privacy_consents), 'after all of that, both rows are intact and unchanged (checked as the table owner)');

-- Anonymous: nothing at all
SELECT pg_temp.ok(pg_temp.as_user('anon', '', 'select * from public.privacy_consents') IN ('0','ERR:42501'), 'anonymous sees no rows');
SELECT pg_temp.ok(pg_temp.as_user('anon', '', $q$INSERT INTO public.privacy_consents (user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted) VALUES ('a0000000-0000-0000-0000-00000000000a','vanon',true,true,true)$q$) IN ('ERR:42501'), 'anonymous cannot insert');
SELECT pg_temp.ok(pg_temp.as_user('anon', '', 'delete from public.privacy_consents') IN ('0','ERR:42501'), 'anonymous cannot delete');
SELECT pg_temp.ok(pg_temp.as_user('anon', '', 'update public.privacy_consents set locale = ''en''') IN ('0','ERR:42501'), 'anonymous cannot update');
-- An authenticated session with NO uid (broken token) behaves like nobody
SELECT pg_temp.ok(pg_temp.as_user('authenticated', '', 'select * from public.privacy_consents') = '0', 'a session without a user id sees no rows');

-- The cascade the delete-account flow relies on
DELETE FROM auth.users WHERE id = :'B';
SELECT pg_temp.ok((SELECT count(*) FROM public.privacy_consents WHERE user_id = :'B') = 0, 'deleting the auth user removes their consent (ON DELETE CASCADE)');
SELECT pg_temp.ok((SELECT count(*) FROM public.privacy_consents WHERE user_id = :'A') = 1, '...and only theirs');
