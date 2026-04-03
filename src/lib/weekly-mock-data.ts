import type { TaskRow } from "@/lib/types/database";
import { CATEGORY_LABELS } from "@/lib/categories";

export function getCategoryFromId(categoryId: string | null): string {
  if (!categoryId) return "general";
  if (categoryId in CATEGORY_LABELS) return categoryId;
  return "general";
}

export function generateMockWeeklyTasks(): TaskRow[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  const mockTasks: TaskRow[] = [];
  const taskTemplates = [
    { title: "שטיפת כלים / הפעלת מדיח", category: "kitchen", minutes: 15 },
    { title: "ניקוי משטחי עבודה במטבח", category: "kitchen", minutes: 5 },
    { title: "טאטוא רצפת מטבח", category: "kitchen", minutes: 5 },
    { title: "הוצאת אשפה", category: "kitchen", minutes: 5 },
    { title: "ניקוי כיריים", category: "kitchen", minutes: 20 },
    { title: "ניקוי שירותים", category: "bathroom", minutes: 15 },
    { title: "ניקוי מקלחת", category: "bathroom", minutes: 15 },
    { title: "החלפת מגבות", category: "bathroom", minutes: 5 },
    { title: "שאיבת אבק בסלון", category: "living", minutes: 15 },
    { title: "ניגוב רצפות רטוב", category: "living", minutes: 20 },
    { title: "ניקוי אבק מרהיטים", category: "living", minutes: 10 },
    { title: "החלפת מצעים", category: "bedroom", minutes: 15 },
    { title: "ניקוי אבק בחדר שינה", category: "bedroom", minutes: 10 },
    { title: "שאיבת אבק בחדר שינה", category: "bedroom", minutes: 10 },
    { title: "כביסה (2-3 מכונות)", category: "laundry", minutes: 30 },
    { title: "קיפול וסידור כביסה", category: "laundry", minutes: 20 },
    { title: "האכלת חתולים (בוקר)", category: "pets", minutes: 5 },
    { title: "האכלת חתולים (ערב)", category: "pets", minutes: 5 },
    { title: "מים טריים לחתולים", category: "pets", minutes: 2 },
    { title: "ניקוי ארגז חול", category: "pets", minutes: 5 },
    { title: "השקיית צמחים", category: "general", minutes: 10 },
    { title: "איוורור הבית", category: "general", minutes: 2 },
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const numTasks = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...taskTemplates].sort(() => Math.random() - 0.5);

    for (let j = 0; j < numTasks; j++) {
      const template = shuffled[j % shuffled.length];
      mockTasks.push({
        id: `mock-${i}-${j}`,
        title: template.title,
        description: null,
        category_id: template.category,
        assigned_to: Math.random() > 0.5 ? "user1" : "user2",
        status: Math.random() > 0.7 ? "completed" : "pending",
        due_date: dateStr,
        points: 10,
        recurring: true,
        created_at: new Date().toISOString(),
      });
    }
  }

  return mockTasks;
}
