-- BayitBeSeder (בית בסדר) - Phase 3: Initial Schema
-- Consolidated schema with profiles, categories, tasks, task_completions
-- Run in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Profiles (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  partner_id uuid REFERENCES public.profiles(id),
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. Categories
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Tasks
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. Task Completions
-- ============================================
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id uuid,
  notes text,
  photo_url text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_partner ON public.profiles(partner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_frequency ON public.tasks(frequency);
CREATE INDEX IF NOT EXISTS idx_completions_task ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON public.task_completions(completed_by);
CREATE INDEX IF NOT EXISTS idx_completions_household ON public.task_completions(household_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON public.task_completions(completed_at);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- ---- Profiles RLS ----

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can view their partner's profile
CREATE POLICY "profiles_select_partner" ON public.profiles
  FOR SELECT USING (
    id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
  );

-- Users can insert their own profile (auto-create on signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---- Categories RLS ----

-- Anyone authenticated can view categories (shared resource)
CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (true);

-- Authenticated users can manage categories
CREATE POLICY "categories_insert_auth" ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update_auth" ON public.categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "categories_delete_auth" ON public.categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---- Tasks RLS ----

-- Anyone authenticated can view tasks (shared task catalog)
CREATE POLICY "tasks_select_all" ON public.tasks
  FOR SELECT USING (true);

-- Authenticated users can manage tasks
CREATE POLICY "tasks_insert_auth" ON public.tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tasks_update_auth" ON public.tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "tasks_delete_auth" ON public.tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---- Task Completions RLS ----

-- Users can view their own completions
CREATE POLICY "completions_select_own" ON public.task_completions
  FOR SELECT USING (completed_by = auth.uid());

-- Users can view completions from the same household
CREATE POLICY "completions_select_household" ON public.task_completions
  FOR SELECT USING (
    household_id IN (
      SELECT tc2.household_id FROM public.task_completions tc2
      WHERE tc2.completed_by = auth.uid()
      GROUP BY tc2.household_id
    )
  );

-- Users can insert their own completions
CREATE POLICY "completions_insert_own" ON public.task_completions
  FOR INSERT WITH CHECK (completed_by = auth.uid());

-- Users can update their own completions
CREATE POLICY "completions_update_own" ON public.task_completions
  FOR UPDATE USING (completed_by = auth.uid());

-- Users can delete their own completions
CREATE POLICY "completions_delete_own" ON public.task_completions
  FOR DELETE USING (completed_by = auth.uid());

-- ============================================
-- Seed Categories (Hebrew)
-- ============================================
INSERT INTO public.categories (name, icon, color, created_at) VALUES
  ('מטבח', 'ChefHat', '#EF4444', now()),
  ('אמבטיה', 'Bath', '#3B82F6', now()),
  ('סלון', 'Sofa', '#8B5CF6', now()),
  ('חדר שינה', 'Bed', '#EC4899', now()),
  ('כביסה', 'Shirt', '#F59E0B', now()),
  ('חוץ', 'TreePine', '#22C55E', now()),
  ('חיות מחמד', 'Cat', '#F97316', now()),
  ('כללי', 'Home', '#6B7280', now())
ON CONFLICT DO NOTHING;

-- ============================================
-- Auto-create profile on signup (trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
