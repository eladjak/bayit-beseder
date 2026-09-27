import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/lib/meals/__tests__/supabaseMock";
import { makeMeal } from "@/lib/meals/__tests__/fixtures";

let mock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock,
}));

function patchRequest(body: unknown) {
  return new Request("http://x/api/meals/plan/day", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as never;
}

describe("PATCH /api/meals/plan/day", () => {
  beforeEach(() => {
    mock = makeSupabaseMock({
      profiles: [{ household_id: "house-1" }],
      meals: [makeMeal({ id: "m1" }), makeMeal({ id: "m2" })],
      meal_plan: [
        { household_id: "house-1", plan_date: "2026-09-27", meal_id: "a", status: "planned" },
        { household_id: "house-1", plan_date: "2026-09-28", meal_id: "b", status: "planned" },
        { household_id: "house-1", plan_date: "2026-09-29", meal_id: "c", status: "planned" },
        { household_id: "house-1", plan_date: "2026-09-30", meal_id: "d", status: "planned" },
        { household_id: "house-1", plan_date: "2026-10-01", meal_id: "e", status: "planned" },
        { household_id: "house-1", plan_date: "2026-10-02", meal_id: "f", status: "planned" },
        { household_id: "house-1", plan_date: "2026-10-03", meal_id: "g", status: "planned" },
      ],
    });
  });

  it("setMeal swaps the day's meal", async () => {
    const { PATCH } = await import("../plan/day/route");
    const uuid = "11111111-1111-4111-8111-111111111111";
    const res = await PATCH(patchRequest({ date: "2026-09-27", action: "setMeal", mealId: uuid }));
    expect(res.status).toBe(200);
    const call = mock.__calls.find((c) => c.table === "meal_plan" && c.op === "update");
    expect(call?.args[0]).toMatchObject({ meal_id: uuid, status: "planned" });
  });

  it("cooked marks the day as cooked", async () => {
    const { PATCH } = await import("../plan/day/route");
    const res = await PATCH(patchRequest({ date: "2026-09-27", action: "cooked" }));
    expect(res.status).toBe(200);
    const call = mock.__calls.find((c) => c.table === "meal_plan" && c.op === "update");
    expect(call?.args[0]).toMatchObject({ status: "cooked" });
  });

  it("leftovers shifts the rest of the week forward by one day", async () => {
    const { PATCH } = await import("../plan/day/route");
    const res = await PATCH(patchRequest({ date: "2026-09-28", action: "leftovers" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shifted).toBeDefined();
    const byDate = new Map(body.shifted.map((d: { date: string; mealId: string | null; status: string }) => [d.date, d]));
    expect(byDate.get("2026-09-28")).toMatchObject({ mealId: null, status: "leftovers" });
    expect(byDate.get("2026-09-29")).toMatchObject({ mealId: "b" }); // absorbed 09-28's old meal
  });

  it("rejects an invalid date", async () => {
    const { PATCH } = await import("../plan/day/route");
    const res = await PATCH(patchRequest({ date: "not-a-date", action: "cooked" }));
    expect(res.status).toBe(400);
  });
});
