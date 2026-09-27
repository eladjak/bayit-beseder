/**
 * Parses 019_close_live_rls_holes.sql as text and asserts the structural
 * properties that make it actually close the live holes described in
 * ~/.claude/workroom/drafts/bayit-live-rls-snapshot-2026-09-27.md — in the
 * same "parse the file, don't connect to Postgres" style as
 * 018_close_effective_rls_holes.test.ts (no local Supabase/Postgres is
 * available in this worktree).
 *
 * Four properties, each with its own describe block:
 *  1. Every live broad policy name (from the snapshot) is dropped.
 *  2. No CREATE POLICY in the file has a USING/WITH CHECK of bare `true` or
 *     `auth.uid() IS NOT NULL` alone (the exact shape of the live hole).
 *  3. The profiles section contains no DROP POLICY at all (additive-only,
 *     shared-table rule).
 *  4. The task_completions INSERT policy's WITH CHECK references
 *     is_household_member.
 *
 * To prove these assertions can actually fail (not just pass on any input),
 * each describe block also has a RED case that runs the same check against
 * a deliberately sabotaged copy of the migration text and expects it to
 * fail. The sabotage is applied to an in-memory string, never to the file
 * on disk.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(__dirname, "..", "019_close_live_rls_holes.sql");

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// Helpers — pure string/regex parsing, no SQL engine.
// ---------------------------------------------------------------------------

/** All live broad policy names this migration is supposed to remove. */
const LIVE_BROAD_POLICIES: Array<{ table: string; policy: string }> = [
  { table: "household_members", policy: "Auth read household_members" },
  { table: "household_members", policy: "Auth update household_members" },
  { table: "household_members", policy: "Auth write household_members" },
  { table: "households", policy: "Auth read households" },
  { table: "households", policy: "Auth update households" },
  { table: "households", policy: "Auth write households" },
  { table: "streaks", policy: "Auth read streaks" },
  { table: "streaks", policy: "Auth update streaks" },
  { table: "streaks", policy: "Auth write streaks" },
  { table: "task_instances", policy: "Auth read task_instances" },
  { table: "task_instances", policy: "Auth update task_instances" },
  { table: "task_instances", policy: "Auth write task_instances" },
  { table: "task_templates", policy: "Auth read task_templates" },
  { table: "task_templates", policy: "Auth update task_templates" },
  { table: "task_templates", policy: "Auth write task_templates" },
  { table: "user_achievements", policy: "Auth read user_achievements" },
  { table: "user_achievements", policy: "Auth update user_achievements" },
  { table: "user_achievements", policy: "Auth write user_achievements" },
  { table: "weekly_syncs", policy: "Auth read weekly_syncs" },
  { table: "weekly_syncs", policy: "Auth update weekly_syncs" },
  { table: "weekly_syncs", policy: "Auth write weekly_syncs" },
  { table: "task_completions", policy: "Users read completions" },
  { table: "task_completions", policy: "Users can insert completions" },
  { table: "task_completions", policy: "Users insert completions" },
];

function dropPolicyDropped(text: string, table: string, policy: string): boolean {
  const re = new RegExp(
    `DROP POLICY IF EXISTS "${policy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" ON public\\.${table};`
  );
  return re.test(text);
}

/** Extracts every CREATE POLICY block's USING/WITH CHECK clause text. */
function extractPolicyClauses(text: string): string[] {
  const blocks = text.split(/CREATE POLICY/).slice(1);
  return blocks.map((b) => b.split(";")[0]);
}

function hasBareTrueOrAuthUidNotNull(clauseText: string): boolean {
  // Matches the exact shape of the live hole: USING (true) / WITH CHECK
  // (true), or USING/WITH CHECK (auth.uid() IS NOT NULL) with nothing else
  // ANDed in (i.e. no household/user_id qualifier).
  const bareTrue = /(USING|WITH CHECK)\s*\(\s*true\s*\)/i;
  const bareAuthUid = /(USING|WITH CHECK)\s*\(\s*auth\.uid\(\)\s*IS NOT NULL\s*\)/i;
  return bareTrue.test(clauseText) || bareAuthUid.test(clauseText);
}

/** Strips `-- ...` line comments so prose mentioning SQL keywords (e.g. an
 * explanatory comment that says "no DROP POLICY here") doesn't get matched
 * as if it were an executable statement. */
function stripLineComments(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function extractProfilesSection(text: string): string {
  const startMarker = "-- 9. profiles";
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error("profiles section marker not found");
  return stripLineComments(text.slice(start));
}

function extractTaskCompletionsInsertPolicy(text: string): string {
  const idx = text.indexOf('CREATE POLICY "Users can insert own household completions"');
  if (idx === -1) throw new Error("task_completions INSERT policy not found");
  return text.slice(idx, idx + 500);
}

// ---------------------------------------------------------------------------
// 1. Every live broad policy is dropped
// ---------------------------------------------------------------------------

describe("019 drops every live broad policy", () => {
  it("GREEN: the real migration file drops all 24 live broad policies", () => {
    for (const { table, policy } of LIVE_BROAD_POLICIES) {
      expect(dropPolicyDropped(sql, table, policy), `expected DROP for "${policy}" on ${table}`).toBe(true);
    }
  });

  it("RED: a sabotaged copy missing one DROP is caught", () => {
    const sabotaged = sql.replace(
      'DROP POLICY IF EXISTS "Auth write household_members" ON public.household_members;',
      "-- sabotaged: drop removed"
    );
    expect(dropPolicyDropped(sabotaged, "household_members", "Auth write household_members")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. No created policy re-introduces the bare `true` / auth.uid() IS NOT
//    NULL hole shape.
// ---------------------------------------------------------------------------

describe("019 never re-creates a policy with the live hole's bare condition", () => {
  it("GREEN: no CREATE POLICY clause in the real file is bare true or bare auth.uid() IS NOT NULL", () => {
    const clauses = extractPolicyClauses(sql);
    expect(clauses.length).toBeGreaterThan(0);
    for (const clause of clauses) {
      expect(hasBareTrueOrAuthUidNotNull(clause), `clause looked unscoped:\n${clause}`).toBe(false);
    }
  });

  it("RED: a sabotaged policy using USING (auth.uid() IS NOT NULL) is caught", () => {
    const sabotaged = sql.replace(
      "USING (public.is_household_member(household_id));",
      "USING (auth.uid() IS NOT NULL);"
    );
    const clauses = extractPolicyClauses(sabotaged);
    const anyUnscoped = clauses.some((c) => hasBareTrueOrAuthUidNotNull(c));
    expect(anyUnscoped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. profiles section has no DROP POLICY (additive-only, shared table)
// ---------------------------------------------------------------------------

describe("019 touches profiles additively only", () => {
  it("GREEN: the profiles section of the real file contains no DROP POLICY", () => {
    const section = extractProfilesSection(sql);
    expect(section).not.toMatch(/DROP POLICY/);
  });

  it("RED: a sabotaged copy with a DROP POLICY injected into the profiles section is caught", () => {
    const section = extractProfilesSection(sql);
    const sabotagedSection = section.replace(
      'CREATE POLICY "Users can view household member profiles"',
      'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;\nCREATE POLICY "Users can view household member profiles"'
    );
    expect(sabotagedSection).toMatch(/DROP POLICY/);
  });
});

// ---------------------------------------------------------------------------
// 4. task_completions INSERT references is_household_member
// ---------------------------------------------------------------------------

describe("019 scopes task_completions INSERT to the task's household", () => {
  it("GREEN: the real INSERT policy's WITH CHECK calls is_household_member", () => {
    const policyText = extractTaskCompletionsInsertPolicy(sql);
    expect(policyText).toMatch(/is_household_member\(t\.household_id\)/);
  });

  it("RED: a sabotaged copy that only checks user_id is caught", () => {
    const policyText = extractTaskCompletionsInsertPolicy(sql);
    const sabotaged = policyText.replace(
      /AND EXISTS \([\s\S]*?\)\s*\);/,
      ");"
    );
    expect(sabotaged).not.toMatch(/is_household_member\(t\.household_id\)/);
  });
});
