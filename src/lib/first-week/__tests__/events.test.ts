import { describe, it, expect, vi } from "vitest";
import { firstWeekEvent } from "../events";
import { recipeId } from "../recipe-id";
describe("first week privacy and retry keys", () => {
  it("sends only fixed variant and coarse duration", () => {
    const plausible = vi.fn();
    (window as unknown as { plausible: typeof plausible }).plausible = plausible;
    firstWeekEvent("ready", "solo", 14200);
    expect(plausible).toHaveBeenCalledWith("first_week_ready", { props: { variant: "solo", duration: "10-29s" } });
  });
  it("uses stable per-household recipe identifiers across retries", () => {
    expect(recipeId("home-a", 1, 2)).toBe(recipeId("home-a", 1, 2));
    expect(recipeId("home-a", 1, 2)).not.toBe(recipeId("home-b", 1, 2));
    expect(recipeId("home-a", 1, 2)).not.toBe(recipeId("home-a", 1, 3));
  });
});
