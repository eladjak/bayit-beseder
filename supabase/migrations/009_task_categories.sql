-- Migration 009: Custom task categories per household
-- Allows users to manage their own task categories (add/edit/delete/reorder)
-- Follows the same pattern as migration 008 (shopping_categories)

-- Create the task_categories table
CREATE TABLE IF NOT EXISTS public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- RLS: household members can view their own categories
CREATE POLICY "Users can view their task categories"
  ON public.task_categories
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can insert categories
CREATE POLICY "Users can insert their task categories"
  ON public.task_categories
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can update their task categories
CREATE POLICY "Users can update their task categories"
  ON public.task_categories
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: household members can delete their task categories
CREATE POLICY "Users can delete their task categories"
  ON public.task_categories
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Index for fast household lookups
CREATE INDEX IF NOT EXISTS idx_task_categories_household
  ON public.task_categories(household_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_categories;
