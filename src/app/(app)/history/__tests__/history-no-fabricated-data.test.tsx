import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TaskRow, TaskCompletionRow } from "@/lib/types/database";

/**
 * The history page is a PERSONAL RECORD. It must never present invented
 * entries as the user's own activity.
 *
 * Until 2026-08-07 this page fell back to `buildMockHistory()` — eight
 * hard-coded Hebrew chores — whenever the user had zero completions. A
 * brand-new user's very first view of their history was therefore fabricated,
 * rendered through the identical code path as real data and carrying no label.
 *
 * These two arms are deliberately paired:
 *   ARM A (empty)  — proves the fabricated rows are gone.
 *   ARM B (real)   — proves removing them did not break real history.
 * Arm A alone would also pass on a page that renders nothing at all, so it is
 * not evidence on its own.
 */

const mockState = {
  tasks: [] as TaskRow[],
  completions: [] as TaskCompletionRow[],
  loading: false,
};

vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({
    tasks: mockState.tasks,
    loading: mockState.loading,
    error: null,
  }),
}));

vi.mock("@/hooks/useCompletions", () => ({
  useCompletions: () => ({
    completions: mockState.completions,
    loading: mockState.loading,
  }),
}));

vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ categoryMap: { "cat-kitchen": "kitchen" } }),
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/voice-input-button", () => ({
  VoiceInputButton: () => null,
}));

import HistoryPage from "../page";

/** The eight fabricated titles that used to be shown to new users. */
const FABRICATED_TITLES = [
  "שטיפת כלים",
  "ניקוי אמבטיה",
  "כביסה",
  "האכלת חתולים",
  "ניקוי סלון",
  "הוצאת אשפה",
  "ניקוי מקרר",
  "ניקוי חדר שינה",
];

function makeTask(id: string, title: string): TaskRow {
  return {
    id,
    household_id: "h1",
    title,
    description: null,
    category_id: "cat-kitchen",
    assigned_to: null,
    status: "completed",
    due_date: null,
    points: 10,
    recurring: false,
    created_at: new Date().toISOString(),
  } as TaskRow;
}

function makeCompletion(id: string, taskId: string): TaskCompletionRow {
  return {
    id,
    task_id: taskId,
    user_id: "u1",
    completed_at: new Date().toISOString(),
    photo_url: null,
    notes: null,
  } as TaskCompletionRow;
}

describe("history page — never fabricates the user's own history", () => {
  beforeEach(() => {
    mockState.tasks = [];
    mockState.completions = [];
    mockState.loading = false;
  });

  it("ARM A: a user with ZERO completions sees the empty state and no invented entries", () => {
    render(<HistoryPage />);

    // The real empty state is reachable (it previously was not).
    expect(screen.getByText("history.emptyTitle")).toBeDefined();
    // ...and offers one clear next action.
    expect(screen.getByText("history.emptyCta")).toBeDefined();

    // No history list is rendered at all — the strongest statement available.
    //
    // NOTE ON SCOPE: an earlier version of this test scanned document.body for
    // the fabricated titles and failed, because "כביסה" is ALSO a legitimate
    // category/zone label rendered in the filter chips (src/lib/seed-data.ts).
    // A whole-body substring scan cannot distinguish a fabricated history row
    // from a real category chip, so the assertion is scoped to the list.
    expect(screen.queryByTestId("history-list")).toBeNull();

    // Record count must be honest.
    expect(document.body.textContent ?? "").toContain("0 רשומות");
  });

  it("ARM B: a user WITH real completions still sees them (removal broke nothing)", () => {
    mockState.tasks = [makeTask("t1", "ניקוי המרפסת"), makeTask("t2", "השקיית הצמחים")];
    mockState.completions = [makeCompletion("c1", "t1"), makeCompletion("c2", "t2")];

    render(<HistoryPage />);

    const list = screen.getByTestId("history-list");
    expect(list).toBeDefined();
    expect(screen.getByText("ניקוי המרפסת")).toBeDefined();
    expect(screen.getByText("השקיית הצמחים")).toBeDefined();

    // Real data present => empty state must NOT be shown.
    expect(screen.queryByText("history.emptyTitle")).toBeNull();

    // Scoped to the LIST (not document.body) so category chips cannot be
    // mistaken for fabricated rows. Catches a regression that merges mock
    // entries in alongside real ones.
    const listText = list.textContent ?? "";
    for (const title of FABRICATED_TITLES) {
      expect(listText.includes(title)).toBe(false);
    }

    expect(document.body.textContent ?? "").toContain("2 רשומות");
  });
});
