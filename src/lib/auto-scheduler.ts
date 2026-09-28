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
// Nightly planner: roll overdue undone tasks forward to today
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
// due today or later. So the concrete, data-supported behavior this cron
// now performs is: roll overdue, undone tasks forward to today's Israel
// date.

export interface RolloverResult {
  householdId: string;
  rolledOver: number;
  errors: string[];
}

/**
 * Roll overdue, undone tasks (status "pending" or "in_progress", due_date
 * strictly before `today`) forward to `today` for one household.
 *
 * Idempotent by construction: it only touches rows where due_date < today.
 * After the update those rows have due_date = today, so a second call with
 * the same `today` finds nothing left to move and returns rolledOver: 0.
 * Tasks with no due_date are left untouched (nothing to reschedule).
 * Completed/skipped tasks are left untouched (nothing to unstick).
 */
export async function rollOverdueTasksToToday(
  supabase: SupabaseClient<Database>,
  householdId: string,
  today: Date
): Promise<RolloverResult> {
  const todayStr = formatDate(today);
  const result: RolloverResult = { householdId, rolledOver: 0, errors: [] };

  const { data, error } = await supabase
    .from("tasks")
    .update({ due_date: todayStr })
    .eq("household_id", householdId)
    .lt("due_date", todayStr)
    .in("status", ["pending", "in_progress"])
    .select("id");

  if (error) {
    result.errors.push(`Failed to roll over tasks: ${error.message}`);
    return result;
  }

  result.rolledOver = data?.length ?? 0;
  return result;
}

export interface PlannerRunSummary {
  householdsProcessed: number;
  tasksRolledOver: number;
  errors: string[];
}

/**
 * Run the nightly rollover for a list of households (one per row from
 * `households`). Returns per-household results plus a summary suitable for
 * a one-line log (counts only -- never task titles or user ids).
 */
export async function runNightlyPlannerForHouseholds(
  supabase: SupabaseClient<Database>,
  householdIds: string[],
  today: Date
): Promise<{ results: RolloverResult[]; summary: PlannerRunSummary }> {
  const results: RolloverResult[] = [];
  for (const householdId of householdIds) {
    results.push(await rollOverdueTasksToToday(supabase, householdId, today));
  }
  const summary: PlannerRunSummary = {
    householdsProcessed: results.length,
    tasksRolledOver: results.reduce((sum, r) => sum + r.rolledOver, 0),
    errors: results.flatMap((r) => r.errors),
  };
  return { results, summary };
}
