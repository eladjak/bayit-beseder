-- Additive allowlist. Rows are managed by an administrator, never clients.
BEGIN;
CREATE TABLE public.ui_v2_households (
  household_id uuid PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  added_by text
);
ALTER TABLE public.ui_v2_households ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ui_v2_households FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ui_v2_households TO authenticated;
CREATE POLICY "Members can view their own UI allowlist row"
  ON public.ui_v2_households FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
COMMIT;
-- Rollback (administrator only): DROP TABLE public.ui_v2_households;
