import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ auth: true, meals: new Map<string, Record<string, unknown>>(), plans: new Map<string, Record<string, unknown>>(), failPlan: false }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from(table: string) {
  return {
    async upsert(rows: Record<string, unknown>[]) {
      if (table === "meal_plan" && state.failPlan) { state.failPlan = false; return { error: { message: "failed" } }; }
      const target = table === "meals" ? state.meals : state.plans;
      for (const row of rows) { const key = table === "meals" ? String(row.id) : `${row.household_id}:${row.plan_date}`; if (!target.has(key)) target.set(key, row); }
      return { error: null };
    },
    select() { return { eq(_key: string, household: string) { return { async in(_column: string, dates: string[]) { return { data: [...state.plans.values()].filter(row => row.household_id === household && dates.includes(String(row.plan_date))), error: null }; } }; } }; }
  };
} }) }));
vi.mock("@/lib/meals/session", () => ({ resolveHousehold: async () => state.auth ? { ok: true, householdId: "house-a", userId: "user-a" } : { ok: false, status: 401, error: "login" } }));
import { POST } from "../route";
const payload = { week: [0,1,2,3,4,5,6], servings: 2, weekStart: "2026-11-01" };
const call = (body: unknown = payload) => POST(new Request("http://localhost/api/first-week", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => { state.auth = true; state.failPlan = false; state.meals.clear(); state.plans.clear(); });
describe("first week save", () => {
  it("requires authentication and validates dates", async () => { state.auth = false; expect((await call()).status).toBe(401); state.auth = true; expect((await call({ ...payload, weekStart: "2026-11-02" })).status).toBe(400); expect(state.meals.size).toBe(0); });
  it("retries partial failure without duplicate meals and isolates household", async () => { state.failPlan = true; expect((await call()).status).toBe(500); expect(state.meals.size).toBe(7); expect((await call()).status).toBe(200); expect((await call()).status).toBe(200); expect(state.meals.size).toBe(7); expect(state.plans.size).toBe(7); expect([...state.plans.values()].every(r => r.household_id === "house-a")).toBe(true); });
  it("preserves an existing day and reports it", async () => { state.plans.set("house-a:2026-11-01", { household_id: "house-a", plan_date: "2026-11-01", meal_id: "existing" }); const res = await call(); expect(await res.json()).toEqual({ matched: 6, preserved: 1 }); expect(state.plans.get("house-a:2026-11-01")?.meal_id).toBe("existing"); });
});
