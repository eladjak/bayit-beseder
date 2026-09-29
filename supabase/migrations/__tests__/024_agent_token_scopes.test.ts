/**
 * Source-inspection test for migration 024 (no local Postgres here, same
 * approach as 020's test). It must stay ADDITIVE and must not touch the tables
 * Bayit shares with Kidushishi.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(resolve(__dirname, "..", "024_agent_token_scopes.sql"), "utf8");
// Ignore comments so prose mentioning the shared tables cannot trip the checks.
const sql = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");

describe("024_agent_token_scopes.sql", () => {
  it("adds the scopes column with the default scopes, so existing tokens stay default", () => {
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS scopes text\[\] NOT NULL DEFAULT ARRAY\['read', 'write'\]::text\[\]/
    );
    expect(sql).toMatch(
      /CHECK \(scopes <@ ARRAY\['read', 'write', 'deliver_to_me', 'delete_tasks'\]::text\[\]\)/
    );
  });

  it("adds created_by (nullable, so old tokens have no creator)", () => {
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/
    );
  });

  it("creates the two new tables locked to service_role like 020", () => {
    for (const t of ["agent_confirmations", "agent_audit_log"]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}`));
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(sql).toMatch(
        new RegExp(`REVOKE ALL ON TABLE public\\.${t} FROM PUBLIC, anon, authenticated`)
      );
      expect(sql).toMatch(new RegExp(`GRANT ALL ON TABLE public\\.${t} TO service_role`));
    }
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("is idempotent and one transaction", () => {
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
    expect(sql).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
  });

  it("never alters the tables shared with Kidushishi, nor drops anything", () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|TRIGGER)\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bCREATE\s+TRIGGER\b/i);
    // The only ALTER TABLEs are on Bayit-owned tables.
    const alters = [...sql.matchAll(/ALTER TABLE\s+(?:public\.)?([a-z_]+)/gi)].map((m) => m[1]);
    expect(new Set(alters)).toEqual(
      new Set(["household_agent_tokens", "agent_confirmations", "agent_audit_log"])
    );
    for (const shared of ["profiles", "user_roles", "notifications"]) {
      expect(sql).not.toMatch(new RegExp(`\\b(UPDATE|DELETE FROM|INSERT INTO)\\s+(public\\.)?${shared}\\b`, "i"));
    }
  });
});
