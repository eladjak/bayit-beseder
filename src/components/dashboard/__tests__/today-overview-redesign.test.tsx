import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { TodayOverview } from "../today-overview";

vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
const task = { id: "1", title: "מדיח", category: "kitchen", estimated_minutes: 0, completed: false };

describe("TodayOverview completion", () => {
  it("rolls back a rejected completion and does not offer undo", async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error("failed"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TodayOverview tasks={[task]} onToggle={onToggle} single />);
    fireEvent.click(screen.getByRole("button", { name: /tasks.markComplete/ }));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(screen.getByRole("button", { name: /tasks.markComplete/ }).getAttribute("aria-pressed")).toBe("false"));
    cleanup();
    render(<TodayOverview tasks={[{ ...task, completed: true }]} onToggle={onToggle} single />);
    expect(screen.getByRole("button", { name: /הושלמה/ }).hasAttribute("disabled")).toBe(true);
    error.mockRestore();
    cleanup();
  });
});
