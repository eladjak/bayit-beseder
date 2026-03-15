import { TASK_TEMPLATES_SEED, type TaskTemplate } from "./seed-data";
import { isTemplateDueOnDate, formatDate, DIFFICULTY_WEIGHT } from "./auto-scheduler";
import type { TaskRow } from "./types/database";

// ============================================
// Types
// ============================================

export interface PlannedTask {
  title: string;
  category: TaskTemplate["category"];
  assignee: string | null; // user id
  estimated_minutes: number;
  difficulty: 1 | 2 | 3;
  isExisting: boolean; // true = already in DB, false = newly proposed
  existingId?: string; // task id if isExisting
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  dayName: string;
  tasks: PlannedTask[];
  totalMinutes: number;
}

export type WeekPlan = DayPlan[];

interface GenerateOptions {
  existingTasks: TaskRow[];
  members: string[]; // user ids (1 or 2)
  weekStartDate: Date; // Sunday
}

// ============================================
// Constants
// ============================================

const HEBREW_DAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

/** Target minutes per day (comfortable workload) */
const TARGET_MINUTES_PER_DAY = 45;
/** Maximum minutes per day (hard cap) */
const MAX_MINUTES_PER_DAY = 75;
/** Friday gets only quick tasks */
const FRIDAY_MAX_MINUTES = 20;
/** Saturday = Shabbat, no tasks */
const SHABBAT_MAX_MINUTES = 0;

// ============================================
// Helpers
// ============================================

/**
 * Estimate task minutes from title keywords (matches smart-scheduler.ts pattern)
 */
function estimateMinutesFromTitle(title: string): number {
  const t = title.toLowerCase();
  if (
    t.includes("עמוק") ||
    t.includes("גיהוץ") ||
    t.includes("כביסה") ||
    t.includes("קיפול") ||
    t.includes("שטיפת רצפות")
  ) {
    return 30;
  }
  if (
    t.includes("ניקוי") ||
    t.includes("שאיבת אבק") ||
    t.includes("מקלחת") ||
    t.includes("כיריים") ||
    t.includes("החלפת מצעים")
  ) {
    return 15;
  }
  return 5;
}

/**
 * Find the template from seed data that matches a task title, if any.
 */
function findMatchingTemplate(title: string): TaskTemplate | undefined {
  return TASK_TEMPLATES_SEED.find((t) => t.title === title);
}

/**
 * Get the daily minute cap for a given day index (0=Sun, 5=Fri, 6=Sat).
 */
function getDayCap(dayIndex: number): number {
  if (dayIndex === 6) return SHABBAT_MAX_MINUTES; // Shabbat
  if (dayIndex === 5) return FRIDAY_MAX_MINUTES; // Friday
  return MAX_MINUTES_PER_DAY;
}

/**
 * Compute total weighted load for a member across the plan.
 */
function memberLoad(plan: WeekPlan, memberId: string): number {
  let load = 0;
  for (const day of plan) {
    for (const task of day.tasks) {
      if (task.assignee === memberId) {
        load += DIFFICULTY_WEIGHT[task.difficulty] ?? 2;
      }
    }
  }
  return load;
}

// ============================================
// Main Generator
// ============================================

/**
 * Generate a balanced weekly task plan.
 *
 * Algorithm:
 * 1. Map existing tasks for the week into PlannedTask (isExisting=true)
 * 2. Find templates due each day via isTemplateDueOnDate()
 * 3. Filter out duplicates (templates already covered by existing tasks)
 * 4. Greedy bin-pack new tasks into days (Sun-Thu full, Fri light, Sat empty)
 * 5. Balance assignments between members
 * 6. Group same-category tasks on same day when possible
 */
export function generateWeekPlan(options: GenerateOptions): WeekPlan {
  const { existingTasks, members, weekStartDate } = options;

  // Initialize 7-day plan
  const plan: WeekPlan = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + i);
    plan.push({
      date: formatDate(date),
      dayName: HEBREW_DAYS[i],
      tasks: [],
      totalMinutes: 0,
    });
  }

  // Step 1: Place existing tasks
  const existingTitlesThisWeek = new Set<string>();
  for (const task of existingTasks) {
    if (!task.due_date) continue;
    const dayIndex = plan.findIndex((d) => d.date === task.due_date);
    if (dayIndex === -1) continue;

    const template = findMatchingTemplate(task.title);
    const minutes = template?.estimated_minutes ?? estimateMinutesFromTitle(task.title);
    const difficulty = template?.difficulty ?? (minutes >= 20 ? 3 : minutes >= 10 ? 2 : 1);

    const planned: PlannedTask = {
      title: task.title,
      category: (template?.category ?? getCategoryFromId(task.category_id)) as TaskTemplate["category"],
      assignee: task.assigned_to,
      estimated_minutes: minutes,
      difficulty: difficulty as 1 | 2 | 3,
      isExisting: true,
      existingId: task.id,
    };

    plan[dayIndex].tasks.push(planned);
    plan[dayIndex].totalMinutes += minutes;
    existingTitlesThisWeek.add(task.title);
  }

  // Step 2: Collect candidate new tasks from templates
  const candidates: Array<{ template: TaskTemplate; dayIndex: number }> = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + i);

    // Skip Shabbat entirely
    if (i === 6) continue;

    for (const tmpl of TASK_TEMPLATES_SEED) {
      // Check if template is due this day
      const templateWithRecurrence = {
        recurrence_type: tmpl.recurrence_type,
        recurrence_day: getRecurrenceDayForSeed(tmpl),
        active: true as const,
      };

      if (!isTemplateDueOnDate(templateWithRecurrence, date)) continue;

      // Skip if already exists this week
      if (existingTitlesThisWeek.has(tmpl.title)) continue;

      // Friday: only difficulty 1 tasks
      if (i === 5 && tmpl.difficulty > 1) continue;

      candidates.push({ template: tmpl, dayIndex: i });
    }
  }

  // Step 3: Sort candidates — prefer weekly/biweekly, then by difficulty (lighter first)
  candidates.sort((a, b) => {
    const recurrenceOrder: Record<string, number> = {
      daily: 3,
      weekly: 1,
      biweekly: 2,
      monthly: 4,
      quarterly: 5,
      yearly: 6,
    };
    const ra = recurrenceOrder[a.template.recurrence_type] ?? 3;
    const rb = recurrenceOrder[b.template.recurrence_type] ?? 3;
    if (ra !== rb) return ra - rb;
    return a.template.difficulty - b.template.difficulty;
  });

  // Step 4: Greedy bin-pack into days
  // Track which titles we've added to avoid cross-day duplicates for non-daily tasks
  const addedTitles = new Set<string>();

  // Daily tasks: try to add each day they're due
  const dailyCandidates = candidates.filter((c) => c.template.recurrence_type === "daily");
  const nonDailyCandidates = candidates.filter((c) => c.template.recurrence_type !== "daily");

  // For daily tasks, pick 1 representative day per task (spread across the week)
  const dailyByTitle = new Map<string, Array<{ template: TaskTemplate; dayIndex: number }>>();
  for (const c of dailyCandidates) {
    const existing = dailyByTitle.get(c.template.title) ?? [];
    existing.push(c);
    dailyByTitle.set(c.template.title, existing);
  }

  // Add daily tasks to their lightest available day
  for (const [title, dayOptions] of dailyByTitle) {
    if (addedTitles.has(title)) continue;

    // Find the day with least load among the options
    const bestDay = dayOptions
      .filter((d) => {
        const cap = getDayCap(d.dayIndex);
        return plan[d.dayIndex].totalMinutes + d.template.estimated_minutes <= cap;
      })
      .sort((a, b) => plan[a.dayIndex].totalMinutes - plan[b.dayIndex].totalMinutes)[0];

    if (bestDay) {
      const assignee = pickAssignee(plan, members);
      plan[bestDay.dayIndex].tasks.push({
        title: bestDay.template.title,
        category: bestDay.template.category,
        assignee,
        estimated_minutes: bestDay.template.estimated_minutes,
        difficulty: bestDay.template.difficulty,
        isExisting: false,
      });
      plan[bestDay.dayIndex].totalMinutes += bestDay.template.estimated_minutes;
      addedTitles.add(title);
    }
  }

  // Non-daily tasks: place on their due day if capacity allows
  for (const { template, dayIndex } of nonDailyCandidates) {
    if (addedTitles.has(template.title)) continue;

    const cap = getDayCap(dayIndex);
    if (plan[dayIndex].totalMinutes + template.estimated_minutes > cap) {
      // Try to find another day with same category and capacity (room batching)
      const altDay = findAlternativeDay(plan, template, dayIndex);
      if (altDay !== -1) {
        const assignee = pickAssignee(plan, members);
        plan[altDay].tasks.push({
          title: template.title,
          category: template.category,
          assignee,
          estimated_minutes: template.estimated_minutes,
          difficulty: template.difficulty,
          isExisting: false,
        });
        plan[altDay].totalMinutes += template.estimated_minutes;
        addedTitles.add(template.title);
      }
      continue;
    }

    const assignee = pickAssignee(plan, members);
    plan[dayIndex].tasks.push({
      title: template.title,
      category: template.category,
      assignee,
      estimated_minutes: template.estimated_minutes,
      difficulty: template.difficulty,
      isExisting: false,
    });
    plan[dayIndex].totalMinutes += template.estimated_minutes;
    addedTitles.add(template.title);
  }

  // Step 5: Rebalance assignments to improve fairness
  if (members.length === 2) {
    rebalanceAssignments(plan, members);
  }

  return plan;
}

// ============================================
// Internal helpers
// ============================================

function getCategoryFromId(categoryId: string | null): string {
  if (!categoryId) return "general";
  const valid = ["kitchen", "bathroom", "living", "bedroom", "laundry", "outdoor", "pets", "general"];
  return valid.includes(categoryId) ? categoryId : "general";
}

/**
 * Derive recurrence_day from seed template for isTemplateDueOnDate compatibility.
 * Seed templates don't have recurrence_day, so we infer defaults:
 * - daily: null (always due)
 * - weekly: use sort_order to spread across days (Sun-Fri)
 * - biweekly/monthly/quarterly/yearly: use sort_order-based mapping
 */
function getRecurrenceDayForSeed(tmpl: TaskTemplate): number | null {
  switch (tmpl.recurrence_type) {
    case "daily":
      return null;
    case "weekly":
      // Spread weekly tasks across Sun(0)-Fri(5) based on sort_order
      return ((tmpl.sort_order - 21) % 6);
    case "biweekly":
      return ((tmpl.sort_order - 51) % 6);
    case "monthly":
      // Day of month: use sort_order to assign 1st, 5th, 10th, 15th etc.
      return ((tmpl.sort_order - 61) * 5 + 1);
    case "quarterly":
      return ((tmpl.sort_order - 76) * 5 + 1);
    case "yearly":
      return tmpl.sort_order;
    default:
      return null;
  }
}

/**
 * Pick assignee: choose the member with less weighted load across the plan.
 */
function pickAssignee(plan: WeekPlan, members: string[]): string | null {
  if (members.length === 0) return null;
  if (members.length === 1) return members[0];

  const load0 = memberLoad(plan, members[0]);
  const load1 = memberLoad(plan, members[1]);
  return load0 <= load1 ? members[0] : members[1];
}

/**
 * Find an alternative day for a task when its natural day is full.
 * Prefers days with same-category tasks (room batching).
 */
function findAlternativeDay(
  plan: WeekPlan,
  template: TaskTemplate,
  _originalDay: number
): number {
  let bestDay = -1;
  let bestScore = -1;

  for (let i = 0; i < 6; i++) { // Exclude Shabbat (6)
    const cap = getDayCap(i);
    if (plan[i].totalMinutes + template.estimated_minutes > cap) continue;

    // Score: prefer days with same category (room batching) and lower load
    const sameCategoryCount = plan[i].tasks.filter(
      (t) => t.category === template.category
    ).length;
    const loadScore = (cap - plan[i].totalMinutes) / cap; // 0-1, higher = more free
    const score = sameCategoryCount * 2 + loadScore;

    if (score > bestScore) {
      bestScore = score;
      bestDay = i;
    }
  }

  return bestDay;
}

/**
 * Rebalance task assignments between members to improve fairness.
 * Only reassigns NEW tasks (isExisting=false).
 * Supports any number of members (2+).
 */
function rebalanceAssignments(plan: WeekPlan, members: string[]): void {
  if (members.length < 2) return;

  for (let pass = 0; pass < 3; pass++) {
    // Find most and least loaded members
    const loads = members.map((m) => ({ id: m, load: memberLoad(plan, m) }));
    loads.sort((a, b) => b.load - a.load);
    const overloaded = loads[0];
    const underloaded = loads[loads.length - 1];
    const diff = overloaded.load - underloaded.load;

    // If reasonably balanced, stop
    if (diff <= 2) break;

    // Find a new task assigned to the overloaded member and reassign
    let swapped = false;
    for (const day of plan) {
      for (const task of day.tasks) {
        if (!task.isExisting && task.assignee === overloaded.id) {
          task.assignee = underloaded.id;
          swapped = true;
          break;
        }
      }
      if (swapped) break;
    }

    if (!swapped) break;
  }
}

// ============================================
// Plan manipulation helpers (used by the hook)
// ============================================

export function moveTaskInPlan(
  plan: WeekPlan,
  fromDate: string,
  taskIndex: number,
  toDate: string
): WeekPlan {
  const fromDay = plan.find((d) => d.date === fromDate);
  const toDay = plan.find((d) => d.date === toDate);
  if (!fromDay || !toDay || taskIndex < 0 || taskIndex >= fromDay.tasks.length) {
    return plan;
  }

  const task = fromDay.tasks[taskIndex];
  return plan.map((day) => {
    if (day.date === fromDate) {
      const tasks = day.tasks.filter((_, i) => i !== taskIndex);
      return { ...day, tasks, totalMinutes: day.totalMinutes - task.estimated_minutes };
    }
    if (day.date === toDate) {
      const tasks = [...day.tasks, task];
      return { ...day, tasks, totalMinutes: day.totalMinutes + task.estimated_minutes };
    }
    return day;
  });
}

export function removeTaskFromPlan(
  plan: WeekPlan,
  date: string,
  taskIndex: number
): WeekPlan {
  return plan.map((day) => {
    if (day.date !== date) return day;
    const task = day.tasks[taskIndex];
    if (!task) return day;
    const tasks = day.tasks.filter((_, i) => i !== taskIndex);
    return { ...day, tasks, totalMinutes: day.totalMinutes - task.estimated_minutes };
  });
}

export function addTaskToPlan(
  plan: WeekPlan,
  date: string,
  task: PlannedTask
): WeekPlan {
  return plan.map((day) => {
    if (day.date !== date) return day;
    const tasks = [...day.tasks, task];
    return { ...day, tasks, totalMinutes: day.totalMinutes + task.estimated_minutes };
  });
}

export function reassignTaskInPlan(
  plan: WeekPlan,
  date: string,
  taskIndex: number,
  newAssignee: string
): WeekPlan {
  return plan.map((day) => {
    if (day.date !== date) return day;
    const tasks = day.tasks.map((t, i) =>
      i === taskIndex ? { ...t, assignee: newAssignee } : t
    );
    return { ...day, tasks };
  });
}
