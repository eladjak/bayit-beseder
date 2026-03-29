/**
 * Unit tests for the analytics trackEvent utility.
 * Verifies Plausible integration and graceful no-op when not loaded.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackEvent } from "@/lib/analytics";

// ── Helpers ────────────────────────────────────────────────────────────────────

type PlausibleFn = (name: string, opts: { props?: Record<string, string> }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

beforeEach(() => {
  delete window.plausible;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("trackEvent — plausible present", () => {
  it("calls window.plausible with the event name", () => {
    const mockPlausible = vi.fn<PlausibleFn>();
    window.plausible = mockPlausible;

    trackEvent("task_complete");

    expect(mockPlausible).toHaveBeenCalledTimes(1);
    expect(mockPlausible).toHaveBeenCalledWith("task_complete", { props: undefined });
  });

  it("passes props object when provided", () => {
    const mockPlausible = vi.fn<PlausibleFn>();
    window.plausible = mockPlausible;

    trackEvent("login", { method: "google" });

    expect(mockPlausible).toHaveBeenCalledWith("login", { props: { method: "google" } });
  });

  it("passes empty object as props when props is an empty object", () => {
    const mockPlausible = vi.fn<PlausibleFn>();
    window.plausible = mockPlausible;

    trackEvent("pwa_install", {});

    expect(mockPlausible).toHaveBeenCalledWith("pwa_install", { props: {} });
  });

  it("passes undefined as props when no props argument given", () => {
    const mockPlausible = vi.fn<PlausibleFn>();
    window.plausible = mockPlausible;

    trackEvent("shopping_add");

    expect(mockPlausible).toHaveBeenCalledWith("shopping_add", { props: undefined });
  });
});

describe("trackEvent — plausible absent", () => {
  it("does not throw when window.plausible is undefined", () => {
    expect(window.plausible).toBeUndefined();
    expect(() => trackEvent("task_complete")).not.toThrow();
  });

  it("does not throw even with props when plausible is absent", () => {
    expect(() => trackEvent("task_complete", { category: "kitchen" })).not.toThrow();
  });
});
