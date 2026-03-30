/**
 * Unit tests for the zone scheduling system.
 * Tests DEFAULT_ZONE_MAPPINGS, localStorage persistence, and buildZoneDaySummary.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_ZONE_MAPPINGS,
  buildZoneDaySummary,
  loadZoneMappings,
  saveZoneMappings,
  getPreferredDay,
  isZoneModeEnabled,
  setZoneModeEnabled,
  type ZoneDayMapping,
} from "@/lib/zones";

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
// Ensure `window` exists so `typeof window !== "undefined"` passes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window ?? globalThis;

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ── DEFAULT_ZONE_MAPPINGS ──────────────────────────────────────────────────────

describe("DEFAULT_ZONE_MAPPINGS — structure", () => {
  it("exports exactly 8 zone mappings", () => {
    expect(DEFAULT_ZONE_MAPPINGS).toHaveLength(8);
  });

  it("every mapping has a zone and at least one preferredDay", () => {
    for (const mapping of DEFAULT_ZONE_MAPPINGS) {
      expect(typeof mapping.zone).toBe("string");
      expect(mapping.zone.length).toBeGreaterThan(0);
      expect(Array.isArray(mapping.preferredDays)).toBe(true);
      expect(mapping.preferredDays.length).toBeGreaterThan(0);
    }
  });

  it("includes expected zones: kitchen, bathroom, bedroom, living, outdoor, general", () => {
    const zones = DEFAULT_ZONE_MAPPINGS.map((m) => m.zone);
    expect(zones).toContain("kitchen");
    expect(zones).toContain("bathroom");
    expect(zones).toContain("bedroom");
    expect(zones).toContain("living");
    expect(zones).toContain("outdoor");
    expect(zones).toContain("general");
  });

  it("all preferredDay indices are in range 0–6", () => {
    for (const mapping of DEFAULT_ZONE_MAPPINGS) {
      for (const day of mapping.preferredDays) {
        expect(day).toBeGreaterThanOrEqual(0);
        expect(day).toBeLessThanOrEqual(6);
      }
    }
  });
});

// ── loadZoneMappings / saveZoneMappings ────────────────────────────────────────

describe("loadZoneMappings", () => {
  it("returns DEFAULT_ZONE_MAPPINGS when localStorage is empty", () => {
    const result = loadZoneMappings();
    expect(result).toEqual(DEFAULT_ZONE_MAPPINGS);
  });

  it("returns stored mappings when localStorage has valid JSON", () => {
    const custom: ZoneDayMapping[] = [{ zone: "kitchen", preferredDays: [5] }];
    localStorageMock.setItem("bayit-zone-config", JSON.stringify(custom));
    const result = loadZoneMappings();
    expect(result).toEqual(custom);
  });

  it("falls back to DEFAULT_ZONE_MAPPINGS on invalid JSON", () => {
    localStorageMock.setItem("bayit-zone-config", "not-json{{{");
    const result = loadZoneMappings();
    expect(result).toEqual(DEFAULT_ZONE_MAPPINGS);
  });
});

describe("saveZoneMappings", () => {
  it("persists mappings to localStorage", () => {
    const custom: ZoneDayMapping[] = [{ zone: "outdoor", preferredDays: [2, 4] }];
    saveZoneMappings(custom);
    const stored = localStorageMock.getItem("bayit-zone-config");
    expect(stored).toBe(JSON.stringify(custom));
  });

  it("round-trips: saved mappings can be loaded back", () => {
    const custom: ZoneDayMapping[] = [
      { zone: "kitchen", preferredDays: [0, 3] },
      { zone: "bathroom", preferredDays: [1] },
    ];
    saveZoneMappings(custom);
    expect(loadZoneMappings()).toEqual(custom);
  });
});

// ── buildZoneDaySummary ────────────────────────────────────────────────────────

describe("buildZoneDaySummary", () => {
  it("returns an array of exactly 7 entries (one per day)", () => {
    const summary = buildZoneDaySummary();
    expect(summary).toHaveLength(7);
  });

  it("each entry has dayIndex 0–6 and a dayName string", () => {
    const summary = buildZoneDaySummary();
    for (let i = 0; i < 7; i++) {
      expect(summary[i].dayIndex).toBe(i);
      expect(typeof summary[i].dayName).toBe("string");
      expect(summary[i].dayName.length).toBeGreaterThan(0);
    }
  });

  it("kitchen appears on Sunday (dayIndex=0) by default", () => {
    const summary = buildZoneDaySummary();
    const sunday = summary[0];
    const hasKitchen = sunday.zones.some((z) => z.zone === "kitchen");
    expect(hasKitchen).toBe(true);
  });

  it("each zone entry has zone, icon, and label fields", () => {
    const summary = buildZoneDaySummary(DEFAULT_ZONE_MAPPINGS);
    for (const day of summary) {
      for (const zone of day.zones) {
        expect(typeof zone.zone).toBe("string");
        expect(typeof zone.icon).toBe("string");
        expect(typeof zone.label).toBe("string");
      }
    }
  });

  it("out-of-range preferredDays are ignored", () => {
    const custom: ZoneDayMapping[] = [{ zone: "kitchen", preferredDays: [-1, 7, 8] }];
    const summary = buildZoneDaySummary(custom);
    const allZones = summary.flatMap((d) => d.zones.map((z) => z.zone));
    expect(allZones).not.toContain("kitchen");
  });
});

// ── getPreferredDay ────────────────────────────────────────────────────────────

describe("getPreferredDay", () => {
  it("returns the first preferredDay for a known zone", () => {
    const result = getPreferredDay("kitchen", DEFAULT_ZONE_MAPPINGS);
    expect(result).toBe(0); // Sunday
  });

  it("returns 4 (Thursday) as fallback for unknown zone", () => {
    const result = getPreferredDay("unknown-zone" as never, []);
    expect(result).toBe(4);
  });
});

// ── isZoneModeEnabled / setZoneModeEnabled ─────────────────────────────────────

describe("isZoneModeEnabled / setZoneModeEnabled", () => {
  it("returns false when localStorage key is absent", () => {
    expect(isZoneModeEnabled()).toBe(false);
  });

  it("returns true after setZoneModeEnabled(true)", () => {
    setZoneModeEnabled(true);
    expect(isZoneModeEnabled()).toBe(true);
  });

  it("returns false after setZoneModeEnabled(false)", () => {
    setZoneModeEnabled(false);
    expect(isZoneModeEnabled()).toBe(false);
  });
});
