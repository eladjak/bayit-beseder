import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TaskTemplate } from "@/lib/types/database";

// ============================================
// Difficulty weight constants
// ============================================

/** Difficulty weight mapping: 1=light (קל), 2=moderate (בינוני), 3=heavy (כבד) */
export const DIFFICULTY_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

// ============================================
// Pure helper functions (exported for testing)
// ============================================

/** Format a Date as YYYY-MM-DD string */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns "today" as a Date at UTC midnight of Israel's CURRENT calendar
 * day -- not the server's current UTC calendar day.
 *
 * This matters because the auto-schedule cron fires at 22:00 UTC (see
 * vercel.json), which is already 00:00 or 01:00 the NEXT day in Israel
 * (Asia/Jerusalem is UTC+2 in winter, UTC+3 in summer). Plain `new Date()`
 * represents that same instant, and formatDate()/toISOString() read its UTC
 * calendar date -- which is still YESTERDAY relative to Israel. Every night
 * the 7-day scheduling window was silently built as
 * [Israel's yesterday .. yesterday+6] instead of [today .. today+6]: real
 * "today" was never scheduled, and a day that had already passed was
 * re-processed instead.
 *
 * The returned Date is anchored at UTC midnight of the correct Israel
 * calendar day so every downstream UTC-based helper in this file
 * (formatDate, getDate()/setDate() day-stepping) stays internally
 * consistent while representing the right real-world day.
 */
export function getTodayInIsrael(): Date {
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "YYYY-MM-DD"
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Get ISO week number for a date (1-based, Monday start) */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get day-of-year for a date (1-365/366) */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Determine if a template is due on a given date.
 *
 * recurrence_day meaning per type:
 * - daily: ignored (always due)
 * - weekly: day of week (0=Sunday .. 6=Saturday)
 * - biweekly: day of week + only on even ISO weeks
 * - monthly: day of month (1-28)
 * - quarterly: day of month + month must be Jan(0), Apr(3), Jul(6), Oct(9)
 * - yearly: day of year (1-365)
 */
export function isTemplateDueOnDate(
  template: Pick<TaskTemplate, "recurrence_type" | "recurrence_day">,
  date: Date
): boolean {
  const recurrenceDay = template.recurrence_day;

  switch (template.recurrence_type) {
    case "daily":
      return true;

    case "weekly":
      return recurrenceDay != null && date.getDay() === recurrenceDay;

    case "biweekly":
      if (recurrenceDay == null || date.getDay() !== recurrenceDay) return false;
      return getISOWeekNumber(date) % 2 === 0;

    case "monthly":
      return recurrenceDay != null && date.getDate() === recurrenceDay;

    case "quarterly": {
      if (recurrenceDay == null || date.getDate() !== recurrenceDay) return false;
      const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
      return quarterMonths.includes(date.getMonth());
    }

    case "yearly":
      return recurrenceDay != null && getDayOfYear(date) === recurrenceDay;

    default:
      return false;
  }
}

/** Filter templates to only those due on a specific date */
export function getTemplatesDueOnDate(
  templates: Pick<TaskTemplate, "recurrence_type" | "recurrence_day" | "active">[],
  date: Date
): Pick<TaskTemplate, "recurrence_type" | "recurrence_day" | "active">[] {
  return templates.filter(
    (t) => t.active && isTemplateDueOnDate(t, date)
  );
}

// --------------------------------------------
// Nightly planner: gentle rollover + flag-for-review
// --------------------------------------------
//
// WHY THIS REPLACED THE OLD template->instance generator (Sept 2026):
//
// The auto-schedule cron used to write into `task_templates` /
// `task_instances`. A production data check found those two tables EMPTY
// (0 rows) in every household, while the app's real task list lives in the
// `tasks` table (60 rows across 3 households at the time of the check). The
// cron fired every night, found no templates, and created nothing -- it had
// been doing nothing useful since it was wired up. Migration 019 had
// already independently confirmed zero CLIENT call sites for those two
// tables; this was the last server-side reader, so the path was fully dead.
//
// `tasks` has a `recurring` boolean flag but no cadence (no
// recurrence_type/recurrence_day columns), so "generate the next
// occurrence" cannot be reconstructed for it without inventing a schedule
// that no data supports. What the data DID show, unambiguously, across all
// three households: every single pending/in-progress task had a due_date in
// the past -- the oldest from February, the newest three weeks ago, zero
// due today or later.
//
// FIRST VERSION (moved every overdue task straight to today) was replaced
// by "gentle rollover" per Elad's decision: silently bumping a task that's
// been sitting for a month+ to "due today" hides how stale it really is,
// and dumping everything on today at once just recreates the pile-up one
// day later. So:
//   - overdue MORE than REVIEW_THRESHOLD_DAYS (14) days: never moved. Left
//     exactly where it is and flagged (flagged_for_review_at) so a person
//     decides what to do with it. See migration 023 for the column this
//     needs -- NOT yet applied to production; see that file.
//   - overdue 1-14 days: rolled forward, but capped at DAILY_CAP_PER_GROUP
//     (5) new due-dates per day per assignee (unassigned tasks share one
//     household-wide cap of 5/day, the same cap, just scoped to the whole
//     household instead of one person). Whatever doesn't fit today spills
//     to tomorrow, then the day after, etc. -- oldest due_date first, so
//     the tasks that have been waiting longest get first claim on today.
// Recurrence generation for `recurring` is still out of scope -- no
// schedule exists in the data to generate one from.

/** Tasks overdue by more than this many days are flagged, never moved. */
export const REVIEW_THRESHOLD_DAYS = 14;

/** Max new due-dates per day, per assignee (or per household for unassigned). */
export const DAILY_CAP_PER_GROUP = 5;

/** Rotation-group key for tasks with no assignee -- capped per household. */
export const UNASSIGNED_GROUP_KEY = "__unassigned__";

/** Whole calendar days between two YYYY-MM-DD strings (to - from). */
function daysBetween(fromStr: string, toStr: string): number {
  const from = Date.parse(`${fromStr}T00:00:00.000Z`);
  const to = Date.parse(`${toStr}T00:00:00.000Z`);
  return Math.round((to - from) / 86400000);
}

/** Add N whole days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

export interface OverdueTaskInput {
  id: string;
  /** YYYY-MM-DD. Caller guarantees this is strictly before `todayStr`. */
  due_date: string;
  assigned_to: string | null;
}

export interface ScheduledTaskInput {
  /** YYYY-MM-DD, today or later. */
  due_date: string;
  assigned_to: string | null;
}

export interface RolloverMove {
  id: string;
  due_date: string;
}

export interface RolloverPlan {
  /** Tasks to move, 1-14 days overdue, capped and spread. */
  moves: RolloverMove[];
  /** Task ids to flag for review instead of moving, >14 days overdue. */
  flagIds: string[];
}

/**
 * Pure planning function -- no I/O, fully unit-testable without a database.
 *
 * `overdueTasks` must already be filtered to undone (pending/in_progress),
 * not-yet-flagged, due_date < today. `alreadyScheduled` is every OTHER
 * undone task already due today or later (from a previous run, or a real
 * future due_date), so the cap accounts for what's already sitting on a
 * given day and a second run of the same day doesn't overshoot it.
 *
 * Deterministic: given the same inputs it always produces the same plan,
 * which is what makes the DB-facing function around it idempotent -- a
 * second call the same day finds no candidates left (moved tasks now have
 * due_date >= today; flagged tasks now have flagged_for_review_at set) and
 * returns an empty plan.
 */
export function planGentleRollover(
  overdueTasks: OverdueTaskInput[],
  todayStr: string,
  alreadyScheduled: ScheduledTaskInput[] = []
): RolloverPlan {
  const flagIds: string[] = [];
  const candidates: OverdueTaskInput[] = [];

  for (const task of overdueTasks) {
    const overdueDays = daysBetween(task.due_date, todayStr);
    if (overdueDays > REVIEW_THRESHOLD_DAYS) {
      flagIds.push(task.id);
    } else if (overdueDays >= 1) {
      candidates.push(task);
    }
    // overdueDays <= 0 is not possible given the caller's contract
    // (due_date < today), but if it ever happened, doing nothing is safe.
  }

  // occupancy[group] = Map<dayOffsetFromToday, countAlreadyThere>
  const occupancy = new Map<string, Map<number, number>>();
  const bump = (group: string, offset: number) => {
    let dayMap = occupancy.get(group);
    if (!dayMap) {
      dayMap = new Map();
      occupancy.set(group, dayMap);
    }
    dayMap.set(offset, (dayMap.get(offset) ?? 0) + 1);
  };

  for (const scheduled of alreadyScheduled) {
    const offset = daysBetween(todayStr, scheduled.due_date);
    if (offset < 0) continue; // defensive; caller contract says today or later
    bump(scheduled.assigned_to ?? UNASSIGNED_GROUP_KEY, offset);
  }

  // Oldest due_date first, globally -- ties broken by id for determinism.
  const sorted = [...candidates].sort(
    (a, b) => a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id)
  );

  const moves: RolloverMove[] = [];
  for (const task of sorted) {
    const group = task.assigned_to ?? UNASSIGNED_GROUP_KEY;
    let offset = 0;
    let dayMap = occupancy.get(group);
    while ((dayMap?.get(offset) ?? 0) >= DAILY_CAP_PER_GROUP) {
      offset++;
    }
    if (!dayMap) {
      dayMap = new Map();
      occupancy.set(group, dayMap);
    }
    dayMap.set(offset, (dayMap.get(offset) ?? 0) + 1);
    moves.push({ id: task.id, due_date: addDaysStr(todayStr, offset) });
  }

  return { moves, flagIds };
}

export interface PlannerHouseholdResult {
  householdId: string;
  /** Rolled forward to due today (dayOffset 0). */
  movedToday: number;
  /** Rolled forward to a later day because today was at the cap. */
  movedLater: number;
  /** How many days out the furthest spread task landed (0 = none spread). */
  spreadDays: number;
  /** Overdue more than 14 days -- left in place, flagged instead. */
  flaggedForReview: number;
  errors: string[];
}

/**
 * Run the gentle-rollover planner for one household and apply it.
 *
 * Never touches completed/skipped tasks, never touches a task that's
 * already flagged, never changes any field other than due_date (for
 * rollovers) or flagged_for_review_at (for the >14-day bucket).
 */
export async function runNightlyPlannerForHousehold(
  supabase: SupabaseClient<Database>,
  householdId: string,
  today: Date
): Promise<PlannerHouseholdResult> {
  const todayStr = formatDate(today);
  const result: PlannerHouseholdResult = {
    householdId,
    movedToday: 0,
    movedLater: 0,
    spreadDays: 0,
    flaggedForReview: 0,
    errors: [],
  };

  const { data: overdue, error: overdueError } = await supabase
    .from("tasks")
    .select("id, due_date, assigned_to")
    .eq("household_id", householdId)
    .lt("due_date", todayStr)
    .in("status", ["pending", "in_progress"])
    .is("flagged_for_review_at", null);

  if (overdueError) {
    result.errors.push(`Failed to fetch overdue tasks: ${overdueError.message}`);
    return result;
  }
  if (!overdue || overdue.length === 0) {
    return result;
  }

  const { data: upcoming, error: upcomingError } = await supabase
    .from("tasks")
    .select("due_date, assigned_to")
    .eq("household_id", householdId)
    .gte("due_date", todayStr)
    .in("status", ["pending", "in_progress"]);

  if (upcomingError) {
    result.errors.push(`Failed to fetch upcoming tasks: ${upcomingError.message}`);
    return result;
  }

  const plan = planGentleRollover(
    overdue.map((t) => ({ id: t.id, due_date: t.due_date as string, assigned_to: t.assigned_to })),
    todayStr,
    (upcoming ?? [])
      .filter((t): t is { due_date: string; assigned_to: string | null } => t.due_date != null)
      .map((t) => ({ due_date: t.due_date, assigned_to: t.assigned_to }))
  );

  // Apply moves grouped by target due_date -- one round trip per distinct
  // date instead of one per task.
  const idsByDate = new Map<string, string[]>();
  for (const move of plan.moves) {
    const ids = idsByDate.get(move.due_date) ?? [];
    ids.push(move.id);
    idsByDate.set(move.due_date, ids);
  }

  for (const [dueDate, ids] of idsByDate) {
    const { data: moved, error: moveError } = await supabase
      .from("tasks")
      .update({ due_date: dueDate })
      .in("id", ids)
      .select("id");

    if (moveError) {
      result.errors.push(`Failed to move tasks to ${dueDate}: ${moveError.message}`);
      continue;
    }

    const count = moved?.length ?? 0;
    const offset = daysBetween(todayStr, dueDate);
    if (offset === 0) {
      result.movedToday += count;
    } else {
      result.movedLater += count;
    }
    if (count > 0) {
      result.spreadDays = Math.max(result.spreadDays, offset);
    }
  }

  if (plan.flagIds.length > 0) {
    const { data: flagged, error: flagError } = await supabase
      .from("tasks")
      .update({ flagged_for_review_at: new Date().toISOString() })
      .in("id", plan.flagIds)
      .select("id");

    if (flagError) {
      result.errors.push(`Failed to flag tasks for review: ${flagError.message}`);
    } else {
      result.flaggedForReview = flagged?.length ?? 0;
    }
  }

  return result;
}

export interface PlannerRunSummary {
  householdsProcessed: number;
  tasksMovedToday: number;
  tasksMovedLater: number;
  tasksFlaggedForReview: number;
  errors: string[];
}

/**
 * Run the nightly planner for a list of households (one per row from
 * `households`). Returns per-household results plus a summary suitable for
 * a one-line log (counts only -- never task titles or user ids).
 */
export async function runNightlyPlannerForHouseholds(
  supabase: SupabaseClient<Database>,
  householdIds: string[],
  today: Date
): Promise<{ results: PlannerHouseholdResult[]; summary: PlannerRunSummary }> {
  const results: PlannerHouseholdResult[] = [];
  for (const householdId of householdIds) {
    results.push(await runNightlyPlannerForHousehold(supabase, householdId, today));
  }
  const summary: PlannerRunSummary = {
    householdsProcessed: results.length,
    tasksMovedToday: results.reduce((sum, r) => sum + r.movedToday, 0),
    tasksMovedLater: results.reduce((sum, r) => sum + r.movedLater, 0),
    tasksFlaggedForReview: results.reduce((sum, r) => sum + r.flaggedForReview, 0),
    errors: results.flatMap((r) => r.errors),
  };
  return { results, summary };
}
