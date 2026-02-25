import type { TaskRow } from "./types/database";

export interface DayLoad {
  date: string; // ISO date string (YYYY-MM-DD)
  dayName: string; // Hebrew day name
  tasks: TaskRow[];
  totalMinutes: number;
  difficulty: "light" | "moderate" | "heavy";
  isHeavy: boolean;
}

export interface Suggestion {
  type: "room_batch" | "heavy_day" | "empty_day" | "energy_tip";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  affectedDates?: string[]; // ISO dates
}

const HEBREW_DAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

const CATEGORY_ZONES: Record<string, string[]> = {
  kitchen: ["מטבח"],
  bathroom: ["אמבטיה"],
  living: ["סלון"],
  bedroom: ["חדר שינה"],
  laundry: ["כביסה"],
  outdoor: ["חיצוני", "חוץ"],
  pets: ["בעלי חיים", "חיות מחמד"],
  general: ["כללי"],
};

/**
 * Group tasks by zone/room for batching suggestions
 */
export function groupTasksByZone(tasks: TaskRow[]): Map<string, TaskRow[]> {
  const grouped = new Map<string, TaskRow[]>();

  for (const task of tasks) {
    // Try to infer zone from title or use category as fallback
    let zone = "כללי";

    // Check if task title contains zone keywords
    for (const [category, zones] of Object.entries(CATEGORY_ZONES)) {
      for (const zoneName of zones) {
        if (task.title.includes(zoneName)) {
          zone = zoneName;
          break;
        }
      }
      if (zone !== "כללי") break;
    }

    if (!grouped.has(zone)) {
      grouped.set(zone, []);
    }
    grouped.get(zone)!.push(task);
  }

  return grouped;
}

/**
 * Analyze daily load balance for the week
 */
export function analyzeDailyLoad(
  tasks: TaskRow[],
  startOfWeek: Date
): DayLoad[] {
  const dailyLoads: DayLoad[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayName = HEBREW_DAYS[i];

    const dayTasks = tasks.filter((t) => t.due_date === dateStr);

    // Estimate minutes: use rough heuristics based on title keywords
    const totalMinutes = dayTasks.reduce((sum, task) => {
      return sum + estimateTaskMinutes(task);
    }, 0);

    let difficulty: "light" | "moderate" | "heavy" = "light";
    if (totalMinutes > 60) difficulty = "heavy";
    else if (totalMinutes > 30) difficulty = "moderate";

    dailyLoads.push({
      date: dateStr,
      dayName,
      tasks: dayTasks,
      totalMinutes,
      difficulty,
      isHeavy: totalMinutes > 60,
    });
  }

  return dailyLoads;
}

/**
 * Estimate task duration in minutes based on title keywords
 */
function estimateTaskMinutes(task: TaskRow): number {
  const title = task.title.toLowerCase();

  // Heavy tasks (20-30+ min)
  if (
    title.includes("עמוק") ||
    title.includes("גיהוץ") ||
    title.includes("כביסה") ||
    title.includes("קיפול") ||
    title.includes("שטיפת רצפות")
  ) {
    return 30;
  }

  // Medium tasks (10-20 min)
  if (
    title.includes("ניקוי") ||
    title.includes("שאיבת אבק") ||
    title.includes("מקלחת") ||
    title.includes("כיריים") ||
    title.includes("החלפת מצעים")
  ) {
    return 15;
  }

  // Light tasks (2-5 min)
  return 5;
}

/**
 * Generate smart scheduling suggestions in Hebrew
 */
export function generateSmartSuggestions(weekTasks: TaskRow[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Get start of week (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const dailyLoads = analyzeDailyLoad(weekTasks, startOfWeek);

  // 1. Room batching suggestions
  for (const dayLoad of dailyLoads) {
    const zoneGroups = groupTasksByZone(dayLoad.tasks);

    for (const [zone, zoneTasks] of zoneGroups.entries()) {
      if (zoneTasks.length >= 3) {
        suggestions.push({
          type: "room_batch",
          priority: "medium",
          title: `${zoneTasks.length} משימות ${zone} ב${dayLoad.dayName}`,
          description: `כדאי לעשות את כל המשימות של ${zone} ברצף לחסוך זמן!`,
          affectedDates: [dayLoad.date],
        });
      }
    }
  }

  // 2. Heavy day warnings
  const heavyDays = dailyLoads.filter((d) => d.isHeavy);
  for (const heavy of heavyDays) {
    const nextDay = dailyLoads.find(
      (d) => new Date(d.date).getTime() === new Date(heavy.date).getTime() + 86400000
    );

    if (nextDay && nextDay.totalMinutes < 30) {
      suggestions.push({
        type: "heavy_day",
        priority: "high",
        title: `${heavy.dayName} כבד (${heavy.totalMinutes} דקות)`,
        description: `אולי להעביר משימה ל${nextDay.dayName}? יש שם רק ${nextDay.totalMinutes} דקות`,
        affectedDates: [heavy.date, nextDay.date],
      });
    } else {
      suggestions.push({
        type: "heavy_day",
        priority: "medium",
        title: `${heavy.dayName} עמוס`,
        description: `${heavy.totalMinutes} דקות עבודה - כדאי להתחיל מוקדם`,
        affectedDates: [heavy.date],
      });
    }
  }

  // 3. Empty day suggestions
  const emptyDays = dailyLoads.filter((d) => d.tasks.length === 0);
  if (emptyDays.length > 0 && heavyDays.length > 0) {
    const emptyDay = emptyDays[0];
    const heavyDay = heavyDays[0];
    suggestions.push({
      type: "empty_day",
      priority: "low",
      title: `${emptyDay.dayName} ריק`,
      description: `אפשר להעביר משימה מ${heavyDay.dayName} ל${emptyDay.dayName} לאיזון`,
      affectedDates: [emptyDay.date, heavyDay.date],
    });
  }

  // 4. Energy tip - put heavy tasks early in the week
  const weekStart = dailyLoads.slice(0, 3); // Sun-Tue
  const weekEnd = dailyLoads.slice(4, 7); // Thu-Sat

  const startHeavy = weekStart.some((d) => d.totalMinutes > 40);
  const endHeavy = weekEnd.some((d) => d.totalMinutes > 40);

  if (endHeavy && !startHeavy) {
    suggestions.push({
      type: "energy_tip",
      priority: "low",
      title: "טיפ אנרגיה",
      description: "כדאי להעביר משימות כבדות לתחילת השבוע כשיש יותר כוח",
      affectedDates: weekEnd.filter((d) => d.totalMinutes > 40).map((d) => d.date),
    });
  }

  return suggestions;
}

/**
 * Get week range for display
 */
export function getWeekRange(startOfWeek: Date): string {
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startDay = startOfWeek.getDate();
  const endDay = endOfWeek.getDate();
  const month = startOfWeek.toLocaleDateString("he-IL", { month: "long" });

  return `${startDay}-${endDay} ${month}`;
}
