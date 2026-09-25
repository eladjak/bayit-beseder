/**
 * Proves the cross-household INSERT hole that 003_shopping_items.sql left
 * open on public.shopping_items, and that 017_shopping_household_insert_rls.sql
 * closes it.
 *
 * THIS IS NOT A LIVE-POSTGRES RLS TEST. There is no local Supabase/Postgres
 * available in this worktree (same constraint noted in the sibling
 * ../../src/app/api/agent/task/__tests__/multi-tenant-gap.test.ts). Instead,
 * each RLS policy's `USING` / `WITH CHECK` boolean expression from the SQL
 * migrations is re-expressed here as a small, literal JS predicate — one
 * function per policy, named after the policy. `insertAllowed()` then OR's
 * the applicable policies together, exactly as Postgres does for policies
 * on the same command. This proves the POLICY LOGIC is right or wrong; it
 * does not exercise the Postgres planner, `auth.uid()`, or the actual RLS
 * engine. A true integration proof would need a real Postgres instance with
 * these migrations applied and a request made as an authenticated Postgres
 * role — out of scope here.
 *
 * Red -> green structure:
 *   1. "old" policy set (003_shopping_items.sql as originally written) is
 *      shown to allow a cross-household insert, and specifically for the
 *      reason predicted in the migration's comment: the blanket
 *      auth.role() = 'authenticated' check has no household clause at all.
 *   2. "new" policy set (003 + 017_shopping_household_insert_rls.sql) is
 *      shown to reject the identical insert.
 *   3. A control case proves the new policy set still allows a household
 *      member to insert into their OWN household — the fix narrows access,
 *      it doesn't break legitimate use.
 */

import { describe, it, expect } from "vitest";

interface Membership {
  userId: string;
  householdId: string;
}

interface ShoppingItemInsert {
  household_id: string;
  added_by: string | null;
}

function isHouseholdMember(memberships: Membership[], userId: string, householdId: string): boolean {
  return memberships.some((m) => m.userId === userId && m.householdId === householdId);
}

/**
 * "Members can manage shopping items" FOR ALL USING (household_id IN
 * (SELECT household_id FROM household_members WHERE user_id = auth.uid())).
 * No WITH CHECK was ever written for this policy pre-017; Postgres uses the
 * USING expression as WITH CHECK by default on a FOR ALL policy without one.
 * Present, unchanged, in both the old and new policy sets.
 */
function membersCanManage(memberships: Membership[], callerId: string, row: ShoppingItemInsert): boolean {
  return isHouseholdMember(memberships, callerId, row.household_id);
}

/**
 * "Authenticated users can manage own items" FOR ALL USING (added_by =
 * auth.uid()). Dropped by 017. The caller fully controls `added_by` on an
 * INSERT, so this never actually constrained which household could be
 * targeted — only that the caller name themselves as the adder.
 */
function authenticatedCanManageOwn(callerId: string, row: ShoppingItemInsert): boolean {
  return row.added_by === callerId;
}

/**
 * "Authenticated users can insert items" FOR INSERT WITH CHECK (auth.role()
 * = 'authenticated'). Dropped by 017. No household clause whatsoever — true
 * for every authenticated caller, for every row.
 */
function authenticatedCanInsertAnything(isAuthenticated: boolean): boolean {
  return isAuthenticated;
}

/** The exact three-policy OR that governed INSERT before 017. */
function insertAllowedOldPolicySet(memberships: Membership[], callerId: string, row: ShoppingItemInsert): boolean {
  return (
    membersCanManage(memberships, callerId, row) ||
    authenticatedCanManageOwn(callerId, row) ||
    authenticatedCanInsertAnything(true)
  );
}

/** The single remaining policy that governs INSERT after 017. */
function insertAllowedNewPolicySet(memberships: Membership[], callerId: string, row: ShoppingItemInsert): boolean {
  return membersCanManage(memberships, callerId, row);
}

const USER_A = "11111111-1111-1111-1111-111111111111"; // member of household A only
const HOUSEHOLD_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const HOUSEHOLD_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // A does NOT belong here

const memberships: Membership[] = [{ userId: USER_A, householdId: HOUSEHOLD_A }];

describe("shopping_items RLS — cross-household INSERT (003 vs 017)", () => {
  it("RED: under the OLD policy set, a user with no membership in household B can still insert an item into household B", () => {
    const crossHouseholdRow: ShoppingItemInsert = {
      household_id: HOUSEHOLD_B,
      added_by: USER_A,
    };

    // Confirm this isn't allowed for the wrong reason (household match) —
    // the caller genuinely has no membership in B.
    expect(isHouseholdMember(memberships, USER_A, HOUSEHOLD_B)).toBe(false);
    expect(membersCanManage(memberships, USER_A, crossHouseholdRow)).toBe(false);

    // It's allowed anyway, specifically because of the blanket
    // "authenticated users can insert items" policy — the predicted cause.
    expect(authenticatedCanInsertAnything(true)).toBe(true);
    expect(insertAllowedOldPolicySet(memberships, USER_A, crossHouseholdRow)).toBe(true);
  });

  it("RED: under the OLD policy set, the 'own items' fallback ALSO allows the cross-household insert on its own (added_by is caller-controlled)", () => {
    const crossHouseholdRow: ShoppingItemInsert = {
      household_id: HOUSEHOLD_B,
      added_by: USER_A, // the attacker just names themself as the adder
    };

    // Drop the blanket "authenticated" policy from consideration entirely,
    // and show the household-agnostic "own items" policy is independently
    // sufficient to let the insert through.
    const allowedViaOwnItemsPolicyAlone =
      membersCanManage(memberships, USER_A, crossHouseholdRow) ||
      authenticatedCanManageOwn(USER_A, crossHouseholdRow);

    expect(allowedViaOwnItemsPolicyAlone).toBe(true);
  });

  it("GREEN: under the NEW policy set (017 applied), the identical cross-household insert is rejected", () => {
    const crossHouseholdRow: ShoppingItemInsert = {
      household_id: HOUSEHOLD_B,
      added_by: USER_A,
    };

    expect(insertAllowedNewPolicySet(memberships, USER_A, crossHouseholdRow)).toBe(false);
  });

  it("control: under the NEW policy set, the same user can still insert into their OWN household", () => {
    const ownHouseholdRow: ShoppingItemInsert = {
      household_id: HOUSEHOLD_A,
      added_by: USER_A,
    };

    expect(insertAllowedNewPolicySet(memberships, USER_A, ownHouseholdRow)).toBe(true);
  });

  it("control: the NEW policy set also rejects a caller who omits added_by entirely, if they still name a foreign household", () => {
    const crossHouseholdRowNoAddedBy: ShoppingItemInsert = {
      household_id: HOUSEHOLD_B,
      added_by: null,
    };

    expect(insertAllowedNewPolicySet(memberships, USER_A, crossHouseholdRowNoAddedBy)).toBe(false);
  });
});
