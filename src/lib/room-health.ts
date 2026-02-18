import type { RecurrenceType } from "@/lib/types/database";

/** Maximum age in hours before health reaches 0, by recurrence type */
const MAX_AGE_HOURS: Record<RecurrenceType, number> = {
  daily: 48,
  weekly: 14 * 24,
  biweekly: 28 * 24,
  monthly: 60 * 24,
  quarterly: 180 * 24,
  yearly: 730 * 24,
};

/**
 * Calculate health score (0-100) based on time since last completion.
 * Linear degradation from 100 (just completed) to 0 (max age exceeded).
 * Returns 0 if never completed.
 */
export function computeRoomHealth(
  lastCompletedAt: Date | null,
  recurrenceType: RecurrenceType,
  now?: Date
): number {
  if (!lastCompletedAt) return 0;

  const currentTime = now ?? new Date();
  const elapsedMs = currentTime.getTime() - lastCompletedAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const maxHours = MAX_AGE_HOURS[recurrenceType];

  const score = 100 - (elapsedHours / maxHours) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Get color hex based on health score */
export function getHealthColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 50) return "#EAB308";
  if (score >= 25) return "#F97316";
  return "#EF4444";
}

/** Get Hebrew label based on health score */
export function getHealthLabel(score: number): string {
  if (score >= 80) return "\u05DE\u05E6\u05D5\u05D9\u05DF";
  if (score >= 50) return "\u05D8\u05D5\u05D1";
  if (score >= 25) return "\u05D3\u05D5\u05E8\u05E9 \u05EA\u05E9\u05D5\u05DE\u05EA \u05DC\u05D1";
  return "\u05D3\u05D7\u05D5\u05E3";
}

/**
 * Aggregate health for a category by averaging health scores
 * of all templates belonging to that category.
 */
export function computeCategoryHealth(
  completions: Array<{
    category: string;
    completed_at: string | null;
    recurrence_type: RecurrenceType;
  }>,
  category: string,
  now?: Date
): number {
  const items = completions.filter((c) => c.category === category);
  if (items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const lastCompleted = item.completed_at
      ? new Date(item.completed_at)
      : null;
    return sum + computeRoomHealth(lastCompleted, item.recurrence_type, now);
  }, 0);

  return Math.round(total / items.length);
}
