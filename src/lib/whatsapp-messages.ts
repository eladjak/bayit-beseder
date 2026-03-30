/**
 * WhatsApp message templates for BayitBeSeder.
 * All messages in Hebrew with warm, couple-friendly tone.
 * Uses "We" framing (not individual scores) per research findings.
 */

export interface DailyBriefData {
  names: string[]; // household member names
  todayTasks: { title: string; assignedTo: string | null; estimatedMinutes?: number }[];
  streak: number;
  dayOfWeek: string;
  top3Tasks?: { title: string; assignedTo: string | null; number: number }[];
  challengeProgress?: { name: string; current: number; target: number } | null;
}

export interface DailySummaryData {
  names: string[];
  completedCount: number;
  totalCount: number;
  completedTasks: string[];
  remainingTasks: string[];
  streak: number;
  topPerformer: string | null; // null = equal
  memberStats?: Array<{ name: string; completed: number }>; // per-member breakdown
  tomorrowCount?: number;
  badgeEarned?: string | null;
}

const MORNING_GREETINGS = [
  "בוקר טוב לזוג הכי מסודר!",
  "בוקר אור! הנה התוכנית להיום:",
  "שלום בוקר! יום חדש, הזדמנות חדשה:",
  "בוקר טוב! ביחד מסדרים את הבית:",
];

const EVENING_CLOSINGS = [
  "לילה טוב! מחר נמשיך ביחד",
  "יום מצוין! מנוחה טובה מגיעה לכם",
  "סוף יום, תודה שעבדתם ביחד!",
];

const CELEBRATION_LINES = [
  "יום מושלם! סיימתם הכל ביחד!",
  "100%! אתם צוות מנצח!",
  "כל המשימות הושלמו - מרשים!",
];

/**
 * Pool of motivational tips shown in the morning brief.
 * Each tip is short, actionable, and warm.
 */
const MOTIVATIONAL_TIPS = [
  "💡 טיפ: התחילו מהמשימה הקצרה ביותר — הצלחה מיידית נותנת אנרגיה!",
  "💡 טיפ: חלקו ביניכם לפי מי פנוי יותר — גמישות היא כוח.",
  "💡 טיפ: 15 דקות ביחד שוות יותר משעה לבד.",
  "💡 טיפ: אם נתקעתם — שאלו זה את זה. שתי ראשות חושבות טוב יותר.",
  "💡 טיפ: משימה שנראית גדולה? פצלו אותה לשלבים קטנים.",
  "💡 טיפ: סיימתם משימה? תגידו לעצמכם 'כל הכבוד' — זה עובד!",
  "💡 טיפ: סדר בבית = שקט בראש. כל משימה קטנה עוזרת.",
  "💡 טיפ: הרצף שלכם הוא ההישג הכי חשוב. אל תשברו אותו!",
  "💡 טיפ: השאירו את המשימות הכבדות לשעות שאתם הכי ערים.",
  "💡 טיפ: צוות שמתכנן יחד — מצליח יחד. ראו את התוכנית שמחכה לכם.",
  "💡 טיפ: כל משימה שמסמנים — זה ניצחון קטן. חגגו אותו!",
  "💡 טיפ: בית מסודר מתחיל בבוקר טוב. הנה שלכם!",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getHebrewDay(): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return days[new Date().getDay()];
}

/**
 * Estimate total time for a list of tasks.
 * Falls back to 15 min/task if no estimatedMinutes provided.
 */
function estimateTotalMinutes(
  tasks: { estimatedMinutes?: number }[]
): number {
  return tasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 15), 0);
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} שעות ו-${mins} דק׳` : `${hours} שעות`;
}

export function buildMorningBrief(data: DailyBriefData): string {
  const greeting = randomPick(MORNING_GREETINGS);
  const tip = randomPick(MOTIVATIONAL_TIPS);

  // Build numbered task list
  const taskList = data.todayTasks
    .map((t, i) => {
      const assignee = t.assignedTo ? ` (${t.assignedTo})` : "";
      return `${i + 1}. ${t.title}${assignee}`;
    })
    .join("\n");

  // Estimated total time
  const totalMin = estimateTotalMinutes(data.todayTasks);
  const timeStr = formatMinutes(totalMin);
  const countLine = `📋 ${data.todayTasks.length} משימות היום | ⏱ בערך ${timeStr}`;

  // Top 3 priority tasks
  const top3 = data.top3Tasks ?? data.todayTasks.slice(0, 3).map((t, i) => ({ ...t, number: i + 1 }));
  const top3Lines = top3.length > 0
    ? `\n\n⭐ העדיפויות של היום:\n${top3.map((t) => `  ${t.number}. ${t.title}`).join("\n")}`
    : "";

  // Active weekly challenge progress
  const challengeLine = data.challengeProgress
    ? `\n\n🎯 אתגר שבועי "${data.challengeProgress.name}": ${data.challengeProgress.current}/${data.challengeProgress.target}`
    : "";

  const streakLine =
    data.streak > 1
      ? `\n\n🔥 רצף של ${data.streak} ימים! המשיכו ככה`
      : "";

  const fridayBonus =
    data.dayOfWeek === "שישי"
      ? "\n\n✡️ שבת שלום! בואו נסיים הכל לפני כניסת שבת"
      : "";

  const replyHint = "\n\n💡 השיבו עם מספר המשימה כדי לסמן כבוצעה";

  return `${greeting}\n\nיום ${data.dayOfWeek}\n${countLine}\n\n${taskList}${top3Lines}${challengeLine}${streakLine}${fridayBonus}\n\n${tip}${replyHint}\n\n--- בית בסדר ---`;
}

export function buildEveningSummary(data: DailySummaryData): string {
  const closing = randomPick(EVENING_CLOSINGS);
  const pct = data.totalCount > 0
    ? Math.round((data.completedCount / data.totalCount) * 100)
    : 0;

  // Completion headline
  let completionLine: string;
  if (pct === 100) {
    completionLine = `${randomPick(CELEBRATION_LINES)}\n✅ השלמתם ${data.completedCount} מתוך ${data.totalCount} משימות היום! 🎉`;
  } else if (pct >= 80) {
    completionLine = `${pct}% - כמעט מושלם!\n✅ השלמתם ${data.completedCount} מתוך ${data.totalCount} משימות היום`;
  } else if (pct >= 50) {
    completionLine = `${pct}% - בכיוון הנכון!\n✅ השלמתם ${data.completedCount} מתוך ${data.totalCount} משימות היום`;
  } else {
    completionLine = `${pct}% - מחר יום חדש!\n✅ השלמתם ${data.completedCount} מתוך ${data.totalCount} משימות היום`;
  }

  // Streak update
  const streakLine =
    data.streak > 1
      ? `\n\n🔥 רצף של ${data.streak} ימים! אחלה כוח`
      : "";

  // Per-member comparison (partner breakdown)
  let memberStatsLine = "";
  if (data.memberStats && data.memberStats.length >= 2) {
    const parts = data.memberStats.map((m) => `${m.name}: ${m.completed}`).join(" | ");
    memberStatsLine = `\n\n👥 ${parts}`;
  }

  // Tomorrow preview
  const tomorrowLine =
    data.tomorrowCount !== undefined && data.tomorrowCount > 0
      ? `\n\n📅 מחר ממתינות לכם ${data.tomorrowCount} משימות`
      : "";

  // Badge earned today
  const badgeLine =
    data.badgeEarned
      ? `\n\n🏆 השגתם תג חדש היום: "${data.badgeEarned}" — כל הכבוד!`
      : "";

  const remainingLine =
    data.remainingTasks.length > 0
      ? `\n\nנשארו למחר:\n${data.remainingTasks.slice(0, 5).map((t) => `  • ${t}`).join("\n")}${data.remainingTasks.length > 5 ? `\n  ...ועוד ${data.remainingTasks.length - 5}` : ""}`
      : "";

  return `סיכום יומי 🌙\n\n${completionLine}${streakLine}${memberStatsLine}${tomorrowLine}${badgeLine}${remainingLine}\n\n${closing}\n\n--- בית בסדר ---`;
}

export function buildFridayCelebration(
  weeklyCompleted: number,
  weeklyTotal: number,
  streak: number
): string {
  const pct = weeklyTotal > 0
    ? Math.round((weeklyCompleted / weeklyTotal) * 100)
    : 0;

  return `שבת שלום! ✡️\n\nסיכום שבועי:\nביחד השלמתם ${weeklyCompleted} מתוך ${weeklyTotal} משימות (${pct}%)\n🔥 רצף: ${streak} ימים\n\n${pct >= 80 ? "שבוע מצוין! מגיע לכם לנוח 🎉" : "שבוע טוב, מחר מתחילים מחדש!"}\n\n--- בית בסדר ---`;
}
