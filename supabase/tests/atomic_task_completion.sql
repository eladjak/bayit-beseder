\set ON_ERROR_STOP on
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
CREATE TABLE public.household_members (household_id uuid, user_id uuid);
CREATE TABLE public.tasks (id uuid PRIMARY KEY, household_id uuid NOT NULL, status text NOT NULL, recurring text NOT NULL);
CREATE TABLE public.task_completions (id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES public.tasks, user_id uuid NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(), photo_url text, notes text);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.tasks TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.task_completions TO authenticated, service_role;
GRANT SELECT ON public.household_members TO authenticated, service_role;
CREATE POLICY task_access ON public.tasks TO authenticated USING (EXISTS (SELECT FROM public.household_members h WHERE h.household_id = tasks.household_id AND h.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT FROM public.household_members h WHERE h.household_id = tasks.household_id AND h.user_id = auth.uid()));
CREATE POLICY completion_read ON public.task_completions FOR SELECT TO authenticated USING (EXISTS (SELECT FROM public.tasks t WHERE t.id = task_id));
CREATE POLICY completion_insert ON public.task_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT FROM public.tasks t WHERE t.id = task_id));
CREATE FUNCTION public.is_household_member(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT EXISTS (SELECT 1 FROM public.household_members WHERE household_id = $1 AND user_id = auth.uid()) $$;
\i :migration
INSERT INTO public.household_members VALUES ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
INSERT INTO public.tasks VALUES ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','pending','false'), ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','pending','true');
\if :red
SET ROLE authenticated;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000001',false);
DO $$ BEGIN
  BEGIN
    PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000002','undo');
    RAISE EXCEPTION 'original function unexpectedly accepted recurring text';
  EXCEPTION WHEN datatype_mismatch THEN
    RAISE NOTICE 'RED arm reproduced original undo failure: SQLSTATE %', SQLSTATE;
  END;
END $$;
\else
CREATE FUNCTION public.inject_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure after completion insert'; END $$;
CREATE TRIGGER inject_failure BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.inject_failure();
SET ROLE authenticated;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000001',false);
DO $$ BEGIN
  BEGIN PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000001','complete','40000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'expected failure';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'injected failure after completion insert' THEN RAISE; END IF; END;
  IF EXISTS (SELECT FROM public.task_completions) OR (SELECT status FROM public.tasks LIMIT 1) <> 'pending' THEN RAISE EXCEPTION 'rollback failed'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER inject_failure ON public.tasks;
SET ROLE authenticated;
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000001','complete','40000000-0000-0000-0000-000000000001');
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000001','complete','40000000-0000-0000-0000-000000000001');
DO $$ BEGIN IF (SELECT count(*) FROM public.task_completions) <> 1 OR (SELECT status FROM public.tasks WHERE id='30000000-0000-0000-0000-000000000001') <> 'completed' THEN RAISE EXCEPTION 'completion or retry failed'; END IF; END $$;
RESET ROLE;
CREATE TRIGGER inject_failure BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.inject_failure();
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000001','undo'); RAISE EXCEPTION 'expected undo failure';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'injected failure after completion insert' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM public.task_completions) <> 1 OR (SELECT status FROM public.tasks WHERE id='30000000-0000-0000-0000-000000000001') <> 'completed' THEN RAISE EXCEPTION 'undo rollback failed'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER inject_failure ON public.tasks;
SET ROLE authenticated;
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000001','undo');
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000001','undo');
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000002','complete','40000000-0000-0000-0000-000000000002');
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000002','complete','40000000-0000-0000-0000-000000000003');
DO $$ BEGIN IF (SELECT count(*) FROM public.task_completions) <> 1 OR (SELECT status FROM public.tasks WHERE id='30000000-0000-0000-0000-000000000002') <> 'pending' THEN RAISE EXCEPTION 'recurring failed'; END IF; END $$;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000002',false);
DO $$ BEGIN BEGIN PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000001','complete','40000000-0000-0000-0000-000000000004'); RAISE EXCEPTION 'unauthorized success'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
SET ROLE service_role;
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000001','complete','40000000-0000-0000-0000-000000000005',NULL,NULL,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
DO $$ BEGIN BEGIN PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000001','undo',NULL,NULL,NULL,'10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'unauthorized service success'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;

RESET ROLE;
INSERT INTO public.household_members VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003');
SET ROLE authenticated;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000002',false);
DO $$ DECLARE n int; BEGIN
 DELETE FROM public.task_completions WHERE id='40000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'other member deleted completion'; END IF;
END $$;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000003',false);
DO $$ DECLARE n int; BEGIN
 DELETE FROM public.task_completions WHERE id='40000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'other household deleted completion'; END IF;
 BEGIN PERFORM public.transition_task_completion('30000000-0000-0000-0000-000000000002','undo'); RAISE EXCEPTION 'other household undo succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('test.uid','20000000-0000-0000-0000-000000000001',false);
SELECT public.transition_task_completion('30000000-0000-0000-0000-000000000002','undo');
DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.task_completions WHERE id='40000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'recurring undo failed'; END IF; RAISE NOTICE 'GREEN arm recurring undo and scoped delete passed'; END $$;
\endif
