import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";

const SRC = fs.readFileSync(path.resolve(__dirname, "../../../public/sw.js"), "utf8");

async function activate(existingCaches: string[]) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const navigated: string[] = [];
  const client = { type: "window", url: "https://x.test/dashboard", postMessage() {}, navigate: async (u: string) => { navigated.push(u); } };
  const ctx = {
    self: {
      addEventListener: (n: string, h: (e: unknown) => void) => { handlers[n] = h; },
      skipWaiting() {},
      clients: { claim: async () => {}, matchAll: async () => [client] },
    },
    caches: { keys: async () => existingCaches, delete: async () => true, open: async () => ({}), match: async () => undefined },
    fetch: async () => new Response("x"), Response, URL, console,
  };
  vm.runInNewContext(SRC, ctx);
  let p: Promise<unknown> = Promise.resolve();
  handlers.activate({ waitUntil: (x: Promise<unknown>) => { p = x; } });
  await p;
  return navigated;
}

describe("service worker activate self-heal", () => {
  it("OLD-SW SCENARIO: upgrading from legacy v6 reloads the already-white window once", async () => {
    expect(await activate(["bayit-beseder-v6"])).toEqual(["https://x.test/dashboard"]);
  });
  it("a normal stamped deploy does NOT reload a tab the user is working in", async () => {
    expect(await activate(["bayit-beseder-v7-abc1234"])).toEqual([]);
  });
  it("first-ever install does not reload anything", async () => {
    expect(await activate([])).toEqual([]);
  });
});
