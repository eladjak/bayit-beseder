import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TaskTemplate, TaskInstance } from "@/lib/types/database";

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

/**
 * Compute weighted load for a member based on assigned instances and their difficulty.
 * Each instance contributes its difficulty weight (defaults to 2 if missing).
 */
export function computeWeightedLoad(
  instances: Array<{ assigned_to: string | null; difficulty?: number }>,
  memberId: string
): number {
  let load = 0;
  for (const inst of instances) {
    if (inst.assigned_to === memberId) {
      const diff = inst.difficulty != null ? inst.difficulty : 2;
      load += DIFFICULTY_WEIGHT[diff] ?? 2;
    }
  }
  return load;
}

/**
 * Select who to assign a task to using rotation logic.
 *
 * 1. If template has default_assignee, use it
 * 2. If goldenRuleTarget is provided, use weighted load to balance toward target ratio
 * 3. Otherwise, fall back to count-based rotation (original behavior)
 */
export function selectAssignee(
  template: Pick<TaskTemplate, "default_assignee">,
  recentInstances: Pick<TaskInstance, "assigned_to">[],
  members: string[],
  templateIndex: number,
  goldenRuleTarget?: number
): string {
  if (members.length === 0) {
    return "";
  }

  // If template has a default assignee and that person is a member, use them
  if (template.default_assignee && members.includes(template.default_assignee)) {
    return template.default_assignee;
  }

  // Golden rule path: use weighted loads
  if (goldenRuleTarget != null && members.length === 2) {
    const user1 = members[0];
    const user2 = members[1];

    const load1 = computeWeightedLoad(recentInstances as Array<{ assigned_to: string | null; difficulty?: number }>, user1);
    const load2 = computeWeightedLoad(recentInstances as Array<{ assigned_to: string | null; difficulty?: number }>, user2);
    const totalLoad = load1 + load2;

    const targetRatio1 = goldenRuleTarget / 100;
    const targetRatio2 = 1 - targetRatio1;

    if (totalLoad === 0) {
      // No history - alternate by index
      return templateIndex % 2 === 0 ? user1 : user2;
    }

    const actualRatio1 = load1 / totalLoad;
    const actualRatio2 = load2 / totalLoad;

    // Assign to the member furthest below their target ratio
    const gap1 = targetRatio1 - actualRatio1;
    const gap2 = targetRatio2 - actualRatio2;

    if (gap1 > gap2) return user1;
    if (gap2 > gap1) return user2;
    // If equal gaps, alternate by index
    return templateIndex % 2 === 0 ? user1 : user2;
  }

  // Original count-based rotation (no golden rule)
  const counts: Record<string, number> = {};
  for (const m of members) {
    counts[m] = 0;
  }
  for (const instance of recentInstances) {
    if (instance.assigned_to && counts[instance.assigned_to] !== undefined) {
      counts[instance.assigned_to]++;
    }
  }

  // Find min count
  let minCount = Infinity;
  for (const m of members) {
    if (counts[m] < minCount) {
      minCount = counts[m];
    }
  }

  // Get members with min count
  const candidates = members.filter((m) => counts[m] === minCount);

  // If multiple candidates (tied), use template index to alternate
  if (candidates.length > 1) {
    return candidates[templateIndex % candidates.length];
  }

  return candidates[0];
}

// ============================================
// Main scheduling function
// ============================================

export interface ScheduleResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Generate task instances for a household over a date range.
 * Checks for existing instances to avoid duplicates.
 * When goldenRuleTarget is provided, uses weighted difficulty for fair rotation.
 */
export async function generateTaskInstances(
  supabase: SupabaseClient<Database>,
  householdId: string,
  startDate: Date,
  endDate: Date,
  goldenRuleTarget?: number
): Promise<ScheduleResult> {
  const result: ScheduleResult = { created: 0, skipped: 0, errors: [] };

  // Fetch active templates for this household
  const { data: templates, error: templatesError } = await supabase
    .from("task_templates")
    .select("*")
    .eq("household_id", householdId)
    .eq("active", true);

  if (templatesError) {
    result.errors.push(`Failed to fetch templates: ${templatesError.message}`);
    return result;
  }

  if (!templates || templates.length === 0) {
    return result;
  }

  // Fetch household members
  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  if (membersError) {
    result.errors.push(`Failed to fetch members: ${membersError.message}`);
    return result;
  }

  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) {
    result.errors.push("No members found in household");
    return result;
  }

  // Build date range array
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Fetch existing instances in the date range to avoid duplicates
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  const { data: existingInstances, error: existingError } = await supabase
    .from("task_instances")
    .select("template_id, due_date")
    .eq("household_id", householdId)
    .gte("due_date", startStr)
    .lte("due_date", endStr);

  if (existingError) {
    result.errors.push(`Failed to fetch existing instances: ${existingError.message}`);
    return result;
  }

  // Build a set of "templateId|dueDate" for quick lookup
  const existingSet = new Set(
    (existingInstances ?? []).map((i) => `${i.template_id}|${i.due_date}`)
  );

  // For each template, fetch recent instances for assignment rotation
  const recentInstancesMap = new Map<string, Pick<TaskInstance, "assigned_to">[]>();

  for (const template of templates) {
    const { data: recent } = await supabase
      .from("task_instances")
      .select("assigned_to")
      .eq("template_id", template.id)
      .eq("household_id", householdId)
      .order("due_date", { ascending: false })
      .limit(5);

    recentInstancesMap.set(template.id, recent ?? []);
  }

  // Generate instances
  const toInsert: Database["public"]["Tables"]["task_instances"]["Insert"][] = [];

  for (const date of dates) {
    const dateStr = formatDate(date);
    const dueTemplates = getTemplatesDueOnDate(templates, date);

    for (let i = 0; i < dueTemplates.length; i++) {
      const template = dueTemplates[i] as TaskTemplate;
      const key = `${template.id}|${dateStr}`;

      if (existingSet.has(key)) {
        result.skipped++;
        continue;
      }

      const recentInstances = recentInstancesMap.get(template.id) ?? [];
      const assignee = selectAssignee(template, recentInstances, memberIds, i, goldenRuleTarget);

      toInsert.push({
        template_id: template.id,
        household_id: householdId,
        assigned_to: assignee || null,
        due_date: dateStr,
        status: "pending",
      });
    }
  }

  // Batch insert
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("task_instances")
      .insert(toInsert);

    if (insertError) {
      result.errors.push(`Failed to insert instances: ${insertError.message}`);
      return result;
    }

    result.created = toInsert.length;
  }

  return result;
}
