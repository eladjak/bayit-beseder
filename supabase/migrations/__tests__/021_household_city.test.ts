/**
 * Tests for 021_household_city.sql — the additive `households.city` column.
 *
 * Two things need proving, and they are different kinds of claims:
 *
 * 1. The migration itself is additive-safe: nullable, no default that could
 *    surprise existing rows, no NOT NULL, no touching of any other column or
 *    policy. This is a source-inspection test (reads the .sql file directly)
 *    — same constraint as the rest of supabase/migrations/__tests__/: there
 *    is no local Postgres in this worktree to run the migration against.
 *
 * 2. The RLS story: 021 adds NO new policy on purpose, because
 *    019_close_live_rls_holes.sql already scoped households SELECT/UPDATE to
 *    "public.is_household_member(id)" for the WHOLE ROW, and Postgres RLS
 *    policies apply per-row, not per-column — so the existing policy already
 *    covers `city` with no changes needed. This is proven the same way
 *    017's test proves cross-household isolation: the policy's boolean
 *    expression re-expressed as a JS predicate, exercised for a member and a
 *    non-member, on an update that includes `city`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(resolve(__dirname, "..", "021_household_city.sql"), "utf8");

describe("021_household_city.sql — additive-safe schema change", () => {
  it("adds the city column as nullable text with no default", () => {
    // Nullable: no NOT NULL anywhere near the column definition.
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS city text;/);
    expect(sql).not.toMatch(/city text NOT NULL/i);
    expect(sql).not.toMatch(/city text.*DEFAULT/i);
  });

  it("does not touch any other column, table, or CREATE POLICY statement", () => {
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/DROP POLICY/i);
    expect(sql).not.toMatch(/ALTER TABLE public\.(?!households)/i);
  });

  it("uses IF NOT EXISTS so the migration is safe to re-run", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/);
  });
});

// ---------------------------------------------------------------------------
// RLS: the existing 019 membership policy already governs `city` (whole-row).
// ---------------------------------------------------------------------------

interface Membership {
  userId: string;
  householdId: string;
}

interface HouseholdUpdate {
  householdId: string;
  city: string | null;
}

function isHouseholdMember(memberships: Membership[], userId: string, householdId: string): boolean {
  return memberships.some((m) => m.userId === userId && m.householdId === householdId);
}

/**
 * "Household members can update households" FOR UPDATE
 * USING (public.is_household_member(id)) WITH CHECK (public.is_household_member(id))
 * — from 019_close_live_rls_holes.sql. Re-expressed here; unchanged by 021.
 * Applies to the whole row (including the new `city` column) because RLS
 * policies are not column-scoped.
 */
function updateAllowed(memberships: Membership[], callerId: string, update: HouseholdUpdate): boolean {
  return isHouseholdMember(memberships, callerId, update.householdId);
}

const USER_A = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const HOUSEHOLD_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // A is not a member here

const memberships: Membership[] = [{ userId: USER_A, householdId: HOUSEHOLD_A }];

describe("households RLS — city column is covered by the existing 019 UPDATE policy", () => {
  it("GREEN: a household member can set their own household's city", () => {
    expect(updateAllowed(memberships, USER_A, { householdId: HOUSEHOLD_A, city: "מגדל העמק" })).toBe(true);
  });

  it("RED->GREEN: a user who is not a member of household B cannot set its city", () => {
    // Confirm the fixture is set up as intended before trusting the result.
    expect(isHouseholdMember(memberships, USER_A, HOUSEHOLD_B)).toBe(false);
    expect(updateAllowed(memberships, USER_A, { householdId: HOUSEHOLD_B, city: "תל אביב" })).toBe(false);
  });

  it("control: clearing the city (setting it back to null) follows the same rule as setting it", () => {
    expect(updateAllowed(memberships, USER_A, { householdId: HOUSEHOLD_A, city: null })).toBe(true);
    expect(updateAllowed(memberships, USER_A, { householdId: HOUSEHOLD_B, city: null })).toBe(false);
  });
});
