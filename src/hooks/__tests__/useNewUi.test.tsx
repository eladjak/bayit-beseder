import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.ui; });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = ""; vi.unstubAllEnvs(); vi.resetModules(); });
async function setup(env: string, build: string) {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", env); vi.stubEnv("NEXT_PUBLIC_NEW_UI", build); vi.resetModules();
  const hook = await import("../useNewUi");
  function Consumer() { const value = hook.useNewUi(); return <div>{String(value)}</div>; }
  return { ...hook, Consumer };
}
it.each([["false", "false"], ["true", "true"]])("production server snapshot %s is never null", async (build, expected) => {
  const { Consumer } = await setup("production", build); if (build === "true") document.documentElement.dataset.ui = "v2";
  const html = renderToString(<Consumer />); expect(html).toContain(expected); expect(html).not.toContain("null");
  const container = document.createElement("div"); document.body.append(container); container.innerHTML = html;
  const error = vi.spyOn(console, "error").mockImplementation(() => {}); await act(async () => { root = hydrateRoot(container, <Consumer />); });
  expect(container.textContent).toBe(expected); expect(error).not.toHaveBeenCalled(); error.mockRestore();
});
it("preview hydrates from null to the DOM value without mismatch and responds to changes", async () => {
  const { Consumer, setUiOverride } = await setup("preview", "false"); document.documentElement.dataset.ui = "v2";
  const html = renderToString(<Consumer />); expect(html).toContain("null");
  const container = document.createElement("div"); document.body.append(container); container.innerHTML = html;
  const error = vi.spyOn(console, "error").mockImplementation(() => {}); await act(async () => { root = hydrateRoot(container, <Consumer />); });
  expect(container.textContent).toBe("true"); expect(error).not.toHaveBeenCalled();
  await act(async () => setUiOverride("v1")); expect(container.textContent).toBe("false");
  await act(async () => setUiOverride("v2")); expect(container.textContent).toBe("true"); expect(localStorage.getItem("bayit-ui")).toBe("v2"); error.mockRestore();
});
it("production ignores override changes", async () => {
  const { setUiOverride } = await setup("production", "false"); setUiOverride("v2"); expect(document.documentElement.dataset.ui).toBeUndefined(); expect(localStorage.getItem("bayit-ui")).toBeNull();
});
