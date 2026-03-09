import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 3 requests per minute — seeding is a one-time action; very strict limit.
const limiter = rateLimit({ windowMs: 60_000, max: 3 });

/**
 * POST /api/seed
 * Seeds initial tasks for the authenticated user's first day.
 * Only inserts if the tasks table is empty (prevents duplicate seeding).
 * Called automatically from the dashboard on first authenticated visit.
 */
export async function POST(request: NextRequest) {
  // A6: Rate limiting — prevent repeated seed attempts.
  const rateLimitResult = limiter.check(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimitResult.reset / 1000)) },
      }
    );
  }

  const supabase = await createClient();

  // Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if tasks already exist
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json({ seeded: false, message: "Tasks already exist" });
  }

  // Get categories for FK references
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");

  const catMap: Record<string, string> = {};
  for (const c of categories || []) {
    catMap[c.name] = c.id;
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const tasks = [
    // Today - Kitchen
    { title: "שטיפת כלים / הפעלת מדיח", category_id: catMap["מטבח"], assigned_to: user.id, due_date: today, points: 10, recurring: true },
    { title: "ניקוי משטחי עבודה במטבח", category_id: catMap["מטבח"], assigned_to: user.id, due_date: today, points: 5, recurring: true },
    { title: "הוצאת אשפה", category_id: catMap["מטבח"], due_date: today, points: 5, recurring: true },
    { title: "סידור שיש ושולחן אוכל", category_id: catMap["מטבח"], due_date: today, points: 5, recurring: true },
    // Today - Pets
    { title: "האכלת חתולים (בוקר)", category_id: catMap["חיות מחמד"], assigned_to: user.id, due_date: today, points: 5, recurring: true },
    { title: "האכלת חתולים (ערב)", category_id: catMap["חיות מחמד"], due_date: today, points: 5, recurring: true },
    { title: "מים טריים לחתולים", category_id: catMap["חיות מחמד"], due_date: today, points: 3, recurring: true },
    { title: "ניקוי ארגז חול", category_id: catMap["חיות מחמד"], due_date: today, points: 10, recurring: true },
    // Today - Other
    { title: "סידור מהיר של הסלון", category_id: catMap["סלון"], due_date: today, points: 5, recurring: true },
    { title: "איוורור הבית (פתיחת חלונות)", category_id: catMap["כללי"], due_date: today, points: 2, recurring: true },
    { title: "ניקוי כיור אמבטיה", category_id: catMap["אמבטיה"], due_date: today, points: 8, recurring: true },
    // Tomorrow
    { title: "כביסה - מכונה + תליה", category_id: catMap["כביסה"], due_date: tomorrow, points: 15, recurring: true },
    { title: "שאיבת אבק סלון וחדרים", category_id: catMap["סלון"], due_date: tomorrow, points: 15 },
    { title: "החלפת מצעים", category_id: catMap["חדר שינה"], due_date: tomorrow, points: 15 },
    { title: "ניקוי מקלחת", category_id: catMap["אמבטיה"], due_date: tomorrow, points: 15 },
  ];

  const { error } = await supabase.from("tasks").insert(tasks);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seeded: true, count: tasks.length });
}
