\set ON_ERROR_STOP on
-- Synthetic identities, fresh disposable local database only.
GRANT USAGE ON SCHEMA public,auth TO authenticated;
GRANT SELECT ON public.profiles,public.household_members TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tasks,public.shopping_items,public.meals TO authenticated;
INSERT INTO auth.users(id) VALUES ('aaaaaaaa-0000-0000-0000-000000000011'),('bbbbbbbb-0000-0000-0000-000000000022'),('cccccccc-0000-0000-0000-000000000033');
INSERT INTO public.households(id,name) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A'),('bbbbbbbb-0000-0000-0000-000000000002','B');
INSERT INTO public.profiles(id,display_name,household_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000011','A','aaaaaaaa-0000-0000-0000-000000000001'),('bbbbbbbb-0000-0000-0000-000000000022','B','bbbbbbbb-0000-0000-0000-000000000002'),('cccccccc-0000-0000-0000-000000000033','staff',NULL);
INSERT INTO public.household_members(household_id,user_id,role) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000011','owner'),('bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000022','owner');
INSERT INTO public.tasks(household_id,title) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A'),('bbbbbbbb-0000-0000-0000-000000000002','B');
INSERT INTO public.shopping_items(household_id,title) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A'),('bbbbbbbb-0000-0000-0000-000000000002','B');
INSERT INTO public.meals(household_id,name) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','A'),('bbbbbbbb-0000-0000-0000-000000000002','B');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000011',false);
DO $$ DECLARE n int; BEGIN
 IF (SELECT count(*) FROM public.profiles)<>1 OR (SELECT count(*) FROM public.tasks)<>1 OR (SELECT count(*) FROM public.shopping_items)<>1 OR (SELECT count(*) FROM public.meals)<>1 THEN RAISE EXCEPTION 'A visibility'; END IF;
 UPDATE public.tasks SET title='bad' WHERE household_id='bbbbbbbb-0000-0000-0000-000000000002'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'cross update'; END IF;
 BEGIN INSERT INTO public.shopping_items(household_id,title) VALUES ('bbbbbbbb-0000-0000-0000-000000000002','bad'); RAISE EXCEPTION 'cross insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000022',false);
DO $$ BEGIN IF (SELECT count(*) FROM public.profiles)<>1 OR (SELECT count(*) FROM public.tasks)<>1 OR (SELECT count(*) FROM public.shopping_items)<>1 OR (SELECT count(*) FROM public.meals)<>1 THEN RAISE EXCEPTION 'B visibility'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-000000000033',false);
DO $$ BEGIN IF (SELECT count(*) FROM public.profiles)<>1 OR (SELECT count(*) FROM public.tasks)<>0 OR (SELECT count(*) FROM public.shopping_items)<>0 OR (SELECT count(*) FROM public.meals)<>0 THEN RAISE EXCEPTION 'staff visibility'; END IF; END $$;
SELECT 'PASS A/B/staff actual local schema RLS; synthetic claims only' AS result;
