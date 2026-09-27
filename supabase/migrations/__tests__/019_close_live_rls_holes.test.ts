/**
 * Parses 019_close_live_rls_holes.sql as text and asserts the structural
 * properties that make it actually close the live holes described in
 * ~/.claude/workroom/drafts/bayit-live-rls-snapshot-2026-09-27.md — in the
 * same "parse the file, don't connect to Postgres" style as
 * 018_close_effective_rls_holes.test.ts (no local Supabase/Postgres is
 * available in this worktree).
 *
 * Revision 2 (27.9.2026, after Codex's adversarial review of the first
 * revision) adds five more properties on top of the original four:
 *  5. The profiles trigger function is SECURITY INVOKER, never
 *     SECURITY DEFINER (the bug Codex found: under DEFINER, current_user
 *     inside the function is the function owner, never the calling role,
 *     so the service_role exemption could never match).
 *  6. household_members has the column-level REVOKE/GRANT that limits
 *     client UPDATE to the `role` column only.
 *  7. streaks has no FOR ALL / INSERT / UPDATE / DELETE policy — SELECT
 *     only, since zero client writes exist anywhere in src/.
 *  8. Every CREATE POLICY in the file is preceded somewhere earlier in the
 *     file by a DROP POLICY IF EXISTS of the exact same name (idempotency).
 *  9. task_completions has exactly one SELECT policy (the merged one), not
 *     two separately-OR'd ones.
 *
 * Each of the five new checks gets its own RED case against a deliberately
 * sabotaged in-memory copy of the migration text, run and confirmed to fail
 * BEFORE the real file is asserted to pass — sabotage is never written to
 * disk.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(__dirname, "..", "019_close_live_rls_holes.sql");

let sql: string;

beforeAll(() => {
  // Windows checkouts (core.autocrlf) turn LF into CRLF; the sabotage patterns below are LF-only.
  sql = readFileSync(MIGRATION_PATH, "utf-8").replace(/\r\n/g, "\n");
});

// ---------------------------------------------------------------------------
// Helpers — pure string/regex parsing, no SQL engine.
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strips `-- ...` line comments so prose mentioning SQL keywords doesn't
 * get matched as if it were an executable statement. */
function stripLineComments(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

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
  { table: "task_completions", policy: "Users can view own completions" },
  { table: "task_completions", policy: "Household can view completions" },
];

function dropPolicyDropped(text: string, table: string, policy: string): boolean {
  const re = new RegExp(`DROP POLICY IF EXISTS "${escapeRegex(policy)}" ON public\\.${table};`);
  return re.test(text);
}

/** Extracts every CREATE POLICY block's name + USING/WITH CHECK clause text. */
function extractPolicyBlocks(text: string): Array<{ name: string; clause: string }> {
  const re = /CREATE POLICY "([^"]+)"([\s\S]*?);/g;
  const out: Array<{ name: string; clause: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ name: m[1], clause: m[2] });
  }
  return out;
}

function hasBareTrueOrAuthUidNotNull(clauseText: string): boolean {
  const bareTrue = /(USING|WITH CHECK)\s*\(\s*true\s*\)/i;
  const bareAuthUid = /(USING|WITH CHECK)\s*\(\s*auth\.uid\(\)\s*IS NOT NULL\s*\)/i;
  return bareTrue.test(clauseText) || bareAuthUid.test(clauseText);
}

function extractProfilesSection(text: string): string {
  const startMarker = "-- 9. profiles";
  const start = text.indexOf(startMarker);
  if (start === -1) throw new Error("profiles section marker not found");
  return text.slice(start);
}

function extractTaskCompletionsInsertPolicy(text: string): string {
  const idx = text.indexOf('CREATE POLICY "Users can insert own household completions"');
  if (idx === -1) throw new Error("task_completions INSERT policy not found");
  return text.slice(idx, idx + 500);
}

function extractFunctionBody(text: string, functionName: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${functionName}`;
  const start = text.indexOf(marker);
  if (start === -1) throw new Error(`function ${functionName} not found`);
  const end = text.indexOf("\n$$;", start);
  if (end === -1) throw new Error(`end of function ${functionName} not found`);
  return text.slice(start, end + 4);
}

// ---------------------------------------------------------------------------
// 1. Every live broad policy is dropped
// ---------------------------------------------------------------------------

describe("019 drops every live broad policy", () => {
  it("GREEN: the real migration file drops all live broad policies", () => {
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
    const blocks = extractPolicyBlocks(sql);
    expect(blocks.length).toBeGreaterThan(0);
    for (const { name, clause } of blocks) {
      expect(hasBareTrueOrAuthUidNotNull(clause), `policy "${name}" looked unscoped:\n${clause}`).toBe(false);
    }
  });

  it("RED: a sabotaged policy using USING (auth.uid() IS NOT NULL) is caught", () => {
    const sabotaged = sql.replace(
      "USING (public.is_household_member(household_id));",
      "USING (auth.uid() IS NOT NULL);"
    );
    const blocks = extractPolicyBlocks(sabotaged);
    const anyUnscoped = blocks.some(({ clause }) => hasBareTrueOrAuthUidNotNull(clause));
    expect(anyUnscoped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. profiles section: every DROP POLICY it contains targets ONLY the exact
//    new policy name this migration adds — never an existing/kidushishi
//    policy name.
// ---------------------------------------------------------------------------

describe("019 touches profiles additively — drops only its own new policy name", () => {
  it("GREEN: the profiles section's only DROP POLICY targets 'Users can view household member profiles'", () => {
    const section = stripLineComments(extractProfilesSection(sql));
    const dropMatches = [...section.matchAll(/DROP POLICY IF EXISTS "([^"]+)" ON public\.profiles;/g)];
    expect(dropMatches.length).toBeGreaterThan(0);
    for (const m of dropMatches) {
      expect(m[1]).toBe("Users can view household member profiles");
    }
  });

  it("RED: a sabotaged copy dropping an existing kidushishi policy is caught", () => {
    const section = stripLineComments(extractProfilesSection(sql));
    const sabotagedSection = section.replace(
      'CREATE POLICY "Users can view household member profiles"',
      'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;\nCREATE POLICY "Users can view household member profiles"'
    );
    const dropMatches = [...sabotagedSection.matchAll(/DROP POLICY IF EXISTS "([^"]+)" ON public\.profiles;/g)];
    const anyForeign = dropMatches.some((m) => m[1] !== "Users can view household member profiles");
    expect(anyForeign).toBe(true);
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
    const sabotaged = policyText.replace(/AND EXISTS \([\s\S]*?\)\s*\);/, ");");
    expect(sabotaged).not.toMatch(/is_household_member\(t\.household_id\)/);
  });
});

// ---------------------------------------------------------------------------
// 5. profiles trigger function must be SECURITY INVOKER, never DEFINER
//    (fix #1 — this is the bug Codex's review found).
// ---------------------------------------------------------------------------

describe("019 fix #1 — profiles reassignment trigger is SECURITY INVOKER", () => {
  it("GREEN: the real function is SECURITY INVOKER and not SECURITY DEFINER", () => {
    const body = extractFunctionBody(sql, "prevent_self_household_reassignment()");
    expect(body).toMatch(/SECURITY INVOKER/);
    expect(body).not.toMatch(/SECURITY DEFINER/);
  });

  it("GREEN: the exemption list includes service_role, postgres and supabase_admin", () => {
    const body = extractFunctionBody(sql, "prevent_self_household_reassignment()");
    expect(body).toMatch(/current_user NOT IN \('service_role', 'postgres', 'supabase_admin'\)/);
  });

  it("GREEN: it only fires when household_id actually changes (IS DISTINCT FROM)", () => {
    const body = extractFunctionBody(sql, "prevent_self_household_reassignment()");
    expect(body).toMatch(/NEW\.household_id IS DISTINCT FROM OLD\.household_id/);
  });

  it("RED: a sabotaged copy reverted to SECURITY DEFINER is caught", () => {
    const sabotagedSql = sql.replace(
      "LANGUAGE plpgsql\nSECURITY INVOKER\nSET search_path = public\nAS $$\nBEGIN\n  IF NEW.household_id IS DISTINCT FROM OLD.household_id\n     AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN",
      "LANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path = public\nAS $$\nBEGIN\n  IF NEW.household_id IS DISTINCT FROM OLD.household_id\n     AND current_user <> 'service_role' THEN"
    );
    // sanity: the replace must actually have matched something, otherwise this test proves nothing
    expect(sabotagedSql).not.toBe(sql);
    const body = extractFunctionBody(sabotagedSql, "prevent_self_household_reassignment()");
    expect(body).toMatch(/SECURITY DEFINER/);
  });
});

// ---------------------------------------------------------------------------
// 6. household_members: owner-only UPDATE + column-scoped GRANT
//    (fix #2 — identity-swap hole).
// ---------------------------------------------------------------------------

describe("019 fix #2 — household_members UPDATE is owner-only and column-scoped", () => {
  it("GREEN: the UPDATE policy is owner-scoped via is_household_owner, not member-scoped", () => {
    const blocks = extractPolicyBlocks(sql);
    const updatePolicy = blocks.find((b) => b.name === "Household owners can update member roles");
    expect(updatePolicy, "expected a policy named 'Household owners can update member roles'").toBeTruthy();
    expect(updatePolicy!.clause).toMatch(/is_household_owner\(household_id\)/);
  });

  it("GREEN: is_household_owner is defined as its own SECURITY DEFINER helper (not a self-referencing subquery in the policy)", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.is_household_owner\(target_household_id uuid\)/);
    const body = extractFunctionBody(sql, "is_household_owner(target_household_id uuid)");
    expect(body).toMatch(/SECURITY DEFINER/);
    expect(body).toMatch(/role = 'owner'/);
  });

  it("GREEN: UPDATE is revoked from authenticated/anon and re-granted on the role column only", () => {
    expect(sql).toMatch(/REVOKE UPDATE ON public\.household_members FROM authenticated, anon;/);
    expect(sql).toMatch(/GRANT UPDATE \(role\) ON public\.household_members TO authenticated;/);
  });

  it("RED: a sabotaged copy missing the column-level REVOKE/GRANT is caught", () => {
    const sabotaged = sql.replace(
      "REVOKE UPDATE ON public.household_members FROM authenticated, anon;\nGRANT UPDATE (role) ON public.household_members TO authenticated;\n\n",
      ""
    );
    expect(sabotaged).not.toBe(sql);
    expect(sabotaged).not.toMatch(/GRANT UPDATE \(role\) ON public\.household_members TO authenticated;/);
  });

  it("RED: a sabotaged copy using is_household_member (any member, not just owner) for the UPDATE policy is caught", () => {
    const sabotaged = sql.replace(
      'CREATE POLICY "Household owners can update member roles"\n  ON public.household_members FOR UPDATE\n  TO authenticated\n  USING (public.is_household_owner(household_id))\n  WITH CHECK (public.is_household_owner(household_id));',
      'CREATE POLICY "Household owners can update member roles"\n  ON public.household_members FOR UPDATE\n  TO authenticated\n  USING (public.is_household_member(household_id))\n  WITH CHECK (public.is_household_member(household_id));'
    );
    expect(sabotaged).not.toBe(sql);
    const blocks = extractPolicyBlocks(sabotaged);
    const updatePolicy = blocks.find((b) => b.name === "Household owners can update member roles");
    expect(updatePolicy!.clause).not.toMatch(/is_household_owner/);
  });
});

// ---------------------------------------------------------------------------
// 7. streaks: SELECT only, no write policy at all.
// ---------------------------------------------------------------------------

describe("019 fix #4 — streaks has no write policy (zero verified client writes)", () => {
  it("GREEN: no FOR ALL / FOR INSERT / FOR UPDATE / FOR DELETE policy exists on streaks", () => {
    const streaksPolicyRe = /CREATE POLICY "[^"]+"\s*\n\s*ON public\.streaks FOR (\w+)/g;
    const commands = [...sql.matchAll(streaksPolicyRe)].map((m) => m[1]);
    expect(commands).toEqual(["SELECT"]);
  });

  it("RED: a sabotaged copy re-adding a FOR ALL streaks policy is caught", () => {
    const sabotaged = sql.replace(
      'DROP POLICY IF EXISTS "Household members can view streaks" ON public.streaks;\nCREATE POLICY "Household members can view streaks"\n  ON public.streaks FOR SELECT\n  TO authenticated\n  USING (public.is_household_member(household_id));',
      'DROP POLICY IF EXISTS "Household members can view streaks" ON public.streaks;\nCREATE POLICY "Household members can view streaks"\n  ON public.streaks FOR SELECT\n  TO authenticated\n  USING (public.is_household_member(household_id));\n\nCREATE POLICY "Household members can manage streaks"\n  ON public.streaks FOR ALL\n  USING (public.is_household_member(household_id));'
    );
    expect(sabotaged).not.toBe(sql);
    const streaksPolicyRe = /CREATE POLICY "[^"]+"\s*\n\s*ON public\.streaks FOR (\w+)/g;
    const commands = [...sabotaged.matchAll(streaksPolicyRe)].map((m) => m[1]);
    expect(commands).not.toEqual(["SELECT"]);
    expect(commands).toContain("ALL");
  });
});

// ---------------------------------------------------------------------------
// 8. Idempotency: every CREATE POLICY name has a preceding DROP POLICY IF
//    EXISTS of the exact same name earlier in the file.
// ---------------------------------------------------------------------------

describe("019 fix #5 — every CREATE POLICY is preceded by a matching DROP POLICY IF EXISTS", () => {
  it("GREEN: for every CREATE POLICY in the real file, a DROP POLICY IF EXISTS of the same name appears earlier", () => {
    const createRe = /CREATE POLICY "([^"]+)"/g;
    let m: RegExpExecArray | null;
    const missing: string[] = [];
    while ((m = createRe.exec(sql)) !== null) {
      const name = m[1];
      const createIndex = m.index;
      const dropRe = new RegExp(`DROP POLICY IF EXISTS "${escapeRegex(name)}" ON public\\.\\w+;`);
      const dropMatch = dropRe.exec(sql.slice(0, createIndex));
      if (!dropMatch) missing.push(name);
    }
    expect(missing, `CREATE POLICY without a preceding matching DROP: ${missing.join(", ")}`).toEqual([]);
  });

  it("RED: a sabotaged copy with the preceding DROP removed for one policy is caught", () => {
    const sabotaged = sql.replace(
      'DROP POLICY IF EXISTS "Household members can view households" ON public.households;\nCREATE POLICY "Household members can view households"',
      'CREATE POLICY "Household members can view households"'
    );
    expect(sabotaged).not.toBe(sql);

    const createRe = /CREATE POLICY "([^"]+)"/g;
    let m: RegExpExecArray | null;
    const missing: string[] = [];
    while ((m = createRe.exec(sabotaged)) !== null) {
      const name = m[1];
      const createIndex = m.index;
      const dropRe = new RegExp(`DROP POLICY IF EXISTS "${escapeRegex(name)}" ON public\\.\\w+;`);
      const dropMatch = dropRe.exec(sabotaged.slice(0, createIndex));
      if (!dropMatch) missing.push(name);
    }
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain("Household members can view households");
  });
});

// ---------------------------------------------------------------------------
// 9. task_completions has exactly one SELECT policy (merged), not two.
// ---------------------------------------------------------------------------

describe("019 fix #3 — task_completions has one merged SELECT policy", () => {
  it("GREEN: exactly one FOR SELECT policy exists on task_completions, referencing is_household_member via tasks", () => {
    const selectPolicyRe = /CREATE POLICY "([^"]+)"\s*\n\s*ON public\.task_completions FOR SELECT/g;
    const names = [...sql.matchAll(selectPolicyRe)].map((m) => m[1]);
    expect(names).toEqual(["Household members can view completions"]);

    const idx = sql.indexOf('CREATE POLICY "Household members can view completions"');
    const clause = sql.slice(idx, idx + 400);
    expect(clause).toMatch(/is_household_member\(t\.household_id\)/);
  });

  it("GREEN: the old separately-OR'd own-row and household policy names are dropped", () => {
    expect(dropPolicyDropped(sql, "task_completions", "Users can view own completions")).toBe(true);
    expect(dropPolicyDropped(sql, "task_completions", "Household can view completions")).toBe(true);
  });

  it("RED: a sabotaged copy with a second SELECT policy re-added is caught", () => {
    const sabotaged = sql.replace(
      'DROP POLICY IF EXISTS "Users can insert own household completions" ON public.task_completions;',
      'CREATE POLICY "Users can view own completions"\n  ON public.task_completions FOR SELECT\n  USING (user_id = auth.uid());\n\nDROP POLICY IF EXISTS "Users can insert own household completions" ON public.task_completions;'
    );
    expect(sabotaged).not.toBe(sql);
    const selectPolicyRe = /CREATE POLICY "([^"]+)"\s*\n\s*ON public\.task_completions FOR SELECT/g;
    const names = [...sabotaged.matchAll(selectPolicyRe)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Revision 3 (Codex round 2): every new policy is scoped TO authenticated,
// so an anon read of a shared table (profiles) never reaches
// is_household_member(), which anon has no EXECUTE on.
// ---------------------------------------------------------------------------

function policiesMissingAuthenticated(text: string): string[] {
  const missing: string[] = [];
  const re = /CREATE POLICY\s+"([^"]+)"\s+ON\s+public\.\w+\s+FOR\s+\w+\s+(TO\s+authenticated)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!m[2]) missing.push(m[1]);
  }
  return missing;
}

describe("019 revision 3: policies are TO authenticated", () => {
  it("every CREATE POLICY is scoped TO authenticated", () => {
    const count = (sql.match(/CREATE POLICY/g) || []).length;
    expect(count).toBeGreaterThan(0);
    expect(policiesMissingAuthenticated(sql)).toEqual([]);
  });

  it("RED: a policy without TO authenticated is caught", () => {
    const sabotaged = sql.replace(/\n  TO authenticated/, "");
    expect(policiesMissingAuthenticated(sabotaged).length).toBe(1);
  });
});
