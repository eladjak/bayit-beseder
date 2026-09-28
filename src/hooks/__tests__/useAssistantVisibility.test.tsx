/**
 * Tests for useAssistantVisibility — the persisted show/hide toggle for the
 * floating assistant button. Covers the specific behavior the feature
 * depends on: the choice survives a reload (a fresh hook instance reading
 * localStorage from scratch, not just in-memory state persisting within one
 * render tree), and a broken/unavailable localStorage never throws.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAssistantVisibility } from "@/hooks/useAssistantVisibility";

const STORAGE_KEY = "bayit-assistant-visible";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => (key in store ? store[key] : null),
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorageMock;

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

describe("useAssistantVisibility", () => {
  it("defaults to visible with nothing in storage", async () => {
    const { result } = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it("persists hiding the assistant across a simulated reload (a fresh hook instance)", async () => {
    const first = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(first.result.current.visible).toBe(true));

    act(() => {
      first.result.current.setVisible(false);
    });
    expect(first.result.current.visible).toBe(false);
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("0");

    // Simulate a reload: mount a brand-new hook instance, sharing nothing
    // with `first` except localStorage — this is the actual thing a page
    // reload does, and is what the effect-based (not lazy-initializer)
    // implementation in useAssistantVisibility.ts exists to make correct.
    const second = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(second.result.current.visible).toBe(false));
  });

  it("persists re-showing it the same way", async () => {
    localStorageMock.setItem(STORAGE_KEY, "0");
    const { result } = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(result.current.visible).toBe(false));

    act(() => {
      result.current.setVisible(true);
    });
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("1");

    const reloaded = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(reloaded.result.current.visible).toBe(true));
  });

  it("never throws when localStorage.setItem fails (private-mode/quota), and the in-tab toggle still works", async () => {
    const { result } = renderHook(() => useAssistantVisibility());
    await waitFor(() => expect(result.current.visible).toBe(true));

    const spy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => {
      act(() => {
        result.current.setVisible(false);
      });
    }).not.toThrow();

    // The write failed, but the toggle still reflects the user's choice for
    // the rest of this tab's session — it just won't survive a reload.
    expect(result.current.visible).toBe(false);

    spy.mockRestore();
  });
});
