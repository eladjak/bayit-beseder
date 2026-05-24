#!/usr/bin/env bun
/**
 * Bayit BeSeder E2E smoke test.
 * Usage: bun scripts/e2e-smoke.ts
 */

const BASE = "https://www.bayitbeseder.com";

const CHECKS: Array<{ name: string; path: string; expect: number | number[]; contains?: string[] }> = [
  { name: "Homepage", path: "/", expect: 200, contains: ["בית בסדר"] },
  { name: "Login", path: "/login", expect: 200 },
  { name: "Register", path: "/register", expect: 200 },
  { name: "Dashboard (protected)", path: "/dashboard", expect: [200, 302, 307] },
  { name: "Tasks", path: "/tasks", expect: [200, 302, 307] },
  { name: "Shopping", path: "/shopping", expect: [200, 302, 307] },
  { name: "Stats", path: "/stats", expect: [200, 302, 307] },
  { name: "Weekly", path: "/weekly", expect: [200, 302, 307] },
  { name: "Settings", path: "/settings", expect: [200, 302, 307] },
  { name: "History", path: "/history", expect: [200, 302, 307] },
  { name: "Playlists", path: "/playlists", expect: [200, 302, 307] },
  { name: "Emergency", path: "/emergency", expect: [200, 302, 307] },
  { name: "Blog", path: "/blog", expect: 200 },
  { name: "Contact", path: "/contact", expect: 200 },
  { name: "Sitemap", path: "/sitemap.xml", expect: 200 },
  { name: "Robots", path: "/robots.txt", expect: 200 },
  { name: "Manifest (PWA)", path: "/manifest.json", expect: 200, contains: ["bayit"] },
  { name: "OG image", path: "/og-image.jpg", expect: 200 },
];

async function check(c: typeof CHECKS[0]): Promise<{ pass: boolean; details: string }> {
  try {
    const r = await fetch(BASE + c.path, { redirect: "manual" });
    const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
    if (!expected.includes(r.status)) {
      return { pass: false, details: `expected ${expected.join("|")}, got ${r.status}` };
    }
    if (c.contains && r.status === 200) {
      const text = await r.text();
      for (const term of c.contains) {
        if (!text.toLowerCase().includes(term.toLowerCase())) {
          return { pass: false, details: `missing: ${term}` };
        }
      }
    }
    return { pass: true, details: `HTTP ${r.status}` };
  } catch (e) {
    return { pass: false, details: (e as Error).message };
  }
}

async function main() {
  console.log(`\nBayit BeSeder E2E · ${new Date().toISOString()}\n${"=".repeat(60)}`);
  let pass = 0, fail = 0;
  for (const c of CHECKS) {
    const r = await check(c);
    console.log(`${r.pass ? "✓" : "✗"} ${c.name.padEnd(22)} ${c.path.padEnd(20)} ${r.details}`);
    if (r.pass) pass++; else fail++;
  }
  console.log("=".repeat(60));
  console.log(`Total: ${pass + fail} · Pass: ${pass} · Fail: ${fail}`);
  if (fail > 0) process.exit(1);
}

main();
