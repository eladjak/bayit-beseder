/**
 * Unit tests for `normalizeHouseholdCity` (src/hooks/useHousehold.ts).
 *
 * This is the ONLY validation layer for the household `city` field on the
 * client — there is no dedicated API route for household updates (writes go
 * straight to Supabase from `useHousehold.updateHousehold`, guarded by RLS),
 * so this function is what both the settings page and the onboarding wizard
 * call before saving. Tested in isolation, no Supabase client needed.
 */

import { describe, it, expect } from "vitest";
import { normalizeHouseholdCity, HOUSEHOLD_CITY_MAX_LENGTH } from "@/hooks/useHousehold";

describe("normalizeHouseholdCity", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeHouseholdCity("  מגדל העמק  ")).toBe("מגדל העמק");
  });

  it("returns null for an empty string (field is optional)", () => {
    expect(normalizeHouseholdCity("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(normalizeHouseholdCity("   ")).toBeNull();
  });

  it("accepts a value exactly at the max length", () => {
    const exact = "א".repeat(HOUSEHOLD_CITY_MAX_LENGTH);
    expect(normalizeHouseholdCity(exact)).toBe(exact);
  });

  it("RED->GREEN: rejects a value one character over the max length", () => {
    const tooLong = "א".repeat(HOUSEHOLD_CITY_MAX_LENGTH + 1);
    // Prove this actually exceeds the limit being tested, not an off-by-one
    // in the test fixture itself.
    expect(tooLong.length).toBe(HOUSEHOLD_CITY_MAX_LENGTH + 1);
    expect(normalizeHouseholdCity(tooLong)).toBeUndefined();
  });

  it("does not reject a value comfortably under the max length", () => {
    expect(normalizeHouseholdCity("תל אביב")).toBe("תל אביב");
  });

  it("control: leading/trailing whitespace does not count toward the length limit", () => {
    const paddedExact = `  ${"א".repeat(HOUSEHOLD_CITY_MAX_LENGTH)}  `;
    expect(normalizeHouseholdCity(paddedExact)).toBe("א".repeat(HOUSEHOLD_CITY_MAX_LENGTH));
  });
});
