/**
 * Unit tests for Web Share detection and clipboard fallback logic.
 * Tests isSupported detection and share behavior without hook rendering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ────────────────────────────────────────────────────────────────────

function setNavigatorShare(fn: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(globalThis.navigator, "share", {
    value: fn,
    writable: true,
    configurable: true,
  });
}

function setNavigatorClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    writable: true,
    configurable: true,
  });
}

// ── isSupported detection ──────────────────────────────────────────────────────

function getIsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// ── share simulation ───────────────────────────────────────────────────────────

async function simulateShare(data: { title: string; text: string; url?: string }): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return false;
    }
  }

  // Clipboard fallback
  if (navigator.clipboard?.writeText) {
    const content = data.url ? `${data.text}\n${data.url}` : data.text;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // silent
    }
    return false;
  }

  return false;
}

beforeEach(() => {
  vi.clearAllMocks();
  setNavigatorShare(undefined);
  setNavigatorClipboard(undefined);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Web Share — isSupported detection", () => {
  it("returns false when navigator.share is undefined", () => {
    setNavigatorShare(undefined);
    expect(getIsSupported()).toBe(false);
  });

  it("returns true when navigator.share is a function", () => {
    setNavigatorShare(vi.fn().mockResolvedValue(undefined));
    expect(getIsSupported()).toBe(true);
  });
});

describe("Web Share — native share path", () => {
  it("returns true when native share resolves", async () => {
    setNavigatorShare(vi.fn().mockResolvedValue(undefined));
    const result = await simulateShare({ title: "t", text: "msg" });
    expect(result).toBe(true);
  });

  it("returns false when user cancels (AbortError)", async () => {
    const abortErr = new DOMException("User cancelled", "AbortError");
    setNavigatorShare(vi.fn().mockRejectedValue(abortErr));
    const result = await simulateShare({ title: "t", text: "msg" });
    expect(result).toBe(false);
  });
});

describe("Web Share — clipboard fallback", () => {
  it("falls back to clipboard when share is unavailable and returns false", async () => {
    setNavigatorShare(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorClipboard(writeText);

    const result = await simulateShare({ title: "t", text: "שתף" });

    expect(writeText).toHaveBeenCalledWith("שתף");
    expect(result).toBe(false);
  });

  it("appends URL to clipboard text when url is provided", async () => {
    setNavigatorShare(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorClipboard(writeText);

    await simulateShare({ title: "t", text: "טקסט", url: "https://bayitbeseder.com" });

    expect(writeText).toHaveBeenCalledWith("טקסט\nhttps://bayitbeseder.com");
  });
});
