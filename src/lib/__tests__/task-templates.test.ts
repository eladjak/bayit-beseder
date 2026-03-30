/**
 * Unit tests for TASK_TEMPLATES data.
 * Validates required fields, no duplicate titles within a template,
 * and valid category/frequency values.
 */

import { describe, it, expect } from "vitest";
import { TASK_TEMPLATES, type TaskTemplate } from "@/lib/task-templates";

const VALID_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

describe("TASK_TEMPLATES — array integrity", () => {
  it("exports an array of exactly 5 templates", () => {
    expect(Array.isArray(TASK_TEMPLATES)).toBe(true);
    expect(TASK_TEMPLATES).toHaveLength(5);
  });

  it("each template has a unique id", () => {
    const ids = TASK_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(TASK_TEMPLATES.length);
  });
});

describe("TASK_TEMPLATES — required fields on every template", () => {
  it.each(TASK_TEMPLATES)("template '$id' has id, name, icon, description, and tasks", (template: TaskTemplate) => {
    expect(typeof template.id).toBe("string");
    expect(template.id.length).toBeGreaterThan(0);
    expect(typeof template.name).toBe("string");
    expect(template.name.length).toBeGreaterThan(0);
    expect(typeof template.icon).toBe("string");
    expect(template.icon.length).toBeGreaterThan(0);
    expect(typeof template.description).toBe("string");
    expect(template.description.length).toBeGreaterThan(0);
    expect(Array.isArray(template.tasks)).toBe(true);
    expect(template.tasks.length).toBeGreaterThan(0);
  });
});

describe("TASK_TEMPLATES — no duplicate task titles within a template", () => {
  it.each(TASK_TEMPLATES)("template '$id' has unique task titles", (template: TaskTemplate) => {
    const titles = template.tasks.map((t) => t.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});

describe("TASK_TEMPLATES — task fields validity", () => {
  it.each(TASK_TEMPLATES)("all tasks in '$id' have valid frequency values", (template: TaskTemplate) => {
    for (const task of template.tasks) {
      expect(VALID_FREQUENCIES).toContain(task.frequency);
    }
  });

  it.each(TASK_TEMPLATES)("all tasks in '$id' have positive minutes", (template: TaskTemplate) => {
    for (const task of template.tasks) {
      expect(task.minutes).toBeGreaterThan(0);
    }
  });

  it.each(TASK_TEMPLATES)("all tasks in '$id' have a non-empty category", (template: TaskTemplate) => {
    for (const task of template.tasks) {
      expect(typeof task.category).toBe("string");
      expect(task.category.length).toBeGreaterThan(0);
    }
  });

  it.each(TASK_TEMPLATES)("all tasks in '$id' have recurring as boolean", (template: TaskTemplate) => {
    for (const task of template.tasks) {
      expect(typeof task.recurring).toBe("boolean");
    }
  });
});
