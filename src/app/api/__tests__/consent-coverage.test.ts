/**
 * Privacy gate, server side: every API route that acts for a signed-in user
 * on household data must go through the consent guard. This is a source scan,
 * so a NEW route that calls auth.getUser() and forgets the guard turns this
 * test red until it is either guarded or listed (with a reason) below.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const API_DIR = join(__dirname, "..");

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : routes(p);
    return name === "route.ts" ? [p] : [];
  });
}

/** Routes that call auth.getUser() but must NOT require consent, each with the reason. */
const EXEMPT: Record<string, string> = {
  "account/delete/route.ts": "a person who has not consented must still be able to erase their data",
  "privacy/consent/route.ts": "this is the route that records the consent",
  "calendar/disconnect/route.ts": "withdrawing a connection must always work",
  "sumit/cancel-subscription/route.ts": "stopping a charge must always work",
};

describe("consent guard coverage", () => {
  const files = routes(API_DIR).map((p) => ({
    rel: relative(API_DIR, p).split(sep).join("/"),
    src: readFileSync(p, "utf8"),
  }));

  it("finds the routes (the scan itself is not empty)", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("every user-session route is guarded or explicitly exempt", () => {
    const unguarded = files
      .filter((f) => /auth\.getUser\(/.test(f.src))
      .filter((f) => !/consent-server|resolveHousehold|requirePriceSession/.test(f.src))
      .map((f) => f.rel)
      .filter((rel) => !(rel in EXEMPT));
    expect(unguarded).toEqual([]);
  });

  it("every exemption still exists (no stale entries hiding a gap)", () => {
    const present = new Set(files.map((f) => f.rel));
    expect(Object.keys(EXEMPT).filter((k) => !present.has(k))).toEqual([]);
  });
});
