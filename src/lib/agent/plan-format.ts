/**
 * Format a generated WeekPlan for agent consumption.
 *
 * Produces two artifacts from one plan:
 *  1. A compact JSON summary (machine-readable — for the calling agent to reason over).
 *  2. A ready-to-send Hebrew WhatsApp text block (human-readable — the agent can
 *     forward it verbatim to a WhatsApp number / push channel).
 *
 * Member ids are mapped to display names via a supplied lookup so the output is
 * human-meaningful even though the planner works in user-ids.
 */

import type { WeekPlan, PlannedTask } from "@/lib/weekly-generator";
import { CATEGORY_KEY_TO_NAME } from "@/lib/categories";

export interface PlanSummaryTask {
  title: string;
  category: string;
  categoryLabel: string;
  assignee: string | null; // display name (resolved) or null
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  isExisting: boolean;
}

export interface PlanSummaryDay {
  date: string; // YYYY-MM-DD
  dayName: string;
  totalMinutes: number;
  tasks: PlanSummaryTask[];
}

export interface PlanSummary {
  weekStart: string;
  totalTasks: number;
  totalMinutes: number;
  days: PlanSummaryDay[];
  /** Per-member task counts keyed by display name. */
  perMember: Record<string, number>;
}

function resolveAssignee(
  task: PlannedTask,
  nameMap: Record<string, string>
): string | null {
  if (!task.assignee) return null;
  return nameMap[task.assignee] ?? task.assignee;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0 דק׳";
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ש׳ ${mins} דק׳` : `${hours} ש׳`;
}

/** Build the machine-readable summary. */
export function buildPlanSummary(
  plan: WeekPlan,
  nameMap: Record<string, string>
): PlanSummary {
  const days: PlanSummaryDay[] = plan.map((day) => ({
    date: day.date,
    dayName: day.dayName,
    totalMinutes: day.totalMinutes,
    tasks: day.tasks.map((t) => ({
      title: t.title,
      category: t.category,
      categoryLabel: CATEGORY_KEY_TO_NAME[t.category] ?? t.category,
      assignee: resolveAssignee(t, nameMap),
      estimatedMinutes: t.estimated_minutes,
      difficulty: t.difficulty,
      isExisting: t.isExisting,
    })),
  }));

  const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0);
  const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);

  const perMember: Record<string, number> = {};
  for (const d of days) {
    for (const t of d.tasks) {
      const key = t.assignee ?? "לא משויך";
      perMember[key] = (perMember[key] ?? 0) + 1;
    }
  }

  return {
    weekStart: days[0]?.date ?? "",
    totalTasks,
    totalMinutes,
    days,
    perMember,
  };
}

/**
 * Build a ready-to-send Hebrew WhatsApp text block from a plan summary.
 * Skips empty days (e.g. Shabbat) to keep the message tight.
 */
export function buildPlanWhatsAppText(summary: PlanSummary): string {
  const header = `📅 תוכנית שבועית — בית בסדר\nשבוע שמתחיל ב-${summary.weekStart}`;
  const stat = `📋 ${summary.totalTasks} משימות | ⏱ סה״כ ${formatMinutes(
    summary.totalMinutes
  )}`;

  const dayBlocks = summary.days
    .filter((d) => d.tasks.length > 0)
    .map((d) => {
      const lines = d.tasks
        .map((t) => {
          const who = t.assignee ? ` — ${t.assignee}` : "";
          return `  • ${t.title}${who} (${t.estimatedMinutes} דק׳)`;
        })
        .join("\n");
      return `*${d.dayName}* (${formatMinutes(d.totalMinutes)})\n${lines}`;
    });

  const memberLine = Object.keys(summary.perMember).length
    ? `\n\n👥 חלוקה: ${Object.entries(summary.perMember)
        .map(([name, count]) => `${name}: ${count}`)
        .join(" | ")}`
    : "";

  const body = dayBlocks.length
    ? dayBlocks.join("\n\n")
    : "אין משימות מתוכננות לשבוע זה.";

  return `${header}\n${stat}\n\n${body}${memberLine}\n\n--- בית בסדר ---`;
}
