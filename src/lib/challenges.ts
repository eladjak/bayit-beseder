/**
 * Weekly challenges system for BayitBeSeder.
 * Defines challenge templates and helper utilities.
 */

export type ChallengeType = "individual" | "household";

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  type: ChallengeType;
  /** Optional: only count completions from this category key */
  category?: string;
  /** Bonus points awarded on completion */
  reward: number;
}

/** Full pool of available weekly challenges */
export const CHALLENGE_POOL: WeeklyChallenge[] = [
  {
    id: "marathon",
    title: "מרתון ניקיון",
    description: "השלימו 15 משימות השבוע",
    icon: "🏃",
    target: 15,
    type: "individual",
    reward: 50,
  },
  {
    id: "kitchen_spark",
    title: "מטבח מבריק",
    description: "השלימו 5 משימות מטבח",
    icon: "🍳",
    target: 5,
    type: "individual",
    category: "kitchen",
    reward: 30,
  },
  {
    id: "perfect_week",
    title: "שבוע מושלם",
    description: "השלימו את כל המשימות היומיות 5 ימים השבוע",
    icon: "⭐",
    target: 5,
    type: "individual",
    reward: 60,
  },
  {
    id: "power_couple",
    title: "שותפות מנצחת",
    description: "המשק בית מסיים 20 משימות יחד השבוע",
    icon: "🤝",
    target: 20,
    type: "household",
    reward: 80,
  },
  {
    id: "early_bird",
    title: "מוקדם בבוקר",
    description: "השלימו 3 משימות לפני 10:00",
    icon: "🐦",
    target: 3,
    type: "individual",
    reward: 25,
  },
  {
    id: "zero_overdue",
    title: "אפס פיגורים",
    description: "לא להשאיר משימות פתוחות עד סוף השבוע",
    icon: "✅",
    target: 1,
    type: "individual",
    reward: 40,
  },
  {
    id: "all_categories",
    title: "כל הקטגוריות",
    description: "השלימו משימות מ-4 קטגוריות שונות",
    icon: "🌈",
    target: 4,
    type: "individual",
    reward: 35,
  },
  {
    id: "five_a_day",
    title: "חמישה ביום",
    description: "השלימו 5 משימות ביום אחד",
    icon: "💪",
    target: 5,
    type: "individual",
    reward: 30,
  },
  {
    id: "streak_five",
    title: "רצף 5",
    description: "שמרו על רצף השלמות 5 ימים ברצף",
    icon: "🔥",
    target: 5,
    type: "individual",
    reward: 45,
  },
  {
    id: "helping_hands",
    title: "עוזרים אחד לשני",
    description: "כל חבר/ת בית משלים/ה לפחות 3 משימות",
    icon: "🫱🏻‍🫲🏽",
    target: 3,
    type: "household",
    reward: 50,
  },
  {
    id: "no_procrastination",
    title: "בלי דחיינות",
    description: "השלימו 5 משימות ביום שנקבע להן",
    icon: "⏰",
    target: 5,
    type: "individual",
    reward: 35,
  },
  {
    id: "super_sprint",
    title: "סופר ספרינט",
    description: "השלימו 3 משימות תוך שעה אחת",
    icon: "⚡",
    target: 3,
    type: "individual",
    reward: 40,
  },
  {
    id: "bathroom_blitz",
    title: "אמבטיה זוהרת",
    description: "השלימו 3 משימות חדר אמבטיה",
    icon: "🚿",
    target: 3,
    type: "individual",
    category: "bathroom",
    reward: 25,
  },
  {
    id: "team_sprint",
    title: "ספרינט בצוות",
    description: "המשק בית מסיים 10 משימות ב-3 ימים",
    icon: "🚀",
    target: 10,
    type: "household",
    reward: 60,
  },
];

/**
 * Get the ISO week number for a given date.
 * Weeks start on Monday (ISO 8601).
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * Deterministically pick 3 challenges for a given week number:
 * - 1 household challenge
 * - 2 individual challenges
 * Uses the week number as a seed so every user sees the same challenges.
 */
export function pickWeeklyChallenges(weekNum: number): WeeklyChallenge[] {
  const householdPool = CHALLENGE_POOL.filter((c) => c.type === "household");
  const individualPool = CHALLENGE_POOL.filter((c) => c.type === "individual");

  const householdIdx = weekNum % householdPool.length;
  const ind1Idx = weekNum % individualPool.length;
  const ind2Idx = (weekNum + 3) % individualPool.length;

  const picks: WeeklyChallenge[] = [householdPool[householdIdx]];

  // Avoid duplicates for the two individual slots
  picks.push(individualPool[ind1Idx]);
  const safeInd2Idx = ind2Idx === ind1Idx ? (ind2Idx + 1) % individualPool.length : ind2Idx;
  picks.push(individualPool[safeInd2Idx]);

  return picks;
}
