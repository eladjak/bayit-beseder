/**
 * Unit tests for useNotificationPrefs and checkIsQuietHours.
 * Tests localStorage persistence, defaults, and quiet hours logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIsQuietHours } from "@/hooks/useNotificationPrefs";

// ── localStorage mock ──────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorageMock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window ?? globalThis;

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ── checkIsQuietHours ──────────────────────────────────────────────────────────

describe("checkIsQuietHours — overnight window (22:00–07:00)", () => {
  it("returns true at 23:00 (inside overnight quiet window)", () => {
    const now = new Date("2026-01-01T23:00:00");
    expect(checkIsQuietHours("22:00", "07:00", now)).toBe(true);
  });

  it("returns true at 03:00 (inside overnight quiet window)", () => {
    const now = new Date("2026-01-01T03:00:00");
    expect(checkIsQuietHours("22:00", "07:00", now)).toBe(true);
  });

  it("returns false at 10:00 (outside overnight quiet window)", () => {
    const now = new Date("2026-01-01T10:00:00");
    expect(checkIsQuietHours("22:00", "07:00", now)).toBe(false);
  });

  it("returns false at 07:00 exactly (end boundary is exclusive)", () => {
    const now = new Date("2026-01-01T07:00:00");
    expect(checkIsQuietHours("22:00", "07:00", now)).toBe(false);
  });

  it("returns true at 22:00 exactly (start boundary is inclusive)", () => {
    const now = new Date("2026-01-01T22:00:00");
    expect(checkIsQuietHours("22:00", "07:00", now)).toBe(true);
  });
});

describe("checkIsQuietHours — same-day window (09:00–17:00)", () => {
  it("returns true at 12:00 (inside window)", () => {
    const now = new Date("2026-01-01T12:00:00");
    expect(checkIsQuietHours("09:00", "17:00", now)).toBe(true);
  });

  it("returns false at 08:59 (before window)", () => {
    const now = new Date("2026-01-01T08:59:00");
    expect(checkIsQuietHours("09:00", "17:00", now)).toBe(false);
  });

  it("returns false at 17:00 exactly (end is exclusive)", () => {
    const now = new Date("2026-01-01T17:00:00");
    expect(checkIsQuietHours("09:00", "17:00", now)).toBe(false);
  });
});

// ── Persistence helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = "bayit-notification-prefs";

describe("notification prefs — storage logic", () => {
  it("stores prefs as JSON in localStorage under bayit-notification-prefs", () => {
    const prefs = {
      taskReminders: false,
      dailyDigest: true,
      achievements: true,
      weeklyChallenges: false,
      partnerUpdates: true,
      quietStart: "21:00",
      quietEnd: "08:00",
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.taskReminders).toBe(false);
    expect(stored.quietStart).toBe("21:00");
    expect(stored.quietEnd).toBe("08:00");
  });

  it("returns null when no prefs stored", () => {
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });
});
