#!/usr/bin/env node
/**
 * 🧹 fresh-start — archive the stale-task pile so the home starts clean.
 *
 * WHY (2026-07-05): the household had 43 overdue tasks and streak 0 — a shame
 * wall that makes the app unusable. A fresh start archives (NOT deletes) every
 * open task whose due date passed before the cutoff, by setting status to
 * 'skipped' (a legal status per 001_initial.sql — history is preserved, stats
 * and completions are untouched).
 *
 * SAFETY:
 *  - DRY-RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *  - Never deletes rows. Only status: pending/in_progress → skipped.
 *  - Scoped to a household when BAYIT_HOUSEHOLD_ID/--household is provided.
 *  - Requires Elad's explicit approval before running with --apply.
 *
 * Usage:
 *   node scripts/fresh-start.mjs                          # dry-run, cutoff=today
 *   node scripts/fresh-start.mjs --cutoff 2026-07-01      # dry-run, custom cutoff
 *   node scripts/fresh-start.mjs --household <uuid>       # dry-run, scoped
 *   node scripts/fresh-start.mjs --apply                  # REAL archive (asks nothing — be sure!)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local (same pattern as check-and-seed.mjs) ─────────────────────
const envPath = resolve(__dirname, "..", ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes("--apply");
const CUTOFF = getFlag("--cutoff") ?? new Date().toISOString().slice(0, 10);
const HOUSEHOLD = getFlag("--household") ?? process.env.BAYIT_HOUSEHOLD_ID ?? null;

if (!/^\d{4}-\d{2}-\d{2}$/.test(CUTOFF)) {
  console.error(`Invalid --cutoff "${CUTOFF}" (need YYYY-MM-DD)`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// ── 1. Find the stale pile ───────────────────────────────────────────────────
let query = supabase
  .from("tasks")
  .select("id, title, due_date, status, household_id")
  .lt("due_date", CUTOFF)
  .in("status", ["pending", "in_progress"])
  .order("due_date", { ascending: true });
if (HOUSEHOLD) query = query.eq("household_id", HOUSEHOLD);

const { data: stale, error } = await query;
if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

console.log(`\n🏠 בית בסדר — fresh-start ${APPLY ? "*** APPLY ***" : "(dry-run)"}`);
console.log(`   cutoff: due_date < ${CUTOFF}`);
console.log(`   scope:  ${HOUSEHOLD ? `household ${HOUSEHOLD.slice(0, 8)}…` : "ALL households"}`);
console.log(`   found:  ${stale.length} stale open tasks\n`);

if (stale.length === 0) {
  console.log("Nothing to archive — the board is already clean. ✨");
  process.exit(0);
}

// Group by month for a readable summary
const byMonth = {};
for (const t of stale) {
  const month = (t.due_date ?? "no-date").slice(0, 7);
  byMonth[month] = byMonth[month] ?? [];
  byMonth[month].push(t);
}
for (const month of Object.keys(byMonth).sort()) {
  console.log(`  ${month} — ${byMonth[month].length} tasks:`);
  for (const t of byMonth[month].slice(0, 8)) {
    console.log(`    · [${t.due_date}] ${t.title} (${t.status})`);
  }
  if (byMonth[month].length > 8) console.log(`    · …and ${byMonth[month].length - 8} more`);
}

// ── 2. Archive (only with --apply) ───────────────────────────────────────────
if (!APPLY) {
  console.log(
    `\n(dry-run) Nothing was changed. To archive these ${stale.length} tasks as 'skipped':\n` +
      `  node scripts/fresh-start.mjs --cutoff ${CUTOFF}${HOUSEHOLD ? ` --household ${HOUSEHOLD}` : ""} --apply\n` +
      `⚠️  Run --apply only with Elad's explicit approval.`
  );
  process.exit(0);
}

const ids = stale.map((t) => t.id);
// Update in chunks of 100 to stay well under any payload limits.
let archived = 0;
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const { error: updateErr, count } = await supabase
    .from("tasks")
    .update({ status: "skipped" })
    .in("id", chunk)
    .in("status", ["pending", "in_progress"]) // guard: never touch completed
    .select("id", { count: "exact", head: true });
  if (updateErr) {
    console.error(`Chunk ${i / 100 + 1} failed:`, updateErr.message);
    process.exit(1);
  }
  archived += count ?? chunk.length;
}

console.log(`\n✅ Archived ${archived} stale tasks as 'skipped'. The board is clean.`);
console.log("   (Nothing was deleted — history is preserved.)");
