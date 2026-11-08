-- The baseline's self-referential SELECT policy survives 019 and breaks reads.
-- 019's helper-based policy remains in place; this is for fresh local DB only.
DROP POLICY "Members can view members" ON public.household_members;
