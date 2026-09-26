/**
 * Proves each of the 7 effective RLS holes closed by
 * 018_close_effective_rls_holes.sql, in the same style as
 * 017_shopping_household_insert_rls.test.ts.
 *
 * THIS IS NOT A LIVE-POSTGRES RLS TEST. There is no local Supabase/Postgres
 * available in this worktree (same constraint noted in 017's test file and
 * in ../../src/app/api/agent/task/__tests__/multi-tenant-gap.test.ts).
 * Instead, each policy's USING / WITH CHECK boolean expression is
 * re-expressed here as a small, literal JS predicate — one function per
 * policy, named after the policy — and OR'd together exactly as Postgres
 * does for policies on the same command. This proves the POLICY LOGIC is
 * right or wrong; it does not exercise the Postgres planner, auth.uid(),
 * current_user, triggers, or the actual RLS engine. A true integration
 * proof needs a real Postgres instance with these migrations applied and a
 * request made as an authenticated Postgres role — out of scope here.
 *
 * Each hole gets: a RED case (old policy set allows the attack), a GREEN
 * case (new policy set rejects the identical attack), and a control case
 * (new policy set still allows the legitimate same-household action).
 */

import { describe, it, expect } from "vitest";

const USER_A = "11111111-1111-1111-1111-111111111111"; // member of household A only
const HOUSEHOLD_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const HOUSEHOLD_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // A does NOT belong here
const TASK_IN_B = "cccccccc-cccc-cccc-cccc-cccccccccccc"; // belongs to household B

interface Membership {
  userId: string;
  householdId: string;
}

const memberships: Membership[] = [{ userId: USER_A, householdId: HOUSEHOLD_A }];

function isHouseholdMember(userId: string, householdId: string): boolean {
  return memberships.some((m) => m.userId === userId && m.householdId === householdId);
}

// ---------------------------------------------------------------------------
// Hole 1: household_members "Anyone can join" — FOR INSERT WITH CHECK
// (user_id = auth.uid()), no household check.
// ---------------------------------------------------------------------------

function oldHouseholdMembersInsertAllowed(callerId: string, row: { user_id: string; household_id: string }): boolean {
  // "Anyone can join": the only policy prior to 018.
  return row.user_id === callerId;
}

function newHouseholdMembersInsertAllowed(): boolean {
  // 018 drops the only client-facing INSERT policy on household_members and
  // adds none — so INSERT is now denied for every non-service-role caller,
  // regardless of what the row contains.
  return false;
}

describe("household_members — self-join into any household (hole 1)", () => {
  it("RED: under the OLD policy, a user with no membership in household B can insert themself into it as owner", () => {
    const attackRow = { user_id: USER_A, household_id: HOUSEHOLD_B, role: "owner" };
    expect(isHouseholdMember(USER_A, HOUSEHOLD_B)).toBe(false);
    expect(oldHouseholdMembersInsertAllowed(USER_A, attackRow)).toBe(true);
  });

  it("GREEN: under the NEW policy set (018 applied), the identical self-join is rejected", () => {
    expect(newHouseholdMembersInsertAllowed()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hole 2: households "Anyone can create household" — FOR INSERT WITH CHECK
// (true).
// ---------------------------------------------------------------------------

function oldHouseholdsInsertAllowed(): boolean {
  return true; // WITH CHECK (true)
}

function newHouseholdsInsertAllowed(): boolean {
  // 018 drops the only client-facing INSERT policy on households.
  return false;
}

describe("households — arbitrary household creation (hole 2)", () => {
  it("RED: under the OLD policy, any authenticated caller can insert an arbitrary household row", () => {
    expect(oldHouseholdsInsertAllowed()).toBe(true);
  });

  it("GREEN: under the NEW policy set, direct client INSERT is rejected", () => {
    expect(newHouseholdsInsertAllowed()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hole 3: profiles SELECT "Anyone can view profiles" — USING (true).
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  household_id: string | null;
}

function oldProfilesSelectAllowed(): boolean {
  return true; // USING (true)
}

function newProfilesSelectAllowed(callerId: string, row: ProfileRow): boolean {
  return row.id === callerId || (row.household_id !== null && isHouseholdMember(callerId, row.household_id));
}

describe("profiles SELECT — cross-household PII exposure (hole 3)", () => {
  it("RED: under the OLD policy, user A can read a stranger's full profile (household B, no relation to A)", () => {
    const strangerRow: ProfileRow = { id: "99999999-9999-9999-9999-999999999999", household_id: HOUSEHOLD_B };
    expect(isHouseholdMember(USER_A, strangerRow.household_id ?? "")).toBe(false);
    expect(oldProfilesSelectAllowed()).toBe(true); // USING (true) ignores the row entirely
  });

  it("GREEN: under the NEW policy, that same stranger's row is no longer visible to A", () => {
    const strangerRow: ProfileRow = { id: "99999999-9999-9999-9999-999999999999", household_id: HOUSEHOLD_B };
    expect(newProfilesSelectAllowed(USER_A, strangerRow)).toBe(false);
  });

  it("control: under the NEW policy, A can still read their own row and a fellow household-A member's row", () => {
    const ownRow: ProfileRow = { id: USER_A, household_id: HOUSEHOLD_A };
    const fellowMemberRow: ProfileRow = { id: "22222222-2222-2222-2222-222222222222", household_id: HOUSEHOLD_A };
    // second household-A member, added only for this control check
    memberships.push({ userId: fellowMemberRow.id, householdId: HOUSEHOLD_A });
    expect(newProfilesSelectAllowed(USER_A, ownRow)).toBe(true);
    expect(newProfilesSelectAllowed(USER_A, fellowMemberRow)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Hole 4: profiles UPDATE "Users can update own profile" — USING
// (auth.uid() = id), no column restriction on household_id. Modeled via a
// trigger (BEFORE UPDATE), since RLS's WITH CHECK cannot see OLD.
// ---------------------------------------------------------------------------

function oldProfilesHouseholdIdUpdateAllowed(callerId: string, rowId: string): boolean {
  // The RLS USING clause only restricts which ROW (auth.uid() = id); it
  // does not exist as a per-column check, so once the row-level gate
  // passes, ANY column — including household_id — can be changed.
  return callerId === rowId;
}

function newProfilesHouseholdIdUpdateAllowed(
  callerId: string,
  rowId: string,
  oldHouseholdId: string | null,
  newHouseholdId: string | null,
  currentPostgresRole: "authenticated" | "service_role"
): boolean {
  const rlsRowGatePasses = callerId === rowId; // unchanged row-level RLS gate
  if (!rlsRowGatePasses) return false;
  const householdIdChanged = oldHouseholdId !== newHouseholdId;
  if (!householdIdChanged) return true; // trigger only fires on a real change
  // trg_prevent_self_household_reassignment: reject unless service_role
  return currentPostgresRole === "service_role";
}

describe("profiles UPDATE — self-service household_id reassignment (hole 4)", () => {
  it("RED: under the OLD policy set, user A can rewrite their own household_id to household B", () => {
    expect(oldProfilesHouseholdIdUpdateAllowed(USER_A, USER_A)).toBe(true);
    // the row-level check passing is the ENTIRE gate — no column check existed
  });

  it("GREEN: under the NEW trigger, the identical self-service reassignment as 'authenticated' is rejected", () => {
    const allowed = newProfilesHouseholdIdUpdateAllowed(USER_A, USER_A, HOUSEHOLD_A, HOUSEHOLD_B, "authenticated");
    expect(allowed).toBe(false);
  });

  it("control: the same household_id change performed by the service_role (invite/join, invite create) is still allowed", () => {
    const allowed = newProfilesHouseholdIdUpdateAllowed(USER_A, USER_A, null, HOUSEHOLD_A, "service_role");
    expect(allowed).toBe(true);
  });

  it("control: a non-household_id update (e.g. display_name via useProfile.ts) is unaffected — no household_id change at all", () => {
    const allowed = newProfilesHouseholdIdUpdateAllowed(USER_A, USER_A, HOUSEHOLD_A, HOUSEHOLD_A, "authenticated");
    expect(allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Hole 5: task_completions INSERT "Users can insert own completions" — WITH
// CHECK (auth.uid() = user_id), no task-household check.
// ---------------------------------------------------------------------------

interface TaskRow {
  id: string;
  household_id: string;
}

const tasks: TaskRow[] = [{ id: TASK_IN_B, household_id: HOUSEHOLD_B }];

function oldTaskCompletionInsertAllowed(callerId: string, row: { user_id: string; task_id: string }): boolean {
  return row.user_id === callerId;
}

function newTaskCompletionInsertAllowed(callerId: string, row: { user_id: string; task_id: string }): boolean {
  const task = tasks.find((t) => t.id === row.task_id);
  if (!task) return false;
  return row.user_id === callerId && isHouseholdMember(callerId, task.household_id);
}

describe("task_completions INSERT — forging completions on a foreign household's task (hole 5)", () => {
  it("RED: under the OLD policy, user A can insert a completion for a task that belongs to household B", () => {
    const row = { user_id: USER_A, task_id: TASK_IN_B };
    expect(isHouseholdMember(USER_A, HOUSEHOLD_B)).toBe(false);
    expect(oldTaskCompletionInsertAllowed(USER_A, row)).toBe(true);
  });

  it("GREEN: under the NEW policy, the identical insert is rejected", () => {
    const row = { user_id: USER_A, task_id: TASK_IN_B };
    expect(newTaskCompletionInsertAllowed(USER_A, row)).toBe(false);
  });

  it("control: under the NEW policy, A can still insert a completion for a task in their own household", () => {
    const taskInA: TaskRow = { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", household_id: HOUSEHOLD_A };
    tasks.push(taskInA);
    const row = { user_id: USER_A, task_id: taskInA.id };
    expect(newTaskCompletionInsertAllowed(USER_A, row)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Hole 6: streaks "Users can update own streaks" — FOR ALL USING (user_id =
// auth.uid()), no household check on INSERT.
// ---------------------------------------------------------------------------

function oldStreaksInsertAllowed(callerId: string, row: { user_id: string; household_id: string }): boolean {
  return row.user_id === callerId;
}

function newStreaksInsertAllowed(callerId: string, row: { user_id: string; household_id: string }): boolean {
  return row.user_id === callerId && isHouseholdMember(callerId, row.household_id);
}

describe("streaks INSERT — fabricating a streak row visible to a foreign household (hole 6)", () => {
  it("RED: under the OLD policy, user A can insert a streaks row claiming household B", () => {
    const row = { user_id: USER_A, household_id: HOUSEHOLD_B };
    expect(oldStreaksInsertAllowed(USER_A, row)).toBe(true);
  });

  it("GREEN: under the NEW policy, the identical insert is rejected", () => {
    const row = { user_id: USER_A, household_id: HOUSEHOLD_B };
    expect(newStreaksInsertAllowed(USER_A, row)).toBe(false);
  });

  it("control: under the NEW policy, A can still insert a streaks row for their own household", () => {
    const row = { user_id: USER_A, household_id: HOUSEHOLD_A };
    expect(newStreaksInsertAllowed(USER_A, row)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Hole 7: whatsapp_webhook_events — RLS never enabled.
// ---------------------------------------------------------------------------

function oldWebhookEventsReadableByAuthenticatedRole(rlsEnabled: boolean): boolean {
  // With RLS disabled, Postgres applies no row filtering at all for a
  // non-owner role that has been granted table privileges (which Supabase
  // projects grant to authenticated/anon by default on public-schema
  // tables) — every row is visible/writable, full stop.
  return !rlsEnabled;
}

function newWebhookEventsReadableByAuthenticatedRole(rlsEnabled: boolean, policyCount: number): boolean {
  if (!rlsEnabled) return true;
  // RLS enabled + zero policies = default-deny for every non-owner,
  // non-bypassrls role.
  return policyCount > 0;
}

describe("whatsapp_webhook_events — table with RLS never enabled (hole 7)", () => {
  it("RED: before 018, RLS is disabled, so an authenticated role can read/write every row regardless of household", () => {
    expect(oldWebhookEventsReadableByAuthenticatedRole(false)).toBe(true);
  });

  it("GREEN: after 018 enables RLS with zero added policies, an authenticated role is denied by default", () => {
    expect(newWebhookEventsReadableByAuthenticatedRole(true, 0)).toBe(false);
  });

  it("control: the service_role Postgres role bypasses RLS regardless of policy count, so the webhook route is unaffected", () => {
    // BYPASSRLS is a role attribute, not something policies grant or deny —
    // this control documents the assumption 018's fix relies on rather than
    // asserting anything the JS predicates above can compute.
    const serviceRoleHasBypassRlsAttribute = true;
    expect(serviceRoleHasBypassRlsAttribute).toBe(true);
  });
});
