DROP POLICY IF EXISTS "Users can delete own household completions" ON public.task_completions;
CREATE POLICY "Users can delete own household completions"
  ON public.task_completions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_completions.task_id
      AND public.is_household_member(t.household_id)
  ));

-- One transaction and one task-row lock serialize completion and undo.
-- Invoker privileges retain the existing RLS policies. Service callers must
-- supply the household verified by the agent token and a household member.
CREATE OR REPLACE FUNCTION public.transition_task_completion(
  p_task_id uuid,
  p_action text,
  p_completion_id uuid DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_household_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS public.task_completions
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_completion public.task_completions%ROWTYPE;
  v_user uuid;
  v_recurring boolean;
  v_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Jerusalem') AT TIME ZONE 'Asia/Jerusalem';
  v_end timestamptz := (date_trunc('day', now() AT TIME ZONE 'Asia/Jerusalem') + interval '1 day') AT TIME ZONE 'Asia/Jerusalem';
BEGIN
  IF current_user = 'service_role' THEN
    IF p_household_id IS NULL OR p_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.household_members WHERE household_id = p_household_id AND user_id = p_user_id
    ) THEN RAISE EXCEPTION 'Invalid household member' USING ERRCODE = '42501'; END IF;
    v_user := p_user_id;
  ELSE
    v_user := auth.uid();
    IF v_user IS NULL OR p_household_id IS NOT NULL OR p_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND OR (current_user = 'service_role' AND v_task.household_id IS DISTINCT FROM p_household_id) THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = '42501';
  END IF;

  -- Match src/lib/task-flags.ts for both production text and boolean schemas.
  v_recurring := coalesce(lower(btrim(v_task.recurring::text)) IN ('true', 't', '1', 'yes'), false);

  IF p_action = 'complete' THEN
    IF p_completion_id IS NULL THEN RAISE EXCEPTION 'Completion id required'; END IF;
    SELECT * INTO v_completion FROM public.task_completions WHERE id = p_completion_id;
    IF FOUND THEN
      IF v_completion.task_id <> p_task_id OR v_completion.user_id <> v_user THEN
        RAISE EXCEPTION 'Completion id already used' USING ERRCODE = '42501';
      END IF;
      RETURN v_completion;
    END IF;
    IF v_task.status = 'skipped' THEN RAISE EXCEPTION 'Task is skipped'; END IF;
    IF v_recurring THEN
      SELECT * INTO v_completion FROM public.task_completions
        WHERE task_id = p_task_id AND completed_at >= v_start AND completed_at < v_end
        ORDER BY completed_at DESC, id DESC LIMIT 1;
      IF FOUND THEN RETURN v_completion; END IF;
    ELSIF v_task.status = 'completed' THEN
      SELECT * INTO v_completion FROM public.task_completions WHERE task_id = p_task_id
        ORDER BY completed_at DESC, id DESC LIMIT 1;
      IF FOUND THEN RETURN v_completion; END IF;
      RAISE EXCEPTION 'Task already completed without a completion record';
    END IF;
    INSERT INTO public.task_completions (id, task_id, user_id, photo_url, notes)
      VALUES (p_completion_id, p_task_id, v_user, p_photo_url, p_notes) RETURNING * INTO v_completion;
    IF NOT v_recurring THEN
      UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Task update denied'; END IF;
    END IF;
    RETURN v_completion;
  ELSIF p_action = 'undo' THEN
    SELECT * INTO v_completion FROM public.task_completions
      WHERE task_id = p_task_id AND user_id = v_user
        AND (NOT v_recurring OR (completed_at >= v_start AND completed_at < v_end))
      ORDER BY completed_at DESC, id DESC LIMIT 1;
    IF NOT FOUND THEN
      IF v_recurring OR v_task.status = 'pending' THEN
        v_completion.task_id := p_task_id;
        v_completion.user_id := v_user;
        RETURN v_completion;
      END IF;
      RAISE EXCEPTION 'No own completion to undo';
    END IF;
    DELETE FROM public.task_completions WHERE id = v_completion.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Completion delete denied'; END IF;
    IF NOT v_recurring THEN
      UPDATE public.tasks SET status = 'pending' WHERE id = p_task_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Task update denied'; END IF;
    END IF;
    RETURN v_completion;
  END IF;
  RAISE EXCEPTION 'Invalid task action';
END;
$$;
REVOKE ALL ON FUNCTION public.transition_task_completion(uuid,text,uuid,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_task_completion(uuid,text,uuid,text,text,uuid,uuid) TO authenticated, service_role;
