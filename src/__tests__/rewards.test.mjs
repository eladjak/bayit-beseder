import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ============================================
// Inline implementations (mirrors rewards.ts)
// ============================================

const REWARDS = [
  {
    id: "movie-night",
    emoji: "🎬",
    title: "ערב צפייה",
    description: "שני בני הזוג משלימים משימות 3 ימים ברצף",
    requirement: { type: "both_daily", threshold: 3 },
  },
  {
    id: "coffee-dessert",
    emoji: "☕",
    title: "קפה וקינוח",
    description: "15 משימות משותפות השבוע",
    requirement: { type: "weekly_tasks", threshold: 15 },
  },
  {
    id: "dinner-out",
    emoji: "🍽️",
    title: "ארוחת חוץ",
    description: "הגיעו לכלל הזהב 5 פעמים השבוע",
    requirement: { type: "golden_rule", threshold: 5 },
  },
  {
    id: "ready-meal",
    emoji: "🥘",
    title: "ארוחה מוכנה",
    description: "כל משימות המטבח הושלמו 7 ימים ברצף",
    requirement: { type: "category_complete", threshold: 7, category: "kitchen" },
  },
  {
    id: "spa-day",
    emoji: "💆",
    title: "יום פינוק",
    description: "רצף משותף של 14 יום",
    requirement: { type: "combined_streak", threshold: 14 },
  },
  {
    id: "movie-theater",
    emoji: "🎥",
    title: "סרט בקולנוע",
    description: "50 משימות החודש ביחד",
    requirement: { type: "total_tasks", threshold: 50 },
  },
  {
    id: "shopping-together",
    emoji: "🛍️",
    title: "קניות משותפות",
    description: "כל אחד מבני הזוג השלים 10 משימות השבוע",
    requirement: { type: "weekly_tasks", threshold: 10 },
  },
  {
    id: "home-break",
    emoji: "🏡",
    title: "חופשה מהבית",
    description: "רצף משותף של 7 ימים",
    requirement: { type: "combined_streak", threshold: 7 },
  },
  {
    id: "romantic-weekend",
    emoji: "💑",
    title: "סוף שבוע רומנטי",
    description: "רצף משותף של 30 יום",
    requirement: { type: "combined_streak", threshold: 30 },
  },
  {
    id: "surprise",
    emoji: "🎁",
    title: "הפתעה!",
    description: "100 משימות ביחד סה״כ",
    requirement: { type: "total_tasks", threshold: 100 },
  },
];

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(dateStr) {
  return dateStr.slice(0, 7) + "-01";
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function countCompletedByUser(tasks, startDate, endDate) {
  const counts = new Map();
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completed_by || !t.completed_at) continue;
    const d = t.completed_at.slice(0, 10);
    if (d >= startDate && d <= endDate) {
      counts.set(t.completed_by, (counts.get(t.completed_by) ?? 0) + 1);
    }
  }
  return counts;
}

function countCompletedInRange(tasks, startDate, endDate) {
  let count = 0;
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completed_at) continue;
    const d = t.completed_at.slice(0, 10);
    if (d >= startDate && d <= endDate) count++;
  }
  return count;
}

function countBothDailyStreak(tasks, members, today) {
  if (members.length < 2) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = addDays(today, -i);
    const usersOnDay = new Set();
    for (const t of tasks) {
      if (t.status !== "completed" || !t.completed_by || !t.completed_at) continue;
      if (t.completed_at.slice(0, 10) === dateStr) {
        usersOnDay.add(t.completed_by);
      }
    }
    const allCompleted = members.every((m) => usersOnDay.has(m));
    if (!allCompleted) break;
    streak++;
  }
  return streak;
}

function countCategoryStreak(tasks, category, today) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = addDays(today, -i);
    const dayTasks = tasks.filter(
      (t) => t.category === category && t.due_date === dateStr
    );
    if (dayTasks.length === 0) break;
    const allDone = dayTasks.every((t) => t.status === "completed");
    if (!allDone) break;
    streak++;
  }
  return streak;
}

function computeRewardsProgress(taskInstances, streaks, goldenRuleHits, householdMembers, today = new Date().toISOString().slice(0, 10)) {
  const weekStart = getWeekStart(today);
  const monthStart = getMonthStart(today);
  const combinedStreak = Math.min(streaks.user1Streak, streaks.user2Streak);

  return REWARDS.map((reward) => {
    let current = 0;
    const target = reward.requirement.threshold;

    switch (reward.requirement.type) {
      case "combined_streak":
        current = combinedStreak;
        break;
      case "weekly_tasks":
        if (reward.id === "shopping-together") {
          const perUser = countCompletedByUser(taskInstances, weekStart, today);
          const counts = householdMembers.map((m) => perUser.get(m) ?? 0);
          current = counts.length >= 2 ? Math.min(...counts) : 0;
        } else {
          current = countCompletedInRange(taskInstances, weekStart, today);
        }
        break;
      case "golden_rule":
        current = goldenRuleHits;
        break;
      case "category_complete":
        current = countCategoryStreak(taskInstances, reward.requirement.category ?? "kitchen", today);
        break;
      case "total_tasks":
        if (reward.id === "surprise") {
          current = taskInstances.filter((t) => t.status === "completed").length;
        } else {
          current = countCompletedInRange(taskInstances, monthStart, today);
        }
        break;
      case "both_daily":
        current = countBothDailyStreak(taskInstances, householdMembers, today);
        break;
      case "speed_complete":
        current = 0;
        break;
    }

    const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const unlocked = current >= target;
    return { reward, current, target, progress, unlocked };
  });
}

function getNextReward(progress) {
  const locked = progress.filter((p) => !p.unlocked);
  if (locked.length === 0) return null;
  return locked.reduce((best, item) => (item.progress > best.progress ? item : best));
}

function getUnlockedCount(progress) {
  return progress.filter((p) => p.unlocked).length;
}

// ============================================
// Helpers
// ============================================

function makeTask({
  id = crypto.randomUUID(),
  status = "completed",
  completed_by = "user1",
  completed_at = "2026-02-18T12:00:00Z",
  due_date = "2026-02-18",
  category = undefined,
  template_id = "tpl1",
  household_id = "hh1",
} = {}) {
  return {
    id,
    template_id,
    household_id,
    assigned_to: completed_by,
    due_date,
    status,
    completed_at: status === "completed" ? completed_at : null,
    completed_by: status === "completed" ? completed_by : null,
    rating: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    category,
  };
}

const TODAY = "2026-02-18";
const MEMBERS = ["user1", "user2"];

function defaultStreaks(u1 = 0, u2 = 0) {
  return { user1Streak: u1, user2Streak: u2 };
}

// ============================================
// Tests
// ============================================

describe("computeRewardsProgress", () => {
  it("returns progress for all 10 rewards", () => {
    const result = computeRewardsProgress([], defaultStreaks(), 0, MEMBERS, TODAY);
    assert.equal(result.length, 10);
  });

  it("all rewards start at 0 with no data", () => {
    const result = computeRewardsProgress([], defaultStreaks(), 0, MEMBERS, TODAY);
    for (const r of result) {
      assert.equal(r.current, 0);
      assert.equal(r.unlocked, false);
      assert.equal(r.progress, 0);
    }
  });

  it("calculates combined_streak correctly (home-break: 7 days)", () => {
    const result = computeRewardsProgress([], defaultStreaks(10, 7), 0, MEMBERS, TODAY);
    const homeBreak = result.find((r) => r.reward.id === "home-break");
    assert.equal(homeBreak.current, 7);
    assert.equal(homeBreak.unlocked, true);
    assert.equal(homeBreak.progress, 100);
  });

  it("calculates combined_streak for romantic-weekend (30 days)", () => {
    const result = computeRewardsProgress([], defaultStreaks(30, 35), 0, MEMBERS, TODAY);
    const romantic = result.find((r) => r.reward.id === "romantic-weekend");
    assert.equal(romantic.current, 30);
    assert.equal(romantic.unlocked, true);
  });

  it("calculates weekly_tasks (coffee-dessert: 15 combined)", () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      makeTask({
        completed_by: i % 2 === 0 ? "user1" : "user2",
        completed_at: `2026-02-${15 + (i % 4)}T10:00:00Z`,
        due_date: `2026-02-${15 + (i % 4)}`,
      })
    );
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const coffee = result.find((r) => r.reward.id === "coffee-dessert");
    assert.equal(coffee.current, 15);
    assert.equal(coffee.unlocked, true);
  });

  it("calculates golden_rule hits (dinner-out: 5)", () => {
    const result = computeRewardsProgress([], defaultStreaks(), 5, MEMBERS, TODAY);
    const dinner = result.find((r) => r.reward.id === "dinner-out");
    assert.equal(dinner.current, 5);
    assert.equal(dinner.unlocked, true);
  });

  it("calculates total_tasks for monthly (movie-theater: 50)", () => {
    const tasks = Array.from({ length: 50 }, (_, i) =>
      makeTask({
        completed_at: `2026-02-${String(1 + (i % 18)).padStart(2, "0")}T10:00:00Z`,
        due_date: `2026-02-${String(1 + (i % 18)).padStart(2, "0")}`,
      })
    );
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const movie = result.find((r) => r.reward.id === "movie-theater");
    assert.equal(movie.current, 50);
    assert.equal(movie.unlocked, true);
  });

  it("calculates total_tasks all-time (surprise: 100)", () => {
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({
        completed_at: `2026-0${i < 50 ? 1 : 2}-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`,
        due_date: `2026-0${i < 50 ? 1 : 2}-${String(1 + (i % 28)).padStart(2, "0")}`,
      })
    );
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const surprise = result.find((r) => r.reward.id === "surprise");
    assert.equal(surprise.current, 100);
    assert.equal(surprise.unlocked, true);
  });

  it("calculates both_daily streak (movie-night: 3 days)", () => {
    const tasks = [];
    for (let d = 0; d < 3; d++) {
      const dateStr = `2026-02-${18 - d}`;
      const dateISO = `${dateStr}T10:00:00Z`;
      tasks.push(makeTask({ completed_by: "user1", completed_at: dateISO, due_date: dateStr }));
      tasks.push(makeTask({ completed_by: "user2", completed_at: dateISO, due_date: dateStr }));
    }
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const movieNight = result.find((r) => r.reward.id === "movie-night");
    assert.equal(movieNight.current, 3);
    assert.equal(movieNight.unlocked, true);
  });

  it("calculates category_complete streak (ready-meal: kitchen 7 days)", () => {
    const tasks = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `2026-02-${String(18 - d).padStart(2, "0")}`;
      tasks.push(
        makeTask({
          completed_at: `${dateStr}T10:00:00Z`,
          due_date: dateStr,
          category: "kitchen",
        })
      );
    }
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const readyMeal = result.find((r) => r.reward.id === "ready-meal");
    assert.equal(readyMeal.current, 7);
    assert.equal(readyMeal.unlocked, true);
  });

  it("progress is capped at 100", () => {
    const result = computeRewardsProgress([], defaultStreaks(50, 50), 0, MEMBERS, TODAY);
    const romantic = result.find((r) => r.reward.id === "romantic-weekend");
    assert.equal(romantic.progress, 100);
  });

  it("shopping-together requires both partners to have 10 each", () => {
    const tasks = [
      ...Array.from({ length: 10 }, () =>
        makeTask({ completed_by: "user1", completed_at: "2026-02-17T10:00:00Z", due_date: "2026-02-17" })
      ),
      ...Array.from({ length: 5 }, () =>
        makeTask({ completed_by: "user2", completed_at: "2026-02-17T10:00:00Z", due_date: "2026-02-17" })
      ),
    ];
    const result = computeRewardsProgress(tasks, defaultStreaks(), 0, MEMBERS, TODAY);
    const shopping = result.find((r) => r.reward.id === "shopping-together");
    assert.equal(shopping.current, 5);
    assert.equal(shopping.unlocked, false);
  });
});

describe("getNextReward", () => {
  it("returns closest to unlock", () => {
    const progress = [
      { reward: REWARDS[0], current: 2, target: 3, progress: 67, unlocked: false },
      { reward: REWARDS[1], current: 5, target: 15, progress: 33, unlocked: false },
      { reward: REWARDS[2], current: 5, target: 5, progress: 100, unlocked: true },
    ];
    const next = getNextReward(progress);
    assert.equal(next.reward.id, REWARDS[0].id);
    assert.equal(next.progress, 67);
  });

  it("returns null when all unlocked", () => {
    const progress = REWARDS.map((r) => ({
      reward: r,
      current: 100,
      target: 1,
      progress: 100,
      unlocked: true,
    }));
    assert.equal(getNextReward(progress), null);
  });

  it("returns null for empty array", () => {
    assert.equal(getNextReward([]), null);
  });
});

describe("getUnlockedCount", () => {
  it("counts unlocked rewards", () => {
    const progress = [
      { reward: REWARDS[0], current: 3, target: 3, progress: 100, unlocked: true },
      { reward: REWARDS[1], current: 15, target: 15, progress: 100, unlocked: true },
      { reward: REWARDS[2], current: 0, target: 5, progress: 0, unlocked: false },
    ];
    assert.equal(getUnlockedCount(progress), 2);
  });

  it("returns 0 for empty array", () => {
    assert.equal(getUnlockedCount([]), 0);
  });

  it("returns 0 when none unlocked", () => {
    const progress = REWARDS.map((r) => ({
      reward: r,
      current: 0,
      target: 10,
      progress: 0,
      unlocked: false,
    }));
    assert.equal(getUnlockedCount(progress), 0);
  });
});
