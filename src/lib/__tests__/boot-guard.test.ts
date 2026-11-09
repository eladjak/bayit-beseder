import { describe, it, expect, beforeEach, vi } from "vitest";
import { BOOT_GUARD_SOURCE } from "../boot-guard";

type W = Window & { __bbsRecover?: () => void; __bbsIsChunkError?: (e: unknown) => boolean };

function install() {
  const replace = vi.fn();
  const del = vi.fn().mockResolvedValue(true);
  const unreg = vi.fn().mockResolvedValue(true);
  Object.defineProperty(window, "caches", {
    configurable: true,
    value: { keys: () => Promise.resolve(["old-1", "old-2"]), delete: del },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistrations: () => Promise.resolve([{ unregister: unreg }]) },
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname: "/dashboard", search: "", replace },
  });
  new Function(BOOT_GUARD_SOURCE)();
  return { replace, del, unreg };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("boot guard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.documentElement.removeAttribute("data-hydrated");
    document.body.innerHTML = "";
  });

  it("recovers once from a failed /_next/static script: cleans SW+caches and reloads", async () => {
    const { replace, del, unreg } = install();
    const s = document.createElement("script");
    s.src = "http://localhost/_next/static/chunks/old-123.js";
    document.head.appendChild(s);
    s.dispatchEvent(new Event("error"));
    await flush();
    expect(unreg).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(document.getElementById("bbs-fallback")).toBeNull();
  });

  it("recovers from a ChunkLoadError rejection", async () => {
    const { replace } = install();
    const ev = new Event("unhandledrejection") as Event & { reason?: unknown };
    ev.reason = Object.assign(new Error("Loading chunk 42 failed"), { name: "ChunkLoadError" });
    window.dispatchEvent(ev);
    await flush();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("DELIBERATE BREAK: if the reload did not help, show a visible fallback instead of a white screen", async () => {
    const { replace } = install();
    sessionStorage.setItem("bbs-recover-at", String(Date.now()));
    (window as W).__bbsRecover!();
    await flush();
    expect(replace).not.toHaveBeenCalled(); // no reload loop
    const fb = document.getElementById("bbs-fallback");
    expect(fb).not.toBeNull();
    expect(fb!.textContent).toContain("רענון");
    expect(fb!.getAttribute("role")).toBe("alert");
  });

  it("ignores unrelated resource errors (e.g. an image)", async () => {
    const { replace } = install();
    const img = document.createElement("img");
    img.src = "http://localhost/images/x.png";
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error"));
    await flush();
    expect(replace).not.toHaveBeenCalled();
  });

  it("classifies chunk errors", () => {
    install();
    const f = (window as W).__bbsIsChunkError!;
    expect(f(new Error("Failed to fetch dynamically imported module: x"))).toBe(true);
    expect(f(new Error("boom"))).toBe(false);
  });
});
