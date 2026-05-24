/**
 * Copy Resolver — Sprint 7.31 Elad: warm, excellent, multi-household microcopy.
 *
 * bayit-beseder is NOT just for couples. It's for couples, families, roommates,
 * AND solo. Every user-facing "we/us/partner/family" string gets a variant per
 * household-type so the whole app speaks to whoever lives there — warmly.
 *
 * Voice: warm, human, a little playful, never preachy, never corporate.
 * Single source of truth for household-aware strings (the live language is Hebrew;
 * locale-wide copy lives in src/lib/i18n/dictionaries/*.json).
 *
 * Usage:  copy("greetingSuffix")  → correct variant for current household.
 * Spec:   docs/ALOPIK-INTEGRATION-SPEC.md (multi-household-type)
 */

import { loadHousehold, type HouseholdType } from "@/lib/household-type";

export type CopyVariants = Partial<Record<HouseholdType, string>> & {
  readonly default: string;
};

/** Resolve a string variant based on current household type */
export function resolveCopy(variants: CopyVariants): string {
  const cfg = loadHousehold();
  return variants[cfg.type] ?? variants.default;
}

/**
 * Key copy banks. Each key carries a variant per household type + a default.
 * NOTE (tests): greetingSuffix.family must contain "הבית מסודר ביחד",
 * partnerNoun.roommates must equal "השותפים", quickLoveAria.solo must contain "לעצמך".
 */
export const COPY = {
  // ── Dashboard greeting tail ───────────────────────────────────────────
  greetingSuffix: {
    couple: "ההתייצבות שלנו היא הניצחון",
    family: "הבית מסודר ביחד — כל אחד תורם את שלו",
    roommates: "כי שותפים זה לחלק הוגן, בלי כאב ראש",
    solo: "אני בהובלה. בשקט, בלי דרמות",
    default: "ההתייצבות היא הניצחון",
  } satisfies CopyVariants,

  // Shorter motivational ribbon under the greeting
  greetingMotto: {
    couple: "צעד קטן ביחד שווה יותר מצעד גדול לבד",
    family: "כשכולם בפנים — הבית זורם",
    roommates: "חלוקה הוגנת = דירה שקטה",
    solo: "קצב משלך, בית שלך",
    default: "צעד קטן כל יום",
  } satisfies CopyVariants,

  // ── Empty states ──────────────────────────────────────────────────────
  emptyTasksCta: {
    couple: "בואו נוסיף משימה אחת קטנה ביחד",
    family: "תוסיפו משימה — גם הילדים יראו אותה ויוכלו לעזור",
    roommates: "תוסיפו משימה ראשונה — כולם בבית יראו אותה",
    solo: "תוסיף משימה ראשונה, ונצא לדרך",
    default: "תוסיפו משימה ראשונה",
  } satisfies CopyVariants,

  emptyTasksTitle: {
    couple: "הכול נקי כרגע 🌿",
    family: "אין משימות פתוחות — כל הכבוד למשפחה!",
    roommates: "אין מה לעשות עכשיו — הדירה רגועה",
    solo: "רגע של שקט. אין משימות פתוחות",
    default: "אין משימות פתוחות כרגע",
  } satisfies CopyVariants,

  emptyShopping: {
    couple: "רשימת הקניות ריקה — מה חסר לכם בבית?",
    family: "רשימה ריקה — תנו לכל אחד להוסיף מה שצריך",
    roommates: "אין כלום ברשימה — מי הולך לסופר?",
    solo: "הרשימה ריקה. תוסיף מה שחסר לך",
    default: "רשימת הקניות ריקה",
  } satisfies CopyVariants,

  emptyWeekly: {
    couple: "השבוע עוד פתוח לגמרי — בואו נתכנן ביחד",
    family: "שבוע חדש — בואו נחלק את הבית בין כולם",
    roommates: "שבוע חדש להתארגן בו יחד",
    solo: "שבוע חדש, דף חלק. קדימה",
    default: "שבוע חדש מתחיל",
  } satisfies CopyVariants,

  emptyStats: {
    couple: "עוד מעט תראו פה את ההתקדמות שלכם ביחד",
    family: "כאן תצמח התמונה של כל המשפחה לאורך זמן",
    roommates: "כאן תראו מי תרם מה — שקוף והוגן",
    solo: "ההתקדמות שלך תופיע כאן בקרוב",
    default: "ההתקדמות תופיע כאן",
  } satisfies CopyVariants,

  // ── References to the other people in the home ───────────────────────────
  partnerNoun: {
    couple: "השותף/ה",
    family: "המשפחה",
    roommates: "השותפים",
    solo: "אתה",
    default: "השותף/ה",
  } satisfies CopyVariants,

  // "together" framing word
  togetherWord: {
    couple: "ביחד, שניכם",
    family: "כל המשפחה ביחד",
    roommates: "כל השותפים",
    solo: "בקצב שלך",
    default: "ביחד",
  } satisfies CopyVariants,

  // ── Quick Love ────────────────────────────────────────────────────────
  quickLoveAria: {
    couple: "שלח/י לב לשותף/ה",
    family: "שלח/י לב למישהו מהמשפחה",
    roommates: "שלח/י לב לאחד השותפים",
    solo: "שלח/י לב לעצמך 💖",
    default: "שלח/י לב",
  } satisfies CopyVariants,

  quickLoveSentToast: {
    couple: "שלחת לב 💖 שמישהו ירגיש אהוב/ה היום",
    family: "הלב בדרך 💖 חיזוק קטן עושה הבדל גדול במשפחה",
    roommates: "שלחת לב 💖 גם לשותפים מגיע תודה",
    solo: "פינקת את עצמך 💖 מגיע לך",
    default: "הלב נשלח 💖",
  } satisfies CopyVariants,

  // ── Weekly Wheel ──────────────────────────────────────────────────────
  wheelDesc: {
    couple: "פעם בשבוע. הפתעה קטנה בשבילכם",
    family: "פעם בשבוע. הפתעה לכל המשפחה",
    roommates: "פעם בשבוע. השותפים מסובבים יחד",
    solo: "פעם בשבוע. רגע כיף רק לך",
    default: "פעם בשבוע. ביחד",
  } satisfies CopyVariants,

  // ── Pets / companion ──────────────────────────────────────────────────
  petsHeader: {
    couple: "החבר/ה לדרך שלכם 🐾",
    family: "החיה של המשפחה 🐾",
    roommates: "החיה של הבית 🐾",
    solo: "החבר/ה שלך 🐾",
    default: "החבר/ה לדרך 🐾",
  } satisfies CopyVariants,

  // ── Surprise Box ──────────────────────────────────────────────────────
  surpriseBoxCta: {
    couple: "פתחו את תיבת ההפתעה היומית",
    family: "מי פותח היום את תיבת ההפתעה?",
    roommates: "תיבת ההפתעה היומית מחכה",
    solo: "תיבת ההפתעה היומית שלך מחכה",
    default: "פתחו את תיבת ההפתעה",
  } satisfies CopyVariants,

  // ── Celebrations / streaks ───────────────────────────────────────────────
  celebrate: {
    couple: "איזה צוות אתם! 🎉",
    family: "כל הכבוד למשפחה! 🎉",
    roommates: "שותפים אלופים! 🎉",
    solo: "כל הכבוד לך! 🎉",
    default: "כל הכבוד! 🎉",
  } satisfies CopyVariants,

  streakKeepGoing: {
    couple: "אתם על גלגל — אל תעצרו עכשיו",
    family: "המשפחה על רצף יפה — ממשיכים!",
    roommates: "הבית על רצף — שומרים על הקצב",
    solo: "רצף יפה — תמשיך ככה",
    default: "ממשיכים על הרצף",
  } satisfies CopyVariants,

  // ── Onboarding welcome ────────────────────────────────────────────────
  welcomeLine: {
    couple: "ברוכים הבאים לבית בסדר — הבית שלכם, מסודר ונעים",
    family: "ברוכים הבאים לבית בסדר — מקום שכל המשפחה מנהלת ביחד",
    roommates: "ברוכים הבאים לבית בסדר — חלוקה הוגנת בין כל השותפים",
    solo: "ברוך הבא לבית בסדר — הבית שלך, בקצב שלך",
    default: "ברוכים הבאים לבית בסדר",
  } satisfies CopyVariants,
} as const;

/** Helper for one-shot resolution by key */
export function copy(key: keyof typeof COPY): string {
  return resolveCopy(COPY[key]);
}
