/**
 * WhatsApp message templates for BayitBeSeder.
 * All messages in Hebrew with warm, couple-friendly tone.
 * Uses "We" framing (not individual scores) per research findings.
 */

export interface DailyBriefData {
  names: [string, string]; // [user, partner]
  todayTasks: { title: string; assignedTo: string | null }[];
  streak: number;
  dayOfWeek: string;
}

export interface DailySummaryData {
  names: [string, string];
  completedCount: number;
  totalCount: number;
  completedTasks: string[];
  remainingTasks: string[];
  streak: number;
  topPerformer: string | null; // null = equal
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

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getHebrewDay(): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return days[new Date().getDay()];
}

export function buildMorningBrief(data: DailyBriefData): string {
  const greeting = randomPick(MORNING_GREETINGS);
  const taskList = data.todayTasks
    .map((t, i) => {
      const assignee = t.assignedTo ? ` (${t.assignedTo})` : "";
      return `${i + 1}. ${t.title}${assignee}`;
    })
    .join("\n");

  const streakLine =
    data.streak > 0
      ? `\n${data.streak} ימים ברצף! המשיכו ככה`
      : "";

  const fridayBonus =
    data.dayOfWeek === "שישי"
      ? "\n\nשבת שלום! בואו נסיים הכל לפני כניסת שבת"
      : "";

  return `${greeting}\n\nיום ${data.dayOfWeek} - ${data.todayTasks.length} משימות:\n${taskList}${streakLine}${fridayBonus}\n\n--- בית בסדר ---`;
}

export function buildEveningSummary(data: DailySummaryData): string {
  const closing = randomPick(EVENING_CLOSINGS);
  const pct = data.totalCount > 0
    ? Math.round((data.completedCount / data.totalCount) * 100)
    : 0;

  let statusLine: string;
  if (pct === 100) {
    statusLine = randomPick(CELEBRATION_LINES);
  } else if (pct >= 80) {
    statusLine = `${pct}% - כמעט מושלם! רק ${data.remainingTasks.length} נשארו`;
  } else if (pct >= 50) {
    statusLine = `${pct}% - בכיוון הנכון! מחר נשלים`;
  } else {
    statusLine = `${pct}% - מחר יום חדש!`;
  }

  const completedLine =
    data.completedTasks.length > 0
      ? `\n\nהושלמו:\n${data.completedTasks.map((t) => `  ${t}`).join("\n")}`
      : "";

  const remainingLine =
    data.remainingTasks.length > 0
      ? `\n\nנשארו למחר:\n${data.remainingTasks.map((t) => `  ${t}`).join("\n")}`
      : "";

  const streakLine =
    data.streak > 0 ? `\n\nרצף: ${data.streak} ימים` : "";

  return `סיכום יומי\n\n${statusLine}\nביחד השלמתם ${data.completedCount} מתוך ${data.totalCount}${completedLine}${remainingLine}${streakLine}\n\n${closing}\n\n--- בית בסדר ---`;
}

export function buildFridayCelebration(
  weeklyCompleted: number,
  weeklyTotal: number,
  streak: number
): string {
  const pct = weeklyTotal > 0
    ? Math.round((weeklyCompleted / weeklyTotal) * 100)
    : 0;

  return `שבת שלום!\n\nסיכום שבועי:\nביחד השלמתם ${weeklyCompleted} מתוך ${weeklyTotal} משימות (${pct}%)\nרצף: ${streak} ימים\n\n${pct >= 80 ? "שבוע מצוין! מגיע לכם לנוח" : "שבוע טוב, מחר מתחילים מחדש!"}\n\n--- בית בסדר ---`;
}
