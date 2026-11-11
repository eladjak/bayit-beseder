import { expect, it } from "vitest";
import { householdAllowsNewUi } from "../ui-flag";

it("enables only when an allowlist row exists", () => {
  expect(householdAllowsNewUi(null)).toBe(false);
  expect(householdAllowsNewUi({ household_id: "household-a" })).toBe(true);
});
