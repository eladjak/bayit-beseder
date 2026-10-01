import { addDaysStr, ilDay } from "@/lib/il-date";

/** "היום" / "אתמול" / "לפני N ימים"... by Israeli calendar day. `now` is injectable for tests. */
export function getRelativeDate(completedAt: string, now: Date = new Date()): string {
  const completed = new Date(completedAt);
  const todayStr = ilDay(now);
  const completedDateStr = ilDay(completed);

  if (completedDateStr === todayStr) return "היום";
  if (completedDateStr === addDaysStr(todayStr, -1)) return "אתמול";

  const diffMs = now.getTime() - completed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "לפני שבוע" : `לפני ${weeks} שבועות`;
  }

  return completed.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}
