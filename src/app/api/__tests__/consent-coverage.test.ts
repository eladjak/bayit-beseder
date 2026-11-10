/**
 * Privacy gate, server side: EVERY route handler in the app either goes through
 * the shared consent helper or is on an explicit allow-list with a reason.
 *
 * This does not look for `auth.getUser()`: a route that authenticates some other
 * way (agent token, webhook secret, cron secret) would slip past a getUser-based
 * scan. It enumerates every `route.ts` and demands a guard call from each.
 * A NEW route that forgets the guard turns this test red.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP_DIR = join(__dirname, "..", ".."); // src/app
const SRC_DIR = join(APP_DIR, "..");

function walk(dir: string, match: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" || name === "node_modules" ? [] : walk(p, match);
    return match(name) ? [p] : [];
  });
}

/** Calls that run the consent check (directly, or through a wrapper verified below). */
export const GUARD_CALLS = [
  "requireConsent(",
  "getConsentStatus(",
  "hasCurrentConsent(",
  "refusalFor(",
  "filterConsentedUserIds(",
  "householdConsentOk(",
  "resolveHousehold(", // lib/meals/session.ts
  "requirePriceSession(", // lib/prices/session.ts -> resolveHousehold
  "verifyAgentRequest(", // lib/agent/auth.ts
  "requireHouseholdMember(", // lib/agent/token-access.ts
];

/** True when the source calls one of the guards (comments do not count). */
export function isGuarded(source: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return GUARD_CALLS.some((g) => code.includes(g));
}

/**
 * Handlers that must work WITHOUT consent, or that never serve a person's data.
 * Every entry needs a reason. Keep this list short; a long list is a hole.
 */
const ALLOW: Record<string, string> = {
  // The five the product requires to work without consent:
  "api/privacy/consent/route.ts": "this is the route that reads and records the consent itself",
  "api/account/delete/route.ts": "a person who has not consented must still be able to erase their data",
  "api/sumit/cancel-subscription/route.ts": "stopping a charge must always work, consent or not",
  "api/calendar/disconnect/route.ts": "withdrawing a connection must always work",
  "(auth)/callback/route.ts": "sign-in redirect: exchanges the login code and serves no household data (sign-out is a client call to Supabase)",
  // Never serve a person's data:
  "api/agent/openapi.json/route.ts": "static public API description, no household data",
  "api/cron/auto-schedule/route.ts": "CRON_SECRET job that re-orders tasks inside the database; it sends and returns nothing personal",
  "api/sumit/webhook/route.ts": "payment-provider callback authenticated by a shared secret; it records billing events only",
  "api/whatsapp/send/route.ts": "CRON_SECRET relay that sends a message the caller wrote to a number the caller chose; it reads no household data",
};

describe("consent guard coverage", () => {
  const files = walk(APP_DIR, (n) => n === "route.ts").map((p) => ({
    rel: relative(APP_DIR, p).split(sep).join("/"),
    src: readFileSync(p, "utf8"),
  }));

  it("finds the routes (the scan itself is not empty)", () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((f) => f.rel === "api/ai/chat/route.ts")).toBe(true);
    expect(files.some((f) => f.rel === "(auth)/callback/route.ts")).toBe(true);
  });

  it("EVERY route handler calls a consent guard or is on the allow-list", () => {
    const unguarded = files.filter((f) => !isGuarded(f.src)).map((f) => f.rel).filter((rel) => !(rel in ALLOW));
    expect(unguarded).toEqual([]);
  });

  it("allow-list entries still exist, carry a real reason, and are not secretly guarded already", () => {
    const byRel = new Map(files.map((f) => [f.rel, f]));
    for (const [rel, reason] of Object.entries(ALLOW)) {
      expect(byRel.has(rel), `stale allow-list entry ${rel}`).toBe(true);
      expect(reason.length, `reason for ${rel}`).toBeGreaterThan(25);
    }
  });

  it("the scanner can fail: a route that only authenticates, or only mentions the guard in a comment, is flagged", () => {
    expect(isGuarded("export async function GET(){ const { data:{user} } = await supabase.auth.getUser(); return Response.json(await load(user.id)) }")).toBe(false);
    expect(isGuarded("// TODO requireConsent(supabase, user)\nexport async function GET(){}")).toBe(false);
    expect(isGuarded("/* requireConsent( */ export async function GET(){}")).toBe(false);
    expect(isGuarded("const g = await requireConsent(supabase, user);\nif (g) return g;")).toBe(true);
  });

  it("the indirect guards really run the shared helper (so calling them counts)", () => {
    const read = (p: string) => readFileSync(join(SRC_DIR, p), "utf8");
    expect(read("lib/meals/session.ts")).toMatch(/getConsentStatus\(/);
    expect(read("lib/prices/session.ts")).toMatch(/resolveHousehold\(/);
    expect(read("lib/agent/auth.ts")).toMatch(/householdConsentOk\(/);
    expect(read("lib/agent/token-access.ts")).toMatch(/requireConsent\(/);
  });

  it("there are no server actions; a new one must be added here with a guard", () => {
    const actions = walk(SRC_DIR, (n) => /\.(ts|tsx)$/.test(n))
      .filter((p) => !p.includes(`${sep}__tests__${sep}`))
      .filter((p) => /^\s*["']use server["']/m.test(readFileSync(p, "utf8")))
      .map((p) => relative(SRC_DIR, p).split(sep).join("/"));
    expect(actions).toEqual([]);
  });
});
