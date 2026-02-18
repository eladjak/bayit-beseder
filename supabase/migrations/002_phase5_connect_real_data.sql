-- BayitBeSeder (בית בסדר) - Phase 5 Migration
-- Connects app to real Supabase data
-- Adds task_templates seeding, Realtime on tasks, and partner/profile views

-- ============================================
-- 1. Add partner_id to profiles for simple 2-user setup
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN partner_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- ============================================
-- 2. Add points and streak columns to profiles if not exist
--    (Phase 3 migration may have created a different profiles table)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN points integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'streak'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN streak integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. Enable Realtime on tasks and task_completions (Phase 3 tables)
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- already added
  NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_completions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 4. Add index for faster profile partner lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_partner ON public.profiles(partner_id);

-- ============================================
-- 5. Function to increment points on task completion
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_points_on_completion()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + COALESCE(
    (SELECT points FROM public.tasks WHERE id = NEW.task_id),
    10
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_completed_increment_points ON public.task_completions;
CREATE TRIGGER on_task_completed_increment_points
  AFTER INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.increment_points_on_completion();

-- ============================================
-- 6. Function to update streak when all daily tasks done
-- ============================================
CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS trigger AS $$
DECLARE
  pending_count integer;
  today date := CURRENT_DATE;
BEGIN
  -- Count remaining pending tasks for this user today
  SELECT COUNT(*) INTO pending_count
  FROM public.tasks
  WHERE assigned_to = NEW.user_id
    AND due_date = today
    AND status = 'pending';

  -- If no pending tasks left, increment streak
  IF pending_count = 0 THEN
    UPDATE public.profiles
    SET streak = streak + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_completion_update_streak ON public.task_completions;
CREATE TRIGGER on_completion_update_streak
  AFTER INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_streak();
