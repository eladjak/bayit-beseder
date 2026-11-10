import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ILLUSTRATIONS } from "@/lib/illustrations";
import { Illustration } from "../Illustration";

const state = vi.hoisted(() => ({ locale: "he" }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => state }));

describe("Illustration", () => {
  it("selects localized alt and responsive variants while reserving the aspect ratio", () => {
    state.locale = "he";
    const { rerender } = render(<Illustration id="emptyTasks" sizes="100vw" />);
    const img = screen.getByRole("img", { name: ILLUSTRATIONS.emptyTasks.alt.he });
    expect(img.getAttribute("width")).toBe(String(ILLUSTRATIONS.emptyTasks.width));
    expect(img.getAttribute("height")).toBe(String(ILLUSTRATIONS.emptyTasks.height));
    expect(img.getAttribute("srcset")).toContain("-480.webp 480w");
    expect(img.getAttribute("srcset")).toContain("-960.webp 960w");
    expect(img.getAttribute("sizes")).toBe("100vw");
    state.locale = "en";
    rerender(<Illustration id="emptyTasks" sizes="100vw" />);
    expect(screen.getByRole("img", { name: ILLUSTRATIONS.emptyTasks.alt.en })).toBeTruthy();
    rerender(<Illustration id="emptyTasks" sizes="100vw" decorative priority />);
    expect(document.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(document.querySelector("img")?.getAttribute("fetchpriority")).toBe("high");
  });
});
