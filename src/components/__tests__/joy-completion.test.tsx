import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { JoyCompletion, isConfirmedCompletion } from "../joy-completion";

const confetti = vi.hoisted(() => vi.fn());
vi.mock("canvas-confetti", () => ({ default: confetti }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("completion acknowledgement", () => {
  it("only accepts a server-confirmed completion", () => {
    expect(isConfirmedCompletion(null)).toBe(false);
    expect(isConfirmedCompletion({ id: "offline-123" })).toBe(false);
    expect(isConfirmedCompletion({ id: "server-123" })).toBe(true);
  });

  it("shows a text acknowledgement without confetti for reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<JoyCompletion confirmation={1} message="כל הכבוד" />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("כל הכבוד"));
    expect(confetti).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
