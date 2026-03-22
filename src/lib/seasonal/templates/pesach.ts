import type { SeasonalTemplate } from "../types";

export const PESACH_TEMPLATE: SeasonalTemplate = {
  id: "pesach-2026",
  name: "Pesach",
  nameHe: "פסח",
  emoji: "🫓",
  description: "הכנות לפסח — ניקיון עמוק, הכשרה וקניות",
  gradientColors: ["#7C3AED", "#DB2777"],
  availableFrom: { month: 3, day: 1 },
  getHolidayDate: (year: number) => {
    // Pesach dates (Seder night)
    const dates: Record<number, string> = {
      2026: "2026-04-02",
      2027: "2027-03-22",
      2028: "2028-04-11",
    };
    return new Date(dates[year] ?? `${year}-04-01`);
  },
  tasks: [
    // ====== Phase 1: 18-12 days before (general deep clean) ======
    { title: "ניקוי ארונות בגדים וחדר שינה", category: "bedroom", estimated_minutes: 45, difficulty: 3, phase: 1, daysBeforeHoliday: 18, flexDays: 3, zone: "חדר שינה" },
    { title: "ניקוי חלונות (פנימי + חיצוני)", category: "general", estimated_minutes: 40, difficulty: 3, phase: 1, daysBeforeHoliday: 17, flexDays: 3, zone: "כללי" },
    { title: "ניקוי מרפסת ומעקות", category: "outdoor", estimated_minutes: 30, difficulty: 3, phase: 1, daysBeforeHoliday: 16, flexDays: 3, zone: "חוץ" },
    { title: "ניקוי מזגנים ומסננים", category: "general", estimated_minutes: 25, difficulty: 2, phase: 1, daysBeforeHoliday: 16, flexDays: 3, zone: "כללי" },
    { title: "ניקוי ספות וריפודים", category: "living", estimated_minutes: 30, difficulty: 3, phase: 1, daysBeforeHoliday: 15, flexDays: 3, zone: "סלון" },
    { title: "שטיפת רצפות עמוקה (כל הבית)", category: "general", estimated_minutes: 40, difficulty: 3, phase: 1, daysBeforeHoliday: 15, flexDays: 3, zone: "כללי" },
    { title: "ניקוי ארונות סלון וויטרינות", category: "living", estimated_minutes: 30, difficulty: 2, phase: 1, daysBeforeHoliday: 14, flexDays: 3, zone: "סלון" },
    { title: "ניקוי חדר אמבטיה עמוק", category: "bathroom", estimated_minutes: 35, difficulty: 3, phase: 1, daysBeforeHoliday: 14, flexDays: 3, zone: "אמבטיה" },
    { title: "כביסת וילונות ומפות", category: "laundry", estimated_minutes: 30, difficulty: 2, phase: 1, daysBeforeHoliday: 13, flexDays: 3, zone: "כביסה" },
    { title: "ניקוי מחסן וסידור", category: "general", estimated_minutes: 45, difficulty: 3, phase: 1, daysBeforeHoliday: 12, flexDays: 3, zone: "כללי" },

    // ====== Phase 2: 11-5 days before (room-by-room + appliances) ======
    { title: "ניקוי חדר ילדים מחמץ", category: "bedroom", estimated_minutes: 30, difficulty: 2, phase: 2, daysBeforeHoliday: 11, flexDays: 2, zone: "חדר שינה" },
    { title: "ניקוי חדר שינה הורים מחמץ", category: "bedroom", estimated_minutes: 25, difficulty: 2, phase: 2, daysBeforeHoliday: 10, flexDays: 2, zone: "חדר שינה" },
    { title: "ניקוי סלון מחמץ (ספות, שטיחים, מגירות)", category: "living", estimated_minutes: 35, difficulty: 3, phase: 2, daysBeforeHoliday: 9, flexDays: 2, zone: "סלון" },
    { title: "כביסה גדולה (מצעים, כריות, שמיכות)", category: "laundry", estimated_minutes: 40, difficulty: 3, phase: 2, daysBeforeHoliday: 9, flexDays: 2, zone: "כביסה" },
    { title: "ניקוי תנור מחמץ", category: "kitchen", estimated_minutes: 40, difficulty: 3, phase: 2, daysBeforeHoliday: 8, flexDays: 2, zone: "מטבח" },
    { title: "ניקוי מיקרוגל (או הצנעה)", category: "kitchen", estimated_minutes: 15, difficulty: 1, phase: 2, daysBeforeHoliday: 8, flexDays: 2, zone: "מטבח" },
    { title: "ניקוי טוסטר/אופה לחם (או הצנעה)", category: "kitchen", estimated_minutes: 10, difficulty: 1, phase: 2, daysBeforeHoliday: 7, flexDays: 2, zone: "מטבח" },
    { title: "ניקוי רכב מחמץ", category: "general", estimated_minutes: 30, difficulty: 2, phase: 2, daysBeforeHoliday: 7, flexDays: 3, zone: "כללי" },
    { title: "ניקוי תיקי בית ספר/עבודה מחמץ", category: "general", estimated_minutes: 20, difficulty: 1, phase: 2, daysBeforeHoliday: 6, flexDays: 2, zone: "כללי" },
    { title: "הכנת ארונות למשכנת כלי פסח", category: "kitchen", estimated_minutes: 30, difficulty: 2, phase: 2, daysBeforeHoliday: 5, flexDays: 2, zone: "מטבח" },

    // ====== Phase 3: 4-2 days before (kitchen intensive) ======
    { title: "ניקוי מקרר מחמץ", category: "kitchen", estimated_minutes: 40, difficulty: 3, phase: 3, daysBeforeHoliday: 4, flexDays: 1, zone: "מטבח" },
    { title: "ניקוי ארונות מטבח מחמץ", category: "kitchen", estimated_minutes: 45, difficulty: 3, phase: 3, daysBeforeHoliday: 4, flexDays: 1, zone: "מטבח" },
    { title: "ניקוי כיריים וכיור מטבח", category: "kitchen", estimated_minutes: 30, difficulty: 3, phase: 3, daysBeforeHoliday: 3, flexDays: 1, zone: "מטבח" },
    { title: "ניקוי משטחי עבודה והכשרה", category: "kitchen", estimated_minutes: 30, difficulty: 3, phase: 3, daysBeforeHoliday: 3, flexDays: 1, zone: "מטבח" },
    { title: "הכשרת כיור (עירוי מים רותחים)", category: "kitchen", estimated_minutes: 20, difficulty: 2, phase: 3, daysBeforeHoliday: 2, flexDays: 0, zone: "מטבח" },
    { title: "סידור כלי פסח בארונות", category: "kitchen", estimated_minutes: 30, difficulty: 2, phase: 3, daysBeforeHoliday: 2, flexDays: 1, zone: "מטבח" },
    { title: "הכנת פינת חמץ אחרונה (מזווה אטום)", category: "kitchen", estimated_minutes: 15, difficulty: 1, phase: 3, daysBeforeHoliday: 2, flexDays: 0, zone: "מטבח" },

    // ====== Phase 4: day before (final prep) ======
    { title: "בדיקת חמץ (בדיקת חמץ לאור נר)", category: "general", estimated_minutes: 20, difficulty: 2, phase: 4, daysBeforeHoliday: 1, flexDays: 0, zone: "כללי" },
    { title: "ביעור חמץ (שריפת חמץ בבוקר)", category: "general", estimated_minutes: 15, difficulty: 1, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "כללי" },
    { title: "עריכת שולחן סדר", category: "kitchen", estimated_minutes: 30, difficulty: 2, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "הכנת קערת הסדר (זרוע, ביצה, מרור, חרוסת, כרפס)", category: "kitchen", estimated_minutes: 25, difficulty: 2, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "בישול מרק כדורי מצה", category: "kitchen", estimated_minutes: 60, difficulty: 3, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "הכנת בשר/עוף לסדר", category: "kitchen", estimated_minutes: 45, difficulty: 3, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "הכנת חרוסת", category: "kitchen", estimated_minutes: 20, difficulty: 1, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "הכנת סלטים ותוספות", category: "kitchen", estimated_minutes: 30, difficulty: 2, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "מטבח" },
    { title: "סידור וניקוי אחרון של הבית", category: "general", estimated_minutes: 20, difficulty: 2, phase: 4, daysBeforeHoliday: 0, flexDays: 0, zone: "כללי" },
  ],
  shopping: [
    { title: "מצות (רגילות + שמורות)", category: "מוצרי בסיס", quantity: 5, unit: "חבילות" },
    { title: "יין לסדר (4 כוסות × מספר משתתפים)", category: "משקאות", quantity: 4, unit: "בקבוקים" },
    { title: "מיץ ענבים כשר לפסח", category: "משקאות", quantity: 2, unit: "בקבוקים" },
    { title: "חרוסת (תמרים, אגוזים, יין)", category: "אגוזים" },
    { title: "חזרת (מרור)", category: "ירקות", quantity: 2 },
    { title: "כרפס (סלרי/פטרוזיליה)", category: "עשבי תיבול" },
    { title: "ביצים", category: "בשר/ביצים/דגים", quantity: 12 },
    { title: "זרוע (שוק עוף לקערת סדר)", category: "בשר/ביצים/דגים", quantity: 1 },
    { title: "תפוחי אדמה", category: "ירקות", quantity: 3, unit: 'ק"ג' },
    { title: "עוף שלם / חלקי עוף", category: "בשר/ביצים/דגים", quantity: 2, unit: 'ק"ג' },
    { title: "בשר לתבשיל", category: "בשר/ביצים/דגים", quantity: 1, unit: 'ק"ג' },
    { title: "ירקות לסלטים (עגבניות, מלפפון, גזר)", category: "ירקות" },
    { title: "שמן כשר לפסח", category: "מוצרי בסיס", quantity: 1, unit: "בקבוק" },
    { title: "מלח כשר לפסח", category: "תבלינים", quantity: 1 },
    { title: "סוכר כשר לפסח", category: "מוצרי בסיס", quantity: 1, unit: 'ק"ג' },
    { title: "שוקולד כשר לפסח", category: "חטיפים ומתוקים", quantity: 3, unit: "חפיסות" },
    { title: "קמח מצה", category: "מוצרי בסיס", quantity: 1, unit: 'ק"ג' },
    { title: "נייר כסף", category: "ניקיון וכביסה", quantity: 2, unit: "גלילים" },
    { title: "מגשי אלומיניום חד-פעמי", category: "ניקיון וכביסה", quantity: 10 },
    { title: "מרק עוף (אבקה/קוביות) כשר לפסח", category: "תבלינים", quantity: 2 },
    { title: "תפוחי עץ (לחרוסת)", category: "פירות", quantity: 4 },
    { title: "אגוזי מלך (לחרוסת)", category: "אגוזים", quantity: 200, unit: "גרם" },
    { title: "חומץ/מי לימון כשר לפסח", category: "מטבלים ורטבים", quantity: 1 },
    { title: "ריבה כשר לפסח", category: "ממרחים", quantity: 1 },
    { title: "חמאה/מרגרינה כשר לפסח", category: "מוצרי חלב", quantity: 2 },
  ],
};
