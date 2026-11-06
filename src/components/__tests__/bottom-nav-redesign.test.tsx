import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BottomNav } from "../bottom-nav";
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ locale: "he" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/shopping" }));
describe("main navigation", () => {
  it("links to all five destinations and marks the current page", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    expect(links.map(link => link.getAttribute("href"))).toEqual(["/dashboard", "/tasks", "/shopping", "/meals", "/more"]);
    expect(screen.getByRole("link", { name: "קניות" }).getAttribute("aria-current")).toBe("page");
    cleanup();
  });
});
