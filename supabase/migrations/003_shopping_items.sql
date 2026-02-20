-- BayitBeSeder - Phase 3: Shopping Items Table
-- Creates the shopping_items table for the shopping list feature

CREATE TABLE IF NOT EXISTS public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  quantity smallint NOT NULL DEFAULT 1,
  unit text,
  category text NOT NULL DEFAULT 'כללי',
  checked boolean NOT NULL DEFAULT false,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_items_household ON public.shopping_items(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_checked ON public.shopping_items(household_id, checked);

-- RLS
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- Policies: household members can CRUD their shopping items
CREATE POLICY "Members can view shopping items" ON public.shopping_items
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage shopping items" ON public.shopping_items
  FOR ALL USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Also allow authenticated users to manage items without household (for simple mode)
CREATE POLICY "Authenticated users can manage own items" ON public.shopping_items
  FOR ALL USING (added_by = auth.uid());

CREATE POLICY "Authenticated users can insert items" ON public.shopping_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
