/**
 * Task flag normalisation.
 *
 * WHY THIS EXISTS — the live `tasks.recurring` column is `text`, not `boolean`
 * (schema drift: migration 001 declares `boolean`, production stores `text`).
 * PostgREST therefore returns the STRINGS "true" / "false", and in JavaScript
 * `!!"false"` is `true`. Every task looked recurring, which meant:
 *   · `markComplete` never wrote `status = 'completed'` for one-off tasks
 *   · every task card rendered the "חוזר" badge
 *
 * `src/lib/types/database.ts` declares `recurring: boolean`, so `tsc` cannot
 * catch this, and the unit tests mock a real boolean, so they cannot either.
 *
 * Read the flag through this helper — never `!!task.recurring` — so both the
 * boolean and the text representation resolve identically. This is deliberately
 * a READ-side fix: it does not touch how the data is stored.
 */
export function isRecurring(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "t" || v === "1" || v === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Is this task genuinely overdue?
 *
 * A RECURRING task is never overdue. It is simply due again.
 *
 * WHY THIS EXISTS — the old test was `due_date < today && status !== 'completed'`.
 * A recurring task never carries `status = 'completed'` (by design: its done-ness
 * lives in `task_completions`, so it can reset daily). The two facts combined mean
 * every recurring chore whose due_date had passed was marked overdue PERMANENTLY,
 * no matter how many times it had actually been done.
 *
 * That is the whole "43 overdue tasks from February and March" shame-wall.
 * Measured on the real household 2026-08-07: 43 flagged overdue, 43 of them
 * recurring, and ZERO genuinely-overdue one-off tasks. It was never a data
 * problem — archiving those 43 would have retired a working chore rotation to
 * hide a display bug.
 *
 * A one-off task with a past due date is still overdue, and still says so.
 */
export function isTaskOverdue(
  task: { due_date?: string | null; status?: string | null; recurring?: unknown },
  today: string = todayISO()
): boolean {
  if (isRecurring(task.recurring)) return false;
  if (!task.due_date) return false;
  if (task.status === "completed" || task.status === "skipped") return false;
  return task.due_date < today;
}
