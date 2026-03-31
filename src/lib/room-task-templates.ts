export type CleaningLevel = "basic" | "thorough" | "deep";

export interface RoomTaskTemplate {
  title: string;
  titleEn: string;
  difficulty: 1 | 2 | 3;
  level: CleaningLevel;
  estimatedMinutes: number;
}

export interface RoomDefinition {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: string;
  color: string;
  tasks: RoomTaskTemplate[];
}

export const ROOM_DEFINITIONS: RoomDefinition[] = [
  {
    id: "kitchen",
    nameHe: "מטבח",
    nameEn: "Kitchen",
    icon: "🍳",
    color: "#F59E0B",
    tasks: [
      // basic
      { title: "ניקוי משטח עבודה", titleEn: "Clean countertops", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "שטיפת כלים/מדיח", titleEn: "Wash dishes / run dishwasher", difficulty: 1, level: "basic", estimatedMinutes: 15 },
      { title: "ניקוי כיריים חיצוני", titleEn: "Clean stovetop exterior", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "פינוי אשפה ומיחזור", titleEn: "Empty trash and recycling", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "ניגוב מדפים גלויים", titleEn: "Wipe visible shelves", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      // thorough
      { title: "ניקוי מקרר מבפנים", titleEn: "Clean fridge interior", difficulty: 2, level: "thorough", estimatedMinutes: 20 },
      { title: 'פירוק ושטיפת מדפי מקרר', titleEn: "Remove and wash fridge shelves", difficulty: 2, level: "thorough", estimatedMinutes: 25 },
      { title: 'ניקוי מגירות סכו"ם', titleEn: "Clean cutlery drawers", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "ניקוי מתגים ומשקופים", titleEn: "Clean switches and door frames", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "ניקוי פח אשפה ומכסה", titleEn: "Clean trash bin and lid", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      // deep
      { title: "ניקוי ארונות תחתונים", titleEn: "Clean lower cabinets", difficulty: 3, level: "deep", estimatedMinutes: 30 },
      { title: "ניקוי ארונות עליונים", titleEn: "Clean upper cabinets", difficulty: 3, level: "deep", estimatedMinutes: 30 },
      { title: "ניקוי תנור לעומק", titleEn: "Deep clean oven", difficulty: 3, level: "deep", estimatedMinutes: 40 },
      { title: "ניקוי מאחורי ומתחת למקרר", titleEn: "Clean behind and under fridge", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "ניקוי פילטר קולט אדים", titleEn: "Clean range hood filter", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "ניקוי מאחורי תנור וכיריים", titleEn: "Clean behind oven and stove", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "מיון ארון מזווה מלא", titleEn: "Sort full pantry cabinet", difficulty: 3, level: "deep", estimatedMinutes: 20 },
    ],
  },
  {
    id: "bathroom",
    nameHe: "שירותים/מקלחת",
    nameEn: "Bathroom",
    icon: "🚿",
    color: "#3B82F6",
    tasks: [
      // basic
      { title: "ניקוי כיור ומראה", titleEn: "Clean sink and mirror", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "ניקוי אסלה", titleEn: "Clean toilet", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "שטיפת רצפה", titleEn: "Mop floor", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "סידור מגבות", titleEn: "Arrange towels", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      // thorough
      { title: "ניקוי מקלחת/אמבטיה", titleEn: "Clean shower / bathtub", difficulty: 2, level: "thorough", estimatedMinutes: 20 },
      { title: "ניקוי אריחים ומפרקים", titleEn: "Clean tiles and grout", difficulty: 2, level: "thorough", estimatedMinutes: 25 },
      { title: "ניקוי ארון תרופות", titleEn: "Clean medicine cabinet", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "החלפת מגבות", titleEn: "Replace towels", difficulty: 2, level: "thorough", estimatedMinutes: 5 },
      // deep
      { title: "ניקוי תריס/חלון אמבטיה", titleEn: "Clean bathroom blind / window", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "הסרת אבנית עמוקה", titleEn: "Remove heavy limescale", difficulty: 3, level: "deep", estimatedMinutes: 30 },
      { title: "ניקוי ניקוז ומניעת סתימות", titleEn: "Clean drain and prevent clogs", difficulty: 3, level: "deep", estimatedMinutes: 15 },
      { title: "ניקוי מאחורי האסלה", titleEn: "Clean behind the toilet", difficulty: 3, level: "deep", estimatedMinutes: 15 },
      { title: "ניקוי מאוורר תקרה", titleEn: "Clean ceiling fan / exhaust", difficulty: 3, level: "deep", estimatedMinutes: 15 },
    ],
  },
  {
    id: "living-room",
    nameHe: "סלון",
    nameEn: "Living Room",
    icon: "🛋️",
    color: "#8B5CF6",
    tasks: [
      // basic
      { title: "ניקוי שולחן סלון", titleEn: "Clean living room table", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "שאיבה כללית", titleEn: "General vacuuming", difficulty: 1, level: "basic", estimatedMinutes: 15 },
      { title: "סידור כריות ושמיכות", titleEn: "Arrange pillows and blankets", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "ניגוב מתגים ושלטים", titleEn: "Wipe switches and remotes", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      // thorough
      { title: "ניקוי ספרייה ומדפים", titleEn: "Clean bookcase and shelves", difficulty: 2, level: "thorough", estimatedMinutes: 20 },
      { title: "ניקוי ספות וכריות", titleEn: "Clean sofas and cushions", difficulty: 2, level: "thorough", estimatedMinutes: 20 },
      { title: "ניקוי מאחורי רהיטים", titleEn: "Clean behind furniture", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "ניקוי גופי תאורה", titleEn: "Clean light fixtures", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      // deep
      { title: "ניקוי חלונות ותריסים", titleEn: "Clean windows and blinds", difficulty: 3, level: "deep", estimatedMinutes: 30 },
      { title: "ניקוי מסילות חלון לעומק", titleEn: "Deep clean window tracks", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "ניקוי וילונות/מסילות", titleEn: "Clean curtains / curtain rails", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "ניקוי מאחורי טלוויזיה", titleEn: "Clean behind TV", difficulty: 3, level: "deep", estimatedMinutes: 10 },
      { title: "ניקוי פנלים ומשקופים", titleEn: "Clean panels and door frames", difficulty: 3, level: "deep", estimatedMinutes: 15 },
    ],
  },
  {
    id: "bedroom",
    nameHe: "חדר שינה",
    nameEn: "Bedroom",
    icon: "🛏️",
    color: "#EC4899",
    tasks: [
      // basic
      { title: "הצעת מיטה", titleEn: "Make the bed", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "סידור ארון בגדים", titleEn: "Tidy wardrobe", difficulty: 1, level: "basic", estimatedMinutes: 15 },
      { title: "ניגוב אבק משטחים", titleEn: "Dust surfaces", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      // thorough
      { title: "שאיבת מזרן", titleEn: "Vacuum mattress", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "ניקוי שידות ומגירות", titleEn: "Clean nightstands and drawers", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "החלפת מצעים", titleEn: "Change bed linen", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "ניקוי מראה", titleEn: "Clean mirror", difficulty: 2, level: "thorough", estimatedMinutes: 5 },
      // deep
      { title: "ניקוי מאחורי ארון ומיטה", titleEn: "Clean behind wardrobe and bed", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "מיון ארגזי אחסון עונתיים", titleEn: "Sort seasonal storage boxes", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "ניקוי מסילות וילון", titleEn: "Clean curtain rails", difficulty: 3, level: "deep", estimatedMinutes: 15 },
      { title: "ניקוי פנלים ומשקופים", titleEn: "Clean panels and door frames", difficulty: 3, level: "deep", estimatedMinutes: 10 },
    ],
  },
  {
    id: "kids-room",
    nameHe: "חדר ילדים",
    nameEn: "Kids Room",
    icon: "🧸",
    color: "#F97316",
    tasks: [
      // basic
      { title: "סידור צעצועים", titleEn: "Tidy toys", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "הצעת מיטות", titleEn: "Make beds", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "ניגוב משטחים", titleEn: "Wipe surfaces", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      // thorough
      { title: "ניקוי ארון בגדים", titleEn: "Clean wardrobe", difficulty: 2, level: "thorough", estimatedMinutes: 20 },
      { title: "שטיפת צעצועים", titleEn: "Wash toys", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "ניקוי מדפי ספרים", titleEn: "Clean book shelves", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      // deep
      { title: "ניקוי מתחת למיטות", titleEn: "Clean under beds", difficulty: 3, level: "deep", estimatedMinutes: 15 },
      { title: "מיון בגדים לפי גודל", titleEn: "Sort clothes by size", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "ניקוי קירות מכתמים", titleEn: "Clean wall stains", difficulty: 3, level: "deep", estimatedMinutes: 20 },
    ],
  },
  {
    id: "laundry",
    nameHe: "כביסה",
    nameEn: "Laundry",
    icon: "👕",
    color: "#06B6D4",
    tasks: [
      // basic
      { title: "העברת כביסה למייבש", titleEn: "Transfer laundry to dryer", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      { title: "קיפול וסידור כביסה", titleEn: "Fold and put away laundry", difficulty: 1, level: "basic", estimatedMinutes: 20 },
      // thorough
      { title: "ניקוי מכונת כביסה", titleEn: "Clean washing machine", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "ניקוי מייבש ומסנן", titleEn: "Clean dryer and lint filter", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "סידור ארון כביסה", titleEn: "Tidy laundry cabinet", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      // deep
      { title: "ניקוי מאחורי מכונות", titleEn: "Clean behind machines", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "ניקוי ניקוז מכונה", titleEn: "Clean machine drain", difficulty: 3, level: "deep", estimatedMinutes: 15 },
    ],
  },
  {
    id: "outdoor",
    nameHe: "מרפסת/חצר",
    nameEn: "Outdoor",
    icon: "🌳",
    color: "#84CC16",
    tasks: [
      // basic
      { title: "כיבוד רצפת מרפסת", titleEn: "Sweep balcony floor", difficulty: 1, level: "basic", estimatedMinutes: 10 },
      { title: "השקיית צמחים", titleEn: "Water plants", difficulty: 1, level: "basic", estimatedMinutes: 5 },
      // thorough
      { title: "ניקוי מעקה ושולחן", titleEn: "Clean railing and table", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      { title: "סידור כלי גינון", titleEn: "Tidy gardening tools", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "ניקוי מזגן חיצוני", titleEn: "Clean outdoor AC unit", difficulty: 2, level: "thorough", estimatedMinutes: 15 },
      // deep
      { title: "שטיפת מרפסת במים", titleEn: "Hose down balcony", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "ניקוי תריסים חיצוניים", titleEn: "Clean exterior blinds", difficulty: 3, level: "deep", estimatedMinutes: 25 },
      { title: "ניקוי ניקוז מרפסת", titleEn: "Clean balcony drain", difficulty: 3, level: "deep", estimatedMinutes: 15 },
    ],
  },
  {
    id: "general",
    nameHe: "כללי",
    nameEn: "General",
    icon: "✨",
    color: "#10B981",
    tasks: [
      // basic
      { title: "איוורור הבית", titleEn: "Air out the home", difficulty: 1, level: "basic", estimatedMinutes: 2 },
      { title: "ריסוס מפיג ריח", titleEn: "Spray air freshener", difficulty: 1, level: "basic", estimatedMinutes: 2 },
      // thorough
      { title: "ניקוי מתגי חשמל", titleEn: "Clean light switches", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "ניקוי ידיות דלתות", titleEn: "Clean door handles", difficulty: 2, level: "thorough", estimatedMinutes: 10 },
      { title: "ניקוי פנסי לילה", titleEn: "Clean night lights", difficulty: 2, level: "thorough", estimatedMinutes: 5 },
      // deep
      { title: "ניקוי מסנני מזגן", titleEn: "Clean AC filters", difficulty: 3, level: "deep", estimatedMinutes: 20 },
      { title: "ניקוי מאווררי תקרה", titleEn: "Clean ceiling fans", difficulty: 3, level: "deep", estimatedMinutes: 15 },
      { title: "בדיקת נורות וגלאי עשן", titleEn: "Check bulbs and smoke detectors", difficulty: 3, level: "deep", estimatedMinutes: 10 },
    ],
  },
] as const satisfies RoomDefinition[];

const LEVEL_ORDER: Record<CleaningLevel, number> = {
  basic: 0,
  thorough: 1,
  deep: 2,
} as const;

export function getTasksForRoom(roomId: string, level: CleaningLevel): RoomTaskTemplate[] {
  const room = ROOM_DEFINITIONS.find((r) => r.id === roomId);
  if (!room) return [];
  const maxOrder = LEVEL_ORDER[level];
  return room.tasks.filter((t) => LEVEL_ORDER[t.level] <= maxOrder);
}

export function getTaskCountForRoom(roomId: string, level: CleaningLevel): number {
  return getTasksForRoom(roomId, level).length;
}

export function getDifficultyLabel(difficulty: 1 | 2 | 3): { he: string; en: string } {
  const labels = {
    1: { he: "קל", en: "Easy" },
    2: { he: "בינוני", en: "Medium" },
    3: { he: "קשה", en: "Hard" },
  } as const;
  return labels[difficulty];
}

export function getDifficultyColor(difficulty: 1 | 2 | 3): string {
  const colors = {
    1: "#22C55E",
    2: "#F59E0B",
    3: "#EF4444",
  } as const;
  return colors[difficulty];
}

export function getDifficultyPoints(difficulty: 1 | 2 | 3): number {
  const points = {
    1: 5,
    2: 10,
    3: 20,
  } as const;
  return points[difficulty];
}
