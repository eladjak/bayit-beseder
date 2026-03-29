/**
 * Quick-add task templates for BayitBeSeder
 * 5 curated Hebrew templates for common home maintenance scenarios
 */

export interface TemplateTask {
  title: string;
  category: string; // category key (e.g. "kitchen", "bathroom")
  frequency: string; // "daily" | "weekly" | "monthly"
  minutes: number;
  recurring: boolean;
}

export interface TaskTemplate {
  id: string;
  name: string;       // Hebrew display name
  icon: string;       // emoji icon
  description: string; // Hebrew short description
  tasks: TemplateTask[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "daily-basics",
    name: "ניקיון יומי בסיסי",
    icon: "🧹",
    description: "5 משימות חיוניות לכל יום",
    tasks: [
      { title: "שטיפת כלים", category: "kitchen", frequency: "daily", minutes: 15, recurring: true },
      { title: "ניגוב משטחי עבודה במטבח", category: "kitchen", frequency: "daily", minutes: 5, recurring: true },
      { title: "כיבוד הרצפה", category: "general", frequency: "daily", minutes: 10, recurring: true },
      { title: "הוצאת אשפה", category: "general", frequency: "daily", minutes: 5, recurring: true },
      { title: "סידור המיטות", category: "bedroom", frequency: "daily", minutes: 5, recurring: true },
    ],
  },
  {
    id: "weekly-deep-clean",
    name: "ניקיון שבועי מעמיק",
    icon: "✨",
    description: "6 משימות לניקוי מעמיק שבועי",
    tasks: [
      { title: "שטיפת רצפות", category: "general", frequency: "weekly", minutes: 30, recurring: true },
      { title: "שאיבת אבק", category: "living-room", frequency: "weekly", minutes: 20, recurring: true },
      { title: "ניקוי שירותים ואמבטיה", category: "bathroom", frequency: "weekly", minutes: 30, recurring: true },
      { title: "איסוף אבק מרהיטים", category: "general", frequency: "weekly", minutes: 15, recurring: true },
      { title: "כביסה ותלייה", category: "general", frequency: "weekly", minutes: 30, recurring: true },
      { title: "ניקוי המקרר", category: "kitchen", frequency: "weekly", minutes: 15, recurring: true },
    ],
  },
  {
    id: "monthly-maintenance",
    name: "תחזוקה חודשית",
    icon: "🔧",
    description: "4 משימות תחזוקה חשובות לכל חודש",
    tasks: [
      { title: "ניקוי פילטרים במזגן", category: "general", frequency: "monthly", minutes: 20, recurring: true },
      { title: "ניקוי ניקוזים", category: "bathroom", frequency: "monthly", minutes: 15, recurring: true },
      { title: "ניקוי חלונות", category: "general", frequency: "monthly", minutes: 40, recurring: true },
      { title: "ארגון ארונות", category: "bedroom", frequency: "monthly", minutes: 45, recurring: true },
    ],
  },
  {
    id: "yard-garden",
    name: "חצר וגינה",
    icon: "🌿",
    description: "4 משימות לתחזוקת החצר והגינה",
    tasks: [
      { title: "השקיית צמחים", category: "outdoor", frequency: "daily", minutes: 10, recurring: true },
      { title: "גיזום דשא", category: "outdoor", frequency: "weekly", minutes: 30, recurring: true },
      { title: "כיבוד מרפסת/פטיו", category: "outdoor", frequency: "weekly", minutes: 10, recurring: true },
      { title: "גיזום שיחים", category: "outdoor", frequency: "monthly", minutes: 30, recurring: true },
    ],
  },
  {
    id: "kids-at-home",
    name: "ילדים בבית",
    icon: "🧸",
    description: "5 משימות לבית עם ילדים",
    tasks: [
      { title: "סידור צעצועים", category: "bedroom", frequency: "daily", minutes: 10, recurring: true },
      { title: "ארגון תיקי בית ספר", category: "general", frequency: "daily", minutes: 5, recurring: true },
      { title: "אמבטיה לילדים", category: "bathroom", frequency: "daily", minutes: 20, recurring: true },
      { title: "סידור חדרי ילדים", category: "bedroom", frequency: "weekly", minutes: 20, recurring: true },
      { title: "ניקוי שולחן שיעורים", category: "general", frequency: "daily", minutes: 5, recurring: true },
    ],
  },
];
