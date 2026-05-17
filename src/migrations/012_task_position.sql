-- Migration 012: Persist manual task ordering
-- Adds a nullable position column for task list drag-and-drop ordering.
-- Safe to run after existing task migrations; this file is intentionally not run by Codex.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS position integer;

WITH ordered_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(category_id::text, 'uncategorized'), status
      ORDER BY created_at DESC
    ) - 1 AS next_position
  FROM public.tasks
  WHERE position IS NULL
)
UPDATE public.tasks AS tasks
SET position = ordered_tasks.next_position
FROM ordered_tasks
WHERE tasks.id = ordered_tasks.id;

CREATE INDEX IF NOT EXISTS idx_tasks_position
  ON public.tasks(position);
