/**
 * Unit tests — love-tokens constants + validation (pure-fn slice).
 * Network/DB-dependent paths (sendLoveToken, getRemainingSendsToday) are
 * covered by integration tests post-migration.
 * Sprint 7.30 Loop D.
 */

import { describe, it, expect } from "vitest";
import {
  DAILY_SEND_LIMIT,
  PRESET_VALUES,
  MAX_VALUE,
  MAX_MESSAGE_LEN,
} from "@/lib/love-tokens";

describe("love-tokens — constants", () => {
  it("DAILY_SEND_LIMIT is a small positive integer", () => {
    expect(Number.isInteger(DAILY_SEND_LIMIT)).toBe(true);
    expect(DAILY_SEND_LIMIT).toBeGreaterThan(0);
    expect(DAILY_SEND_LIMIT).toBeLessThanOrEqual(20);
  });

  it("PRESET_VALUES are sorted ascending", () => {
    for (let i = 1; i < PRESET_VALUES.length; i++) {
      expect(PRESET_VALUES[i]).toBeGreaterThan(PRESET_VALUES[i - 1] as number);
    }
  });

  it("PRESET_VALUES all <= MAX_VALUE", () => {
    for (const v of PRESET_VALUES) {
      expect(v).toBeLessThanOrEqual(MAX_VALUE);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("MAX_VALUE and MAX_MESSAGE_LEN are reasonable", () => {
    expect(MAX_VALUE).toBeGreaterThan(10);
    expect(MAX_VALUE).toBeLessThanOrEqual(1000);
    expect(MAX_MESSAGE_LEN).toBeGreaterThan(50);
    expect(MAX_MESSAGE_LEN).toBeLessThanOrEqual(500);
  });

  it("PRESET_VALUES contains 1 (smallest meaningful gesture)", () => {
    expect(PRESET_VALUES).toContain(1);
  });
});
