/**
 * Adaptive coaching message variations.
 *
 * Four coaching styles × two message types (morning / evening).
 * Template variables are filled with buildAdaptiveMorningBrief /
 * buildAdaptiveEveningSummary before sending.
 */

import type { CoachingStyle } from "./coaching-tracker";

// ============================================================
// Template variable types
// ============================================================

export interface MorningTemplateVars {
  /** Number of pending tasks today */
  count: number;
  /** Title of the first pending task */
  firstTask: string;
  /** Current daily streak */
  streak: number;
  /** Number of overdue tasks from previous days */
  overdueCount: number;
}

export interface EveningTemplateVars {
  /** Number of tasks completed today */
  completedCount: number;
  /** Total tasks due today */
  totalCount: number;
  /** Completion percentage 0-100 */
  pct: number;
  /** Current daily streak */
  streak: number;
  /** Number of tasks not completed today */
  remainingCount: number;
}

// ============================================================
// Message arrays
// ============================================================

export const MORNING_STYLES: Record<CoachingStyle, string[]> = {
  encouraging: [
    "בוקר טוב! 🌅 אתם צוות מדהים. יש לכם {count} משימות היום - ביחד תעשו את זה בקלות!",
    "בוקר אור! ✨ {count} משימות מחכות לכם - כל אחת מקרבת אתכם לבית מושלם!",
    "יום חדש, הזדמנות חדשה! 💪 יש לכם {count} משימות. אתם יכולים!",
    "בוקר טוב! 🌟 {count} משימות ביחד = {count} ניצחונות קטנים. קדימה!",
  ],
  factual: [
    "בוקר טוב. {count} משימות להיום. המשימה הראשונה: {firstTask}.",
    "בוקר טוב. סטטוס: {count} משימות, {streak} ימי רצף.",
    "בוקר טוב. {count} משימות פתוחות להיום. {overdueCount} מאתמול.",
    "עדכון בוקר: {count} משימות מחכות. רצף: {streak} ימים.",
  ],
  playful: [
    "בוקר טוב! 🎮 {count} משימות = {count} הזדמנויות לנצח! מי מתחיל?",
    "יאללה בוקר! 🚀 {count} משימות מחכות. מי ישלים יותר היום?",
    "⚡ {count} אתגרים חדשים בוקר! בואו נשבור את השיא של {streak} ימים!",
    "🎯 בוקר של ניצחונות! {count} משימות, רצף {streak}. Let's go!",
  ],
  urgent: [
    "בוקר טוב! ⏰ {count} משימות דורשות תשומת לב היום. {overdueCount} באיחור - בואו נסדר את זה.",
    "בוקר טוב. {overdueCount} משימות באיחור מהימים הקודמים + {count} חדשות. כדאי להתחיל מוקדם.",
    "⚠️ {count} משימות פתוחות + {overdueCount} מאתמול. זה הזמן לפעול.",
    "בוקר טוב. רצף {streak} ימים בסכנה אם לא נשלים היום. {count} משימות לפנינו.",
  ],
};

export const EVENING_STYLES: Record<CoachingStyle, string[]> = {
  encouraging: [
    "סיכום יום נהדר! 🌙 השלמתם {completedCount} מתוך {totalCount} - {pct}%. אתם מדהימים!",
    "ערב טוב! ✨ {pct}% ביצוע היום - ממש טוב! מחר נמשיך ביחד.",
    "יום כמעט מושלם! 💪 {completedCount} משימות הושלמו. הבית אומר תודה!",
    "🌟 {pct}% ביצוע! רצף {streak} ימים. אתם צוות מנצח!",
  ],
  factual: [
    "סיכום יומי: {completedCount}/{totalCount} ({pct}%). נותרו {remainingCount} למחר.",
    "ערב טוב. ביצוע: {pct}%. רצף: {streak} ימים. {remainingCount} משימות לא הושלמו.",
    "סטטוס יומי: {completedCount} הושלמו, {remainingCount} נשארו. רצף {streak}.",
    "דוח יומי: {pct}% ביצוע. {completedCount} מתוך {totalCount}.",
  ],
  playful: [
    "🎮 תוצאות היום: {pct}% ביצוע! {completedCount} ניצחונות. {remainingCount} לניצחון מחר!",
    "⚡ {completedCount} משימות הופלו היום! {pct}% - ממשיכים לשבור שיאים!",
    "🏆 ציון יומי: {pct}/100! רצף {streak} ימים ממשיך. Respect!",
    "🚀 {completedCount} צ'קים ירוקים היום! {remainingCount} אתגרים לבוקר. GG!",
  ],
  urgent: [
    "⚠️ סיכום יומי: {pct}%. {remainingCount} משימות לא הושלמו - כדאי לסיים לפני שינה.",
    "ערב טוב. {remainingCount} משימות עדיין פתוחות. הרצף ({streak} ימים) בסיכון.",
    "⏰ {remainingCount} משימות נשארו מהיום. כדאי לסיים עכשיו לפני מחר.",
    "תזכורת ערב: {pct}% ביצוע. {remainingCount} פריטים עדיין ממתינים.",
  ],
};

// ============================================================
// Helper
// ============================================================

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

// ============================================================
// Build functions
// ============================================================

/**
 * Build a morning brief message for a given coaching style.
 * Also appends the task list and reply hint from the original template.
 */
export function buildAdaptiveMorningBrief(
  style: CoachingStyle,
  vars: MorningTemplateVars,
  taskList: string,   // already formatted numbered list
  dayOfWeek: string
): string {
  const template = randomPick(MORNING_STYLES[style]);
  const header = interpolate(template, {
    count: vars.count,
    firstTask: vars.firstTask,
    streak: vars.streak,
    overdueCount: vars.overdueCount,
  });

  const streakLine =
    vars.streak > 0 && style !== "factual" && style !== "urgent"
      ? `\n${vars.streak} ימים ברצף! המשיכו ככה`
      : "";

  const fridayBonus =
    dayOfWeek === "שישי"
      ? "\n\nשבת שלום! בואו נסיים הכל לפני כניסת שבת"
      : "";

  const replyHint = "\n\n💡 השיבו עם מספר המשימה כדי לסמן אותה כבוצעה";

  return `${header}\n\nיום ${dayOfWeek} - ${vars.count} משימות:\n${taskList}${streakLine}${fridayBonus}${replyHint}\n\n--- בית בסדר ---`;
}

/**
 * Build an evening summary message for a given coaching style.
 */
export function buildAdaptiveEveningSummary(
  style: CoachingStyle,
  vars: EveningTemplateVars,
  completedTasks: string[],
  remainingTasks: string[]
): string {
  const template = randomPick(EVENING_STYLES[style]);
  const header = interpolate(template, {
    completedCount: vars.completedCount,
    totalCount: vars.totalCount,
    pct: vars.pct,
    streak: vars.streak,
    remainingCount: vars.remainingCount,
  });

  const completedLine =
    completedTasks.length > 0
      ? `\n\nהושלמו:\n${completedTasks.map((t) => `  ✅ ${t}`).join("\n")}`
      : "";

  const remainingLine =
    remainingTasks.length > 0
      ? `\n\nנשארו למחר:\n${remainingTasks.map((t) => `  ⏳ ${t}`).join("\n")}`
      : "";

  const streakLine =
    vars.streak > 0 ? `\n\nרצף: ${vars.streak} ימים 🔥` : "";

  return `${header}${completedLine}${remainingLine}${streakLine}\n\n--- בית בסדר ---`;
}

/**
 * Returns a human-readable Hebrew label for each coaching style.
 */
export const COACHING_STYLE_LABELS: Record<CoachingStyle, string> = {
  encouraging: "מעודד",
  factual: "עובדתי",
  playful: "משחקי",
  urgent: "דחוף",
};

/**
 * Returns an emoji for each coaching style.
 */
export const COACHING_STYLE_EMOJIS: Record<CoachingStyle, string> = {
  encouraging: "💪",
  factual: "📊",
  playful: "🎮",
  urgent: "⏰",
};
