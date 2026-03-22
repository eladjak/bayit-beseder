import type { SeasonalTemplate, SeasonalTaskDef } from "./types";
import { CATEGORY_KEY_TO_NAME } from "@/lib/categories";

export interface ScheduledTask {
  task: SeasonalTaskDef;
  date: string; // YYYY-MM-DD
  assignee: string;
}

/**
 * Returns the day of week (0=Sunday ... 6=Saturday).
 */
function dayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Format Date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Is this date a Shabbat (Saturday)?
 */
function isShabbat(date: Date): boolean {
  return dayOfWeek(date) === 6;
}

/**
 * Is this date a Friday? (lighter load)
 */
function isFriday(date: Date): boolean {
  return dayOfWeek(date) === 5;
}

/**
 * Build available day slots between startDate and holidayDate (inclusive).
 * Excludes Shabbat; Fridays get reduced capacity.
 */
function buildDaySlots(
  startDate: Date,
  holidayDate: Date
): Array<{ date: Date; dateStr: string; maxMinutes: number }> {
  const slots: Array<{ date: Date; dateStr: string; maxMinutes: number }> = [];
  const current = new Date(startDate);

  while (current <= holidayDate) {
    if (!isShabbat(current)) {
      slots.push({
        date: new Date(current),
        dateStr: formatDate(current),
        maxMinutes: isFriday(current) ? 60 : 90,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Schedules Pesach tasks across the available days, balanced between members.
 *
 * Algorithm:
 * 1. Build day slots (startDate to holidayDate), excluding Shabbat, light Fridays
 * 2. Each task gets ideal date = holidayDate - daysBeforeHoliday
 * 3. Clamp to [earliest, latest] using flexDays
 * 4. Bin-pack into days with minute cap
 * 5. Balance assignment between members by weighted load
 */
export function schedulePesachTasks(
  template: SeasonalTemplate,
  startDate: Date,
  holidayDate: Date,
  members: string[]
): ScheduledTask[] {
  const slots = buildDaySlots(startDate, holidayDate);
  if (slots.length === 0 || members.length === 0) return [];

  // Track used minutes per day slot
  const usedMinutes: Record<string, number> = {};
  for (const slot of slots) {
    usedMinutes[slot.dateStr] = 0;
  }

  // Track total load per member for balancing
  const memberLoad: Record<string, number> = {};
  for (const m of members) {
    memberLoad[m] = 0;
  }

  const scheduled: ScheduledTask[] = [];

  // Sort tasks: phase first, then daysBeforeHoliday descending (earliest first)
  const sortedTasks = [...template.tasks].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return b.daysBeforeHoliday - a.daysBeforeHoliday;
  });

  for (const task of sortedTasks) {
    // Calculate ideal date
    const idealDate = new Date(holidayDate);
    idealDate.setDate(idealDate.getDate() - task.daysBeforeHoliday);

    // Calculate earliest and latest dates
    const earliest = new Date(idealDate);
    earliest.setDate(earliest.getDate() - task.flexDays);
    const latest = new Date(idealDate);
    latest.setDate(latest.getDate() + task.flexDays);

    // Clamp to available range
    if (earliest < startDate) earliest.setTime(startDate.getTime());
    if (latest > holidayDate) latest.setTime(holidayDate.getTime());

    // Find best slot: prefer ideal date, then closest with capacity
    let bestSlot: (typeof slots)[number] | null = null;
    let bestDistance = Infinity;

    for (const slot of slots) {
      if (slot.date < earliest || slot.date > latest) continue;
      if (usedMinutes[slot.dateStr] + task.estimated_minutes > slot.maxMinutes) continue;

      const distance = Math.abs(slot.date.getTime() - idealDate.getTime());
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = slot;
      }
    }

    // If no slot found with capacity, find any slot in range (overflow allowed)
    if (!bestSlot) {
      for (const slot of slots) {
        if (slot.date < earliest || slot.date > latest) continue;
        const distance = Math.abs(slot.date.getTime() - idealDate.getTime());
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSlot = slot;
        }
      }
    }

    // Last resort: put on ideal date regardless
    if (!bestSlot) {
      const idealStr = formatDate(idealDate);
      const existing = slots.find((s) => s.dateStr === idealStr);
      bestSlot = existing ?? slots[slots.length - 1];
    }

    // Assign to member with lowest current load
    const assignee = members.reduce((min, m) =>
      memberLoad[m] < memberLoad[min] ? m : min
    );

    usedMinutes[bestSlot.dateStr] += task.estimated_minutes;
    memberLoad[assignee] += task.estimated_minutes * task.difficulty;

    scheduled.push({
      task,
      date: bestSlot.dateStr,
      assignee,
    });
  }

  return scheduled;
}

/**
 * Builds Supabase task inserts from scheduled tasks.
 */
export function buildTaskInserts(
  scheduledTasks: ScheduledTask[],
  categoryMap: Record<string, string>,
  templateId: string
): Array<{
  title: string;
  description: string;
  category_id: string | null;
  due_date: string;
  assigned_to: string;
  status: "pending";
  points: number;
  recurring: false;
}> {
  return scheduledTasks.map(({ task, date, assignee }) => {
    const hebrewName = CATEGORY_KEY_TO_NAME[task.category] ?? task.category;
    const categoryUuid = categoryMap[hebrewName] ?? null;

    return {
      title: task.title,
      description: `[${templateId}]`,
      category_id: categoryUuid,
      due_date: date,
      assigned_to: assignee,
      status: "pending" as const,
      points: task.difficulty * 5,
      recurring: false as const,
    };
  });
}
