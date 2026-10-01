import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";

const SW_PATH = path.resolve(__dirname, "../../../public/sw.js");

type Handler = (e: unknown) => void;

/** Load the real public/sw.js into a fake worker scope. */
function loadSw(opts: { cachedHtml?: string; network: () => Promise<Response> }) {
  const handlers: Record<string, Handler> = {};
  const store = new Map<string, Response>();
  if (opts.cachedHtml !== undefined) store.set("https://x.test/shopping", new Response(opts.cachedHtml));
  const cache = {
    match: async (r: Request | string) => store.get(typeof r === "string" ? new URL(r, "https://x.test").href : r.url)?.clone(),
    put: async (r: Request | string, res: Response) => { store.set(typeof r === "string" ? r : r.url, res); },
    addAll: async () => {},
  };
  const self = {
    addEventListener: (n: string, h: Handler) => { handlers[n] = h; },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
    registration: { showNotification: async () => {} },
  };
  const ctx = {
    self,
    caches: { open: async () => cache, match: async (r: Request) => cache.match(r), keys: async () => [], delete: async () => true },
    fetch: opts.network,
    Response, URL, Request, setTimeout, clearTimeout, console,
  };
  const src = fs.readFileSync(SW_PATH, "utf8");
  vm.runInNewContext(src, ctx);
  return {
    version: /const CACHE_VERSION = "([^"]+)"/.exec(src)?.[1],
    async navigate(): Promise<string> {
      const req = new Request("https://x.test/shopping", { headers: { accept: "text/html" } });
      Object.defineProperty(req, "mode", { value: "navigate" });
      let out: Promise<Response> | undefined;
      handlers.fetch({ request: req, respondWith: (p: Promise<Response>) => { out = p; } });
      return (await out!).text();
    },
  };
}

describe("service worker page strategy", () => {
  it("serves the NEW deploy on open, not the cached old one", async () => {
    const sw = loadSw({ cachedHtml: "OLD-DEPLOY", network: async () => new Response("NEW-DEPLOY") });
    expect(await sw.navigate()).toBe("NEW-DEPLOY");
  });
  it("still works offline: falls back to the cached page", async () => {
    const sw = loadSw({ cachedHtml: "OLD-DEPLOY", network: async () => { throw new Error("offline"); } });
    expect(await sw.navigate()).toBe("OLD-DEPLOY");
  });
  it("sw.js changes bytes vs the version that shipped the stale pages (v6)", () => {
    const sw = loadSw({ network: async () => new Response("x") });
    expect(sw.version).not.toBe("v6");
  });
});

describe("stamp-sw script", () => {
  it("changes sw.js bytes per commit and is idempotent per sha", async () => {
    const { execFileSync } = await import("child_process");
    const os = await import("os");
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sw-")), "sw.js");
    fs.copyFileSync(SW_PATH, tmp);
    const script = path.resolve(__dirname, "../../../scripts/stamp-sw.mjs");
    const run = (sha: string) => execFileSync("node", [script, tmp], { env: { ...process.env, VERCEL_GIT_COMMIT_SHA: sha } });
    run("aaaaaaa1111");
    const a = fs.readFileSync(tmp, "utf8");
    run("bbbbbbb2222");
    const b = fs.readFileSync(tmp, "utf8");
    expect(a).toContain('"v7-aaaaaaa"');
    expect(b).toContain('"v7-bbbbbbb"');
    expect(a).not.toBe(b);
  });
});
