-- The OTHER app that shares this database ("kidushishi"), reduced to what matters
-- for account deletion: its own tables, with real foreign keys to the shared
-- auth users / profiles, including cascades that would destroy its data.
-- The numbered migrations on a fresh database leave a sign-up trigger (handle_new_user) that
-- writes a column the later schema renamed (the live database drifted from the files).
-- The tests create profiles explicitly, so that trigger is removed here.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'youth_volunteer'
);
-- The sign-up trigger that gives EVERY new user the default role (measured live 10.11.2026).
CREATE FUNCTION public.events_default_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.user_roles (user_id) VALUES (NEW.id); RETURN NEW; END $$;
CREATE TRIGGER events_default_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.events_default_role();
CREATE TABLE public.events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text, created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE);
CREATE TABLE public.event_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
-- no foreign key at all, but still a person's data:
CREATE TABLE public.volunteer_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), volunteer_id uuid, note text);
-- a table whose name and column name nobody listed anywhere:
CREATE TABLE public.zz_unknown_app_table (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_ref uuid REFERENCES auth.users(id) ON DELETE CASCADE);

-- The numbered migrations on a fresh database leave household_members with a policy that reads
-- household_members itself ("infinite recursion detected in policy"), because migration 010 does not
-- apply cleanly on a fresh chain. The live project has the repaired form (is_household_member());
-- the tests use that form, so they exercise the policies production really has.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'household_members' LOOP
    EXECUTE format('DROP POLICY %I ON public.household_members', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Household members can view household_members" ON public.household_members
  FOR SELECT TO authenticated USING (public.is_household_member(household_id));
