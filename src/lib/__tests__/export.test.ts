/**
 * Unit tests for CSV export utilities.
 * Tests UTF-8 BOM, Hebrew characters, empty data, and column headers.
 */

import { describe, it, expect } from "vitest";
import {
  exportTasksToCSV,
  exportCompletionsToCSV,
  type ExportTask,
  type ExportCompletion,
} from "@/lib/export";

// ── Helpers ────────────────────────────────────────────────────────────────────

const UTF8_BOM = "\uFEFF";

function makeTask(overrides: Partial<ExportTask> = {}): ExportTask {
  return {
    id: "task-1",
    title: "שטיפת כלים",
    category: "kitchen",
    recurring: true,
    status: "completed",
    due_date: "2026-03-30",
    created_at: "2026-01-01T10:00:00Z",
    ...overrides,
  };
}

function makeCompletion(overrides: Partial<ExportCompletion> = {}): ExportCompletion {
  return {
    task_id: "task-1",
    task_title: "שטיפת כלים",
    completed_at: "2026-03-30T14:30:00Z",
    user_name: "אלעד",
    ...overrides,
  };
}

// ── exportTasksToCSV ────────────────────────────────────────────────────────────

describe("exportTasksToCSV — UTF-8 BOM", () => {
  it("starts with the UTF-8 BOM character", () => {
    const csv = exportTasksToCSV([makeTask()]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });
});

describe("exportTasksToCSV — column headers", () => {
  it("includes all 6 Hebrew column headers", () => {
    const csv = exportTasksToCSV([]);
    const headerRow = csv.slice(UTF8_BOM.length).split("\n")[0];
    expect(headerRow).toContain("שם משימה");
    expect(headerRow).toContain("קטגוריה");
    expect(headerRow).toContain("תדירות");
    expect(headerRow).toContain("סטטוס");
    expect(headerRow).toContain("תאריך יעד");
    expect(headerRow).toContain("נוצר ב");
  });
});

describe("exportTasksToCSV — empty data", () => {
  it("returns only the header row when tasks is empty", () => {
    const csv = exportTasksToCSV([]);
    const lines = csv.slice(UTF8_BOM.length).split("\n").filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });
});

describe("exportTasksToCSV — Hebrew content", () => {
  it("includes Hebrew task title in output", () => {
    const csv = exportTasksToCSV([makeTask({ title: "ניקוי בית" })]);
    expect(csv).toContain("ניקוי בית");
  });

  it("translates recurring=true to 'חוזר'", () => {
    const csv = exportTasksToCSV([makeTask({ recurring: true })]);
    expect(csv).toContain("חוזר");
  });

  it("translates recurring=false to 'חד פעמי'", () => {
    const csv = exportTasksToCSV([makeTask({ recurring: false })]);
    expect(csv).toContain("חד פעמי");
  });

  it("translates status 'completed' to Hebrew 'הושלם'", () => {
    const csv = exportTasksToCSV([makeTask({ status: "completed" })]);
    expect(csv).toContain("הושלם");
  });

  it("uses 'כללי' as fallback when category is null", () => {
    const csv = exportTasksToCSV([makeTask({ category: null })]);
    expect(csv).toContain("כללי");
  });

  it("includes the date portion of created_at (YYYY-MM-DD)", () => {
    const csv = exportTasksToCSV([makeTask({ created_at: "2026-01-15T08:00:00Z" })]);
    expect(csv).toContain("2026-01-15");
  });
});

// ── exportCompletionsToCSV ──────────────────────────────────────────────────────

describe("exportCompletionsToCSV — UTF-8 BOM", () => {
  it("starts with the UTF-8 BOM character", () => {
    const csv = exportCompletionsToCSV([makeCompletion()]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });
});

describe("exportCompletionsToCSV — column headers", () => {
  it("includes all 3 Hebrew column headers", () => {
    const csv = exportCompletionsToCSV([]);
    const headerRow = csv.slice(UTF8_BOM.length).split("\n")[0];
    expect(headerRow).toContain("שם משימה");
    expect(headerRow).toContain("תאריך השלמה");
    expect(headerRow).toContain("מבצע");
  });
});

describe("exportCompletionsToCSV — empty data", () => {
  it("returns only the header row when completions is empty", () => {
    const csv = exportCompletionsToCSV([]);
    const lines = csv.slice(UTF8_BOM.length).split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});

describe("exportCompletionsToCSV — data rows", () => {
  it("includes Hebrew user name in output", () => {
    const csv = exportCompletionsToCSV([makeCompletion({ user_name: "ענבל" })]);
    expect(csv).toContain("ענבל");
  });

  it("falls back to task_id when task_title is missing", () => {
    const csv = exportCompletionsToCSV([makeCompletion({ task_title: undefined, task_id: "task-xyz" })]);
    expect(csv).toContain("task-xyz");
  });

  it("formats completed_at as 'YYYY-MM-DD HH:MM' (space-separated)", () => {
    const csv = exportCompletionsToCSV([makeCompletion({ completed_at: "2026-03-30T14:30:00Z" })]);
    expect(csv).toContain("2026-03-30 14:30");
  });
});
