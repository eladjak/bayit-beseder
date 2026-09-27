/**
 * RED-FIRST for fix #2 (adversarial review, PR #13): RLS alone does not stop
 * TRUNCATE (it is not governed by row-level policies), and Supabase grants
 * PostgREST's `anon`/`authenticated` roles default table privileges on every
 * new `public` table unless a migration explicitly revokes them. Migration
 * 020 enables RLS on `household_agent_tokens` with zero client policies,
 * which stops SELECT/INSERT/UPDATE/DELETE for those roles — but not
 * TRUNCATE, and not a future migration that accidentally grants back
 * privileges without anyone noticing RLS wouldn't have covered it anyway.
 *
 * This is a source-inspection test (no local Postgres in this worktree —
 * same constraint noted throughout supabase/migrations/__tests__/ and
 * src/app/api/agent/task/__tests__/). It reads the migration file directly
 * and asserts the REVOKE/GRANT statements are present, in the right order
 * relative to RLS being enabled, and inside the same transaction.
 *
 * Against the version of this migration filed in PR #13 before this fix, the
 * REVOKE line does not exist at all and every assertion below fails.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  resolve(__dirname, "..", "020_household_agent_tokens.sql"),
  "utf8"
);

describe("020_household_agent_tokens.sql — privileges beyond RLS", () => {
  it("revokes ALL table privileges from PUBLIC, anon, and authenticated on household_agent_tokens", () => {
    expect(sql).toMatch(
      /REVOKE ALL ON TABLE public\.household_agent_tokens FROM PUBLIC,\s*anon,\s*authenticated;/
    );
  });

  it("explicitly (re)grants full access to service_role", () => {
    expect(sql).toMatch(/GRANT ALL ON TABLE public\.household_agent_tokens TO service_role;/);
  });

  it("revokes AFTER enabling RLS, and both are inside BEGIN...COMMIT", () => {
    const enableRlsIdx = sql.indexOf("ENABLE ROW LEVEL SECURITY");
    const revokeIdx = sql.indexOf("REVOKE ALL ON TABLE public.household_agent_tokens");
    const beginIdx = sql.indexOf("BEGIN;");
    const commitIdx = sql.lastIndexOf("COMMIT;");

    expect(enableRlsIdx).toBeGreaterThan(-1);
    expect(revokeIdx).toBeGreaterThan(-1);
    expect(beginIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(-1);

    expect(revokeIdx).toBeGreaterThan(enableRlsIdx);
    expect(revokeIdx).toBeGreaterThan(beginIdx);
    expect(revokeIdx).toBeLessThan(commitIdx);
  });

  it("the REVOKE statement is idempotent-safe re-run syntax (REVOKE ... FROM never errors if not previously granted)", () => {
    // Sanity: REVOKE (unlike DROP) does not require IF EXISTS to be safe to
    // re-run in Postgres — this asserts we did not accidentally write a
    // brittle one-shot statement that would break a second apply.
    const revokeLine = sql
      .split("\n")
      .find((line) => line.includes("REVOKE ALL ON TABLE public.household_agent_tokens"));
    expect(revokeLine).toBeDefined();
    expect(revokeLine).not.toMatch(/IF EXISTS/);
  });
});
