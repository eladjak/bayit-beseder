import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/lib/meals/__tests__/supabaseMock";
import { makeMeal } from "@/lib/meals/__tests__/fixtures";

let mock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock,
}));

describe("GET /api/meals/plan", () => {
  beforeEach(() => {
    mock = makeSupabaseMock({
      profiles: [{ household_id: "house-1" }],
      meals: [
        makeMeal({ id: "m1", household_id: "house-1", name: "עוף" }),
        makeMeal({ id: "m2", household_id: "house-1", name: "פסטה" }),
      ],
      meal_plan: [],
    });
  });

  it("401s when not signed in", async () => {
    mock = makeSupabaseMock({}, { authError: true });
    const { GET } = await import("../plan/route");
    const res = await GET(new Request("http://x/api/meals/plan") as never);
    expect(res.status).toBe(401);
  });

  it("generates and returns 7 days, persisting the missing ones", async () => {
    const { GET } = await import("../plan/route");
    const res = await GET(
      new Request("http://x/api/meals/plan?weekStart=2026-09-27") as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weekStart).toBe("2026-09-27");
    expect(body.days).toHaveLength(7);
    // All 7 newly-generated days should have been persisted.
    expect(mock.__inserted.meal_plan).toHaveLength(7);
  });

  it("does not re-insert days that already exist in meal_plan", async () => {
    mock.__responses.meal_plan.push({
      household_id: "house-1",
      meal_id: "m1",
      plan_date: "2026-09-27",
      status: "cooked",
      note: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    const { GET } = await import("../plan/route");
    const res = await GET(
      new Request("http://x/api/meals/plan?weekStart=2026-09-27") as never
    );
    const body = await res.json();
    expect(body.days[0]).toMatchObject({ date: "2026-09-27", mealId: "m1", status: "cooked" });
    // Only the remaining 6 days should have been generated+persisted.
    expect(mock.__inserted.meal_plan).toHaveLength(6);
  });
});
