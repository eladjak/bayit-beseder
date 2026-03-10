-- Migration 008: Custom shopping categories per household
-- Allows users to manage their own shopping categories (add/edit/delete/reorder)

-- Create the shopping_categories table
CREATE TABLE IF NOT EXISTS public.shopping_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🛒',
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_categories ENABLE ROW LEVEL SECURITY;

-- RLS: household members can view their own categories
CREATE POLICY "Users can view their household categories"
  ON public.shopping_categories
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can insert categories
CREATE POLICY "Users can insert their household categories"
  ON public.shopping_categories
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can update their household categories
CREATE POLICY "Users can update their household categories"
  ON public.shopping_categories
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can delete their household categories
CREATE POLICY "Users can delete their household categories"
  ON public.shopping_categories
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Index for fast household lookups
CREATE INDEX IF NOT EXISTS idx_shopping_categories_household
  ON public.shopping_categories(household_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_categories;
