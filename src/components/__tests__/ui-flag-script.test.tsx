import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.ui; history.replaceState({}, "", "/"); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function script(env: string, build = "false") {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", env); vi.stubEnv("NEXT_PUBLIC_NEW_UI", build); vi.resetModules();
  const { UiFlagScript } = await import("../UiFlagScript");
  return renderToStaticMarkup(<UiFlagScript />);
}
function run(html: string) { const body = html.match(/<script>([\s\S]*)<\/script>/)?.[1]; if (body) window.eval(body); }
it("renders nothing for production with the flag off, including a query override", async () => {
  history.replaceState({}, "", "/?ui=v2"); const html = await script("production"); expect(html).toBe(""); run(html); expect(document.documentElement.dataset.ui).toBeUndefined();
});
it("stores and applies a preview v2 query", async () => {
  history.replaceState({}, "", "/?ui=v2"); run(await script("preview")); expect(document.documentElement.dataset.ui).toBe("v2"); expect(localStorage.getItem("bayit-ui")).toBe("v2");
});
it("clears a preview v1 query", async () => {
  localStorage.setItem("bayit-ui", "v2"); history.replaceState({}, "", "/?ui=v1"); run(await script("preview")); expect(document.documentElement.dataset.ui).toBeUndefined(); expect(localStorage.getItem("bayit-ui")).toBeNull();
});
it("applies saved preview and production build flags", async () => {
  localStorage.setItem("bayit-ui", "v2"); run(await script("preview")); expect(document.documentElement.dataset.ui).toBe("v2");
  delete document.documentElement.dataset.ui; run(await script("production", "true")); expect(document.documentElement.dataset.ui).toBe("v2");
});
