#!/usr/bin/env node
/**
 * Check Supabase tables and seed data for BayitBeSeder
 * Usage: node scripts/check-and-seed.mjs [--seed]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, "..", ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key.trim()] = value.trim();
    }
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const shouldSeed = process.argv.includes("--seed");

async function checkTable(name) {
  const { data, error } = await supabase.from(name).select("*").limit(3);
  if (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    return { exists: false, count: 0 };
  }
  // Get count
  const { count } = await supabase.from(name).select("*", { count: "exact", head: true });
  console.log(`  ✅ ${name}: ${count ?? data.length} rows`);
  return { exists: true, count: count ?? data.length, sample: data };
}

async function main() {
  console.log("🔍 Checking Supabase tables...\n");

  // Core tables (Phase 3 simple schema)
  const tables = [
    "profiles",
    "categories",
    "tasks",
    "task_completions",
    // Phase 5+ advanced tables
    "households",
    "household_members",
    "task_templates",
    "task_instances",
    "streaks",
    "achievements",
    "user_achievements",
    "weekly_syncs",
    "coaching_messages",
    "shopping_items",
  ];

  const results = {};
  for (const t of tables) {
    results[t] = await checkTable(t);
  }

  console.log("\n📊 Summary:");
  const existing = Object.entries(results).filter(([, v]) => v.exists);
  const missing = Object.entries(results).filter(([, v]) => !v.exists);
  console.log(`  Existing: ${existing.map(([k]) => k).join(", ")}`);
  if (missing.length) {
    console.log(`  Missing: ${missing.map(([k]) => k).join(", ")}`);
  }

  // Check if we have any auth users
  if (key === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: users } = await supabase.auth.admin.listUsers();
    console.log(`\n👤 Auth users: ${users?.users?.length ?? 0}`);
    if (users?.users) {
      for (const u of users.users) {
        console.log(`  - ${u.email} (${u.id.slice(0, 8)}...)`);
      }
    }
  } else {
    console.log("\n⚠️  Using anon key - cannot list auth users");
    console.log("   Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full access");
  }

  if (shouldSeed && results.categories?.exists && results.tasks?.exists) {
    await seedData(results);
  } else if (shouldSeed) {
    console.log("\n⚠️  Cannot seed - tables 'categories' and/or 'tasks' don't exist.");
    console.log("   Run the migration first: supabase/migrations/001_initial.sql");
  }
}

async function seedData(results) {
  console.log("\n🌱 Seeding data...\n");

  // Seed categories if empty
  if (results.categories.count === 0) {
    const categories = [
      { name: "מטבח", icon: "ChefHat", color: "#EF4444" },
      { name: "אמבטיה", icon: "Bath", color: "#3B82F6" },
      { name: "סלון", icon: "Sofa", color: "#8B5CF6" },
      { name: "חדר שינה", icon: "Bed", color: "#EC4899" },
      { name: "כביסה", icon: "Shirt", color: "#F59E0B" },
      { name: "חוץ", icon: "TreePine", color: "#22C55E" },
      { name: "חיות מחמד", icon: "Cat", color: "#F97316" },
      { name: "כללי", icon: "Home", color: "#6B7280" },
    ];

    const { error } = await supabase.from("categories").insert(categories);
    if (error) {
      console.log(`  ❌ Categories seed failed: ${error.message}`);
    } else {
      console.log(`  ✅ Seeded ${categories.length} categories`);
    }
  } else {
    console.log(`  ⏭️  Categories already have ${results.categories.count} rows`);
  }

  // Get categories for FK
  const { data: cats } = await supabase.from("categories").select("id, name");
  const catMap = {};
  for (const c of cats || []) {
    catMap[c.name] = c.id;
  }

  // Seed tasks if empty
  if (results.tasks.count === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const tasks = [
      // Daily kitchen
      { title: "שטיפת כלים / הפעלת מדיח", category_id: catMap["מטבח"], due_date: today, points: 10, recurring: true },
      { title: "ניקוי משטחי עבודה במטבח", category_id: catMap["מטבח"], due_date: today, points: 5, recurring: true },
      { title: "הוצאת אשפה", category_id: catMap["מטבח"], due_date: today, points: 5, recurring: true },
      { title: "סידור שיש ושולחן אוכל", category_id: catMap["מטבח"], due_date: today, points: 5, recurring: true },
      // Pets
      { title: "האכלת חתולים (בוקר)", category_id: catMap["חיות מחמד"], due_date: today, points: 5, recurring: true },
      { title: "האכלת חתולים (ערב)", category_id: catMap["חיות מחמד"], due_date: today, points: 5, recurring: true },
      { title: "מים טריים לחתולים", category_id: catMap["חיות מחמד"], due_date: today, points: 3, recurring: true },
      { title: "ניקוי ארגז חול", category_id: catMap["חיות מחמד"], due_date: today, points: 10, recurring: true },
      // Living
      { title: "סידור מהיר של הסלון", category_id: catMap["סלון"], due_date: today, points: 5, recurring: true },
      { title: "איוורור הבית (פתיחת חלונות)", category_id: catMap["כללי"], due_date: today, points: 2, recurring: true },
      // Bathroom
      { title: "ניקוי כיור אמבטיה", category_id: catMap["אמבטיה"], due_date: today, points: 8, recurring: true },
      // Tomorrow tasks
      { title: "כביסה - מכונה + תליה", category_id: catMap["כביסה"], due_date: tomorrow, points: 15, recurring: true },
      { title: "שאיבת אבק סלון וחדרים", category_id: catMap["סלון"], due_date: tomorrow, points: 15, recurring: false },
      { title: "החלפת מצעים", category_id: catMap["חדר שינה"], due_date: tomorrow, points: 15, recurring: false },
      { title: "ניקוי מקלחת", category_id: catMap["אמבטיה"], due_date: tomorrow, points: 15, recurring: false },
    ];

    const { error } = await supabase.from("tasks").insert(tasks);
    if (error) {
      console.log(`  ❌ Tasks seed failed: ${error.message}`);
    } else {
      console.log(`  ✅ Seeded ${tasks.length} tasks (${today} + ${tomorrow})`);
    }
  } else {
    console.log(`  ⏭️  Tasks already have ${results.tasks.count} rows`);
  }

  console.log("\n✨ Done! Tasks should now appear in the dashboard.");
}

main().catch(console.error);
