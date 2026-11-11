import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import EmergencyPage from "../page";

const state = vi.hoisted(() => ({
  mark: vi.fn(),
  undo: vi.fn(),
  today: vi.fn(),
  tasks: [] as Record<string, unknown>[],
}));
vi.mock("@/hooks/useCompletions", () => ({
  useCompletions: () => ({
    markComplete: state.mark,
    undoComplete: state.undo,
    isCompletedToday: state.today,
    loading: false,
  }),
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "he" }),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: () => {
      const query = {
        select: () => query,
        update: () => ({ eq: async () => ({ error: { message: "failed" } }) }),
        lte: () => query,
        eq: () => query,
        in: () => query,
        order: async () => ({ data: state.tasks }),
      };
      return query;
    },
  }),
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_NEW_UI", "true");
  localStorage.setItem("bayit-beseder-emergency-mode", "true");
  state.tasks = [
    {
      id: "one",
      title: "משימה",
      category_id: "general",
      due_date: "2020-01-01",
      status: "pending",
      recurring: "true",
    },
  ];
  state.mark.mockReset();
  state.undo.mockReset();
  state.today.mockReset().mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  localStorage.clear();
});
async function open() {
  render(<EmergencyPage />);
  return await screen.findByRole("checkbox", { name: /משימה/ });
}
describe("emergency completion", () => {
  it("excludes historical completed one-time tasks from list and progress", async () => {
    state.tasks.push({
      ...state.tasks[0],
      id: "old",
      title: "ישנה",
      status: "completed",
      recurring: "false",
    });
    await open();
    expect(screen.queryByText("ישנה")).toBeNull();
    expect(screen.getByText("0/1")).toBeTruthy();
  });
  it("uses honest completion even when the new design is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", "false");
    state.mark.mockResolvedValue(null);
    const box = await open();
    fireEvent.click(box);
    expect(await screen.findByText("לא הצלחנו לשמור. נסו שוב.")).toBeTruthy();
  });
  it("waits for confirmation and passes recurring", async () => {
    let finish!: (v: object) => void;
    state.mark.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const box = await open();
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect((box as HTMLButtonElement).disabled).toBe(true);
    finish({ id: "completion" });
    await waitFor(() => expect(box.getAttribute("aria-checked")).toBe("true"));
    expect(state.mark).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "one",
        userId: "user-1",
        recurring: true,
      }),
    );
  });
  it("reports failure and retries", async () => {
    state.mark
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "completion" });
    const box = await open();
    fireEvent.click(box);
    expect(await screen.findByText("לא הצלחנו לשמור. נסו שוב.")).toBeTruthy();
    expect(
      screen
        .getByText("לא הצלחנו לשמור. נסו שוב.")
        .closest("[aria-live]")
        ?.getAttribute("aria-live"),
    ).toBe("polite");
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    await waitFor(() => expect(state.mark).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(box.getAttribute("aria-checked")).toBe("true"));
  });
  it("keeps a row done when undo fails", async () => {
    state.today.mockReturnValue(true);
    state.undo.mockResolvedValue(false);
    const box = await open();
    expect(box.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(box);
    expect(await screen.findByText("לא הצלחנו לשמור. נסו שוב.")).toBeTruthy();
    expect(state.undo).toHaveBeenCalledWith("one");
    expect(box.getAttribute("aria-checked")).toBe("true");
  });
  it("restores recurring completion on remount", async () => {
    state.today.mockReturnValue(true);
    const box = await open();
    expect(box.getAttribute("aria-checked")).toBe("true");
    cleanup();
    expect((await open()).getAttribute("aria-checked")).toBe("true");
  });
  it("restores one-time status and only allows undo for today", async () => {
    state.tasks[0].status = "completed";
    state.tasks[0].recurring = "false";
    state.today.mockReturnValue(true);
    state.undo.mockResolvedValue(true);
    const todayBox = await open();
    expect((todayBox as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(todayBox);
    await waitFor(() =>
      expect(todayBox.getAttribute("aria-checked")).toBe("false"),
    );
    expect(state.undo).toHaveBeenCalledWith("one");
  });
  it("reports rejected saves and allows retry", async () => {
    state.mark
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce({ id: "completion" });
    const box = await open();
    fireEvent.click(box);
    expect(await screen.findByText("לא הצלחנו לשמור. נסו שוב.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    await waitFor(() => expect(state.mark).toHaveBeenCalledTimes(2));
  });
  it("sends only one request on rapid repeated clicks", async () => {
    state.mark.mockReturnValue(new Promise(() => {}));
    const box = await open();
    fireEvent.click(box);
    fireEvent.click(box);
    expect(state.mark).toHaveBeenCalledTimes(1);
  });
  it("explains an offline failure", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    state.mark.mockResolvedValue(null);
    const box = await open();
    fireEvent.click(box);
    expect(
      await screen.findByText("אין חיבור לאינטרנט. התחברו ונסו שוב."),
    ).toBeTruthy();
    vi.restoreAllMocks();
  });
  it("leaves other rows available while one save is pending", async () => {
    state.tasks.push({ ...state.tasks[0], id: "two", title: "שנייה" });
    state.mark.mockReturnValue(new Promise(() => {}));
    const box = await open();
    fireEvent.click(box);
    expect((box as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: "שנייה" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
