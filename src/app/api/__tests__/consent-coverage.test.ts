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
  "consentedHouseholdIds(",
  "refusalFor(",
  "filterConsentedUserIds(",
  "householdConsentOk(",
  "resolveHousehold(", // lib/meals/session.ts
  "requirePriceSession(", // lib/prices/session.ts -> resolveHousehold
  "verifyAgentRequest(", // lib/agent/auth.ts
  "requireHouseholdMember(", // lib/agent/token-access.ts
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** True when the source calls one of the guards (comments do not count). */
export function isGuarded(source: string): boolean {
  const code = stripComments(source);
  return GUARD_CALLS.some((g) => code.includes(g));
}

const METHOD = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

/** Every exported HTTP handler with its own source text: a guard in POST does not cover GET. */
export function handlers(source: string): { method: string; body: string }[] {
  const code = stripComments(source);
  const marks = [...code.matchAll(METHOD)].map((m) => ({ method: (m[1] ?? m[2]) as string, at: m.index as number }));
  return marks.map((m, i) => ({ method: m.method, body: code.slice(m.at, marks[i + 1]?.at ?? code.length) }));
}

/**
 * Handlers that must work WITHOUT consent, or that never serve a person's data.
 * Every entry needs a reason. Keep this list short; a long list is a hole.
 */
const ALLOW: Record<string, string> = {
  // The five the product requires to work without consent:
  "api/privacy/consent/route.ts": "this is the route that reads and records the consent itself",
  "api/account/delete/route.ts": "a person who has not consented must still be able to erase their data",
  "api/sumit/cancel-subscription/route.ts": "stopping a charge must always work, consent or not. GET returns only a boolean (is there a paid plan to cancel); POST cancels the caller's own plan; both use the service client, never the session's household tables",
  "api/calendar/disconnect/route.ts": "withdrawing a connection must always work",
  "(auth)/callback/route.ts": "sign-in redirect: exchanges the login code and serves no household data (sign-out is a client call to Supabase)",
  // Never serve a person's data:
  "api/agent/openapi.json/route.ts": "static public API description, no household data",
  // Narrowly justified exceptions. What each one reads / writes / returns / sends:
  "api/sumit/webhook/route.ts": "payment-provider callback authenticated by a shared secret. Reads and writes billing events and the subscription status of the household named in the provider payload (needed to honour the contract); returns only ok/duplicate, no household data",
  "api/whatsapp/send/route.ts": "CRON_SECRET relay. Reads no household data; sends exactly the message and number the (trusted, secret-holding) caller provides and returns only the provider message id",
};

/**
 * Individual handlers (not whole files) that need no consent, each with the reason. A guarded POST in
 * the same file does not excuse an unguarded GET, so these are listed per method.
 */
const ALLOW_METHOD: Record<string, string> = {
  "api/push/subscribe/route.ts DELETE": "withdrawing a notification subscription must always work; it only clears the caller's own push endpoint",
  "api/invite/route.ts GET": "invite-link check for a NOT-yet-signed-in invitee, authenticated only by the secret invite code; returns the household name and the owner's first name, nothing else (open decision: gate it on the household's consent)",
  "api/mcp/route.ts GET": "returns 405 (no streaming transport); touches no data",
  "api/mcp/route.ts DELETE": "returns 405 (stateless transport); touches no data",
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

  it("EVERY exported handler (GET, POST, ...) of every guarded route has its own guard: a guarded POST does not cover an unguarded GET", () => {
    const bad = files
      .filter((f) => !(f.rel in ALLOW))
      .flatMap((f) => handlers(f.src).filter((h) => !isGuarded(h.body)).map((h) => `${f.rel} ${h.method}`))
      .filter((k) => !(k in ALLOW_METHOD));
    expect(bad).toEqual([]);
    // every per-method exception still exists and is still unguarded (no stale entries, no needless ones)
    const all = new Map(files.flatMap((f) => handlers(f.src).map((h): [string, string] => [`${f.rel} ${h.method}`, h.body])));
    for (const [k, reason] of Object.entries(ALLOW_METHOD)) {
      expect(all.has(k), `stale per-method exception ${k}`).toBe(true);
      expect(isGuarded(all.get(k)!), `${k} is guarded now; remove it from the exception list`).toBe(false);
      expect(reason.length).toBeGreaterThan(25);
    }
    // the scan really sees handlers (it is not vacuously empty)
    expect(files.flatMap((f) => handlers(f.src)).length).toBeGreaterThan(45);
  });

  it("the per-handler scanner can fail: a guarded POST next to an unguarded GET is flagged", () => {
    const src = "export async function GET(){ return Response.json(await load()) }\nexport async function POST(){ const g = await requireConsent(s,u); if (g) return g; }";
    expect(handlers(src).map((h) => [h.method, isGuarded(h.body)])).toEqual([["GET", false], ["POST", true]]);
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
