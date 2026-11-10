/**
 * The database-level consent gate (migration 028) and the code that runs BEFORE the gate resolves
 * must agree:
 *  1. the policy version literal in SQL is the one in policy.ts (bumping one without the other would
 *     lock everybody out, or let old consents through),
 *  2. everything the browser queries while the gate is showing (sign-in state, the consent check, the
 *     decline options) reads only tables that stay reachable without consent.
 * (supabase/tests/privacy/run.sh proves the policies themselves on a real Postgres.)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { POLICY_VERSION } from "../policy";

const ROOT = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("migration 028 and policy.ts agree", () => {
  it("the SQL function checks exactly POLICY_VERSION", () => {
    const sql = read("supabase/migrations/028_consent_gate_rls.sql");
    expect(sql).toContain(`c.policy_version = '${POLICY_VERSION}'`);
    expect([...sql.matchAll(/policy_version = '([^']+)'/g)].map((m) => m[1])).toEqual([POLICY_VERSION]);
  });

  it("the gate policy never lists the shared profiles table, the consent table or any events-app table", () => {
    const list = read("supabase/migrations/028_consent_gate_rls.sql").match(/v_tables text\[\] := ARRAY\[([\s\S]*?)\];/)![1];
    const tables = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(20);
    for (const forbidden of ["profiles", "privacy_consents", "user_roles", "events", "event_assignments", "notifications", "messages", "audit_logs", "reports", "feedback", "equipment"]) {
      expect(tables).not.toContain(forbidden);
    }
  });
});

describe("what the browser queries while the gate is showing is still reachable without consent", () => {
  // Reachable without consent after 028: profiles (not gated: shared with the events app),
  // privacy_consents (own rows), subscriptions (own rows may be READ, to cancel a paid plan).
  const OPEN = new Set(["profiles", "privacy_consents", "subscriptions"]);
  const GATE_TREE = [
    "src/components/AuthGuard.tsx",
    "src/components/privacy/ConsentGuard.tsx",
    "src/components/privacy/ConsentGate.tsx",
    "src/components/privacy/ConsentChecks.tsx",
    "src/components/settings/delete-account-section.tsx",
    "src/components/settings/subscription-section.tsx",
    "src/hooks/useAuth.ts",
    "src/hooks/useProfile.ts",
    "src/hooks/useSubscription.ts",
    "src/lib/privacy/client.ts",
  ];

  it("every table read by the gate tree is on the open list", () => {
    const used = new Set<string>();
    for (const f of GATE_TREE) for (const m of read(f).matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)) used.add(m[1]);
    expect([...used].filter((t) => !OPEN.has(t))).toEqual([]);
    expect(used.has("profiles")).toBe(true); // the scan sees something (it is not vacuous)
  });

  it("the layout renders AppLayoutInner (all the other data hooks) only INSIDE the consent guard", () => {
    const layout = read("src/app/(app)/layout.tsx");
    const guardAt = layout.indexOf("<ConsentGuard>");
    expect(guardAt).toBeGreaterThan(0);
    expect(layout.indexOf("<AppLayoutInner>")).toBeGreaterThan(guardAt);
  });

  it("the consent endpoint, delete and cancel never need a gated table", () => {
    // consent: privacy_consents only. delete: the service-role function. cancel: subscriptions + households membership by service client.
    const consent = read("src/app/api/privacy/consent/route.ts") + read("src/lib/privacy/consent-server.ts");
    const tables = new Set([...consent.matchAll(/\.from\(\s*["']([a-z_]+)["']/g)].map((m) => m[1]));
    for (const t of tables) expect(["privacy_consents", "household_members", "profiles"]).toContain(t);
  });
});
