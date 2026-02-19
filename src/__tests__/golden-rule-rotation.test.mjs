/**
 * Unit tests for golden rule rotation and difficulty weights.
 * Uses Node.js built-in test runner (Node 18+). Run with:
 *   node --test src/__tests__/golden-rule-rotation.test.mjs
 *
 * NOTE: These tests use inline implementations of the pure functions
 * to avoid the TypeScript/path-alias setup overhead in a test environment.
 * The implementations must match src/lib/auto-scheduler.ts exactly.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors auto-scheduler.ts)
// ============================================

/** Difficulty weight mapping: 1=light, 2=moderate, 3=heavy */
const DIFFICULTY_WEIGHT = { 1: 1, 2: 2, 3: 3 };

/**
 * Compute weighted load for a member based on assigned instances and their difficulty.
 * Each instance contributes its difficulty weight (defaults to 2 if missing).
 */
function computeWeightedLoad(instances, memberId) {
  let load = 0;
  for (const inst of instances) {
    if (inst.assigned_to === memberId) {
      const diff = inst.difficulty != null ? inst.difficulty : 2;
      load += DIFFICULTY_WEIGHT[diff] ?? 2;
    }
  }
  return load;
}

/**
 * Select who to assign a task to, with optional golden rule weighting.
 *
 * 1. If template has default_assignee, use it
 * 2. If goldenRuleTarget is provided, use weighted load to balance toward target ratio
 * 3. Otherwise, fall back to count-based rotation (original behavior)
 */
function selectAssignee(
  template,
  recentInstances,
  members,
  templateIndex,
  goldenRuleTarget
) {
  if (members.length === 0) {
    return "";
  }

  // If template has a default assignee and that person is a member, use them
  if (
    template.default_assignee &&
    members.includes(template.default_assignee)
  ) {
    return template.default_assignee;
  }

  // Golden rule path: use weighted loads
  if (goldenRuleTarget != null && members.length === 2) {
    const user1 = members[0];
    const user2 = members[1];

    const load1 = computeWeightedLoad(recentInstances, user1);
    const load2 = computeWeightedLoad(recentInstances, user2);
    const totalLoad = load1 + load2;

    const targetRatio1 = goldenRuleTarget / 100;
    const targetRatio2 = 1 - targetRatio1;

    if (totalLoad === 0) {
      // No history - assign to user1 (higher target) on even index, user2 on odd
      return templateIndex % 2 === 0 ? user1 : user2;
    }

    const actualRatio1 = load1 / totalLoad;
    const actualRatio2 = load2 / totalLoad;

    // Assign to the member furthest below their target ratio
    const gap1 = targetRatio1 - actualRatio1;
    const gap2 = targetRatio2 - actualRatio2;

    if (gap1 > gap2) return user1;
    if (gap2 > gap1) return user2;
    // If equal gaps, alternate by index
    return templateIndex % 2 === 0 ? user1 : user2;
  }

  // Original count-based rotation (no golden rule)
  const counts = {};
  for (const m of members) {
    counts[m] = 0;
  }
  for (const instance of recentInstances) {
    if (instance.assigned_to && counts[instance.assigned_to] !== undefined) {
      counts[instance.assigned_to]++;
    }
  }

  let minCount = Infinity;
  for (const m of members) {
    if (counts[m] < minCount) {
      minCount = counts[m];
    }
  }

  const candidates = members.filter((m) => counts[m] === minCount);

  if (candidates.length > 1) {
    return candidates[templateIndex % candidates.length];
  }

  return candidates[0];
}

// ============================================
// Tests: DIFFICULTY_WEIGHT
// ============================================

describe("DIFFICULTY_WEIGHT", () => {
  it("maps difficulty 1 to weight 1 (light)", () => {
    assert.equal(DIFFICULTY_WEIGHT[1], 1);
  });

  it("maps difficulty 2 to weight 2 (moderate)", () => {
    assert.equal(DIFFICULTY_WEIGHT[2], 2);
  });

  it("maps difficulty 3 to weight 3 (heavy)", () => {
    assert.equal(DIFFICULTY_WEIGHT[3], 3);
  });
});

// ============================================
// Tests: computeWeightedLoad
// ============================================

describe("computeWeightedLoad", () => {
  it("returns 0 for empty instances", () => {
    assert.equal(computeWeightedLoad([], "user-a"), 0);
  });

  it("returns correct weight for a single instance", () => {
    const instances = [{ assigned_to: "user-a", difficulty: 3 }];
    assert.equal(computeWeightedLoad(instances, "user-a"), 3);
  });

  it("sums weights for multiple instances assigned to same member", () => {
    const instances = [
      { assigned_to: "user-a", difficulty: 1 }, // weight 1
      { assigned_to: "user-a", difficulty: 3 }, // weight 3
      { assigned_to: "user-b", difficulty: 2 }, // not user-a
    ];
    assert.equal(computeWeightedLoad(instances, "user-a"), 4); // 1 + 3
  });

  it("ignores instances assigned to other members", () => {
    const instances = [
      { assigned_to: "user-b", difficulty: 3 },
      { assigned_to: "user-b", difficulty: 2 },
    ];
    assert.equal(computeWeightedLoad(instances, "user-a"), 0);
  });

  it("defaults to weight 2 when difficulty is missing", () => {
    const instances = [{ assigned_to: "user-a" }];
    assert.equal(computeWeightedLoad(instances, "user-a"), 2);
  });

  it("handles mixed instances with and without difficulty", () => {
    const instances = [
      { assigned_to: "user-a", difficulty: 1 }, // weight 1
      { assigned_to: "user-a" }, // default weight 2
      { assigned_to: "user-a", difficulty: 3 }, // weight 3
    ];
    assert.equal(computeWeightedLoad(instances, "user-a"), 6); // 1 + 2 + 3
  });
});

// ============================================
// Tests: selectAssignee with golden rule
// ============================================

describe("selectAssignee with golden rule", () => {
  const members = ["user-a", "user-b"];

  it("80/20 split assigns more to user-a when user-a is under target", () => {
    // user-a target: 80%, user-b target: 20%
    // Current: user-a has load 2, user-b has load 8 -> user-a ratio = 20%, gap = 60%
    const recentInstances = [
      { assigned_to: "user-a", difficulty: 1 },
      { assigned_to: "user-a", difficulty: 1 },
      { assigned_to: "user-b", difficulty: 2 },
      { assigned_to: "user-b", difficulty: 2 },
      { assigned_to: "user-b", difficulty: 2 },
      { assigned_to: "user-b", difficulty: 2 },
    ];
    const template = { default_assignee: null };
    const result = selectAssignee(template, recentInstances, members, 0, 80);
    assert.equal(result, "user-a"); // user-a is furthest below target
  });

  it("80/20 split assigns to user-b when user-b is under target", () => {
    // user-a has load 8 (ratio 80%), user-b has load 2 (ratio 20%)
    // With 80/20 target: user-a gap = 0%, user-b gap = 0% -> tied, use index
    // But let's make user-a over: load 9 vs load 1
    const recentInstances = [
      { assigned_to: "user-a", difficulty: 3 },
      { assigned_to: "user-a", difficulty: 3 },
      { assigned_to: "user-a", difficulty: 3 },
      { assigned_to: "user-b", difficulty: 1 },
    ];
    // user-a load = 9, user-b load = 1, total = 10
    // user-a ratio = 90%, target = 80%, gap = -10%
    // user-b ratio = 10%, target = 20%, gap = +10%
    const template = { default_assignee: null };
    const result = selectAssignee(template, recentInstances, members, 0, 80);
    assert.equal(result, "user-b"); // user-b is furthest below target
  });

  it("50/50 split assigns to member with less weighted load", () => {
    const recentInstances = [
      { assigned_to: "user-a", difficulty: 3 }, // load 3
      { assigned_to: "user-b", difficulty: 1 }, // load 1
    ];
    // user-a ratio = 75%, target = 50%, gap = -25%
    // user-b ratio = 25%, target = 50%, gap = +25%
    const template = { default_assignee: null };
    const result = selectAssignee(template, recentInstances, members, 0, 50);
    assert.equal(result, "user-b"); // user-b is furthest below 50% target
  });

  it("50/50 split with equal loads alternates by index", () => {
    const recentInstances = [
      { assigned_to: "user-a", difficulty: 2 },
      { assigned_to: "user-b", difficulty: 2 },
    ];
    const template = { default_assignee: null };
    const result0 = selectAssignee(template, recentInstances, members, 0, 50);
    const result1 = selectAssignee(template, recentInstances, members, 1, 50);
    assert.equal(result0, "user-a"); // even index
    assert.equal(result1, "user-b"); // odd index
  });

  it("with no history, alternates by index", () => {
    const template = { default_assignee: null };
    const result0 = selectAssignee(template, [], members, 0, 80);
    const result1 = selectAssignee(template, [], members, 1, 80);
    assert.equal(result0, "user-a"); // even index -> user1
    assert.equal(result1, "user-b"); // odd index -> user2
  });

  it("still respects default_assignee even with golden rule", () => {
    const template = { default_assignee: "user-b" };
    const result = selectAssignee(template, [], members, 0, 80);
    assert.equal(result, "user-b");
  });
});

// ============================================
// Tests: selectAssignee without golden rule (backward compat)
// ============================================

describe("selectAssignee without golden rule (backward compatible)", () => {
  const members = ["user-a", "user-b"];

  it("uses count-based rotation when no goldenRuleTarget", () => {
    const recentInstances = [
      { assigned_to: "user-a", difficulty: 3 },
      { assigned_to: "user-a", difficulty: 1 },
      { assigned_to: "user-b", difficulty: 2 },
    ];
    const template = { default_assignee: null };
    // count: user-a=2, user-b=1, so assigns to user-b
    const result = selectAssignee(template, recentInstances, members, 0);
    assert.equal(result, "user-b");
  });

  it("uses count-based rotation when goldenRuleTarget is undefined", () => {
    const template = { default_assignee: null };
    const result = selectAssignee(template, [], members, 0, undefined);
    assert.equal(result, "user-a"); // tied -> templateIndex 0 -> first
  });

  it("returns empty string for no members", () => {
    const template = { default_assignee: null };
    const result = selectAssignee(template, [], [], 0, 80);
    assert.equal(result, "");
  });
});
