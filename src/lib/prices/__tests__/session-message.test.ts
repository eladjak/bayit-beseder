import { describe, it, expect, vi } from "vitest";

// Logged-out request: no user. The message must talk about price comparison,
// not the meal planner (the household resolver is shared between both).
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

describe("price API, logged-out message", () => {
  it("401 message is about price comparison, not the meal planner", async () => {
    const { requirePriceSession } = await import("../session");
    const r = await requirePriceSession();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(401);
    const body = (await r.response.json()) as { error: string };
    expect(body.error).toBe("יש להתחבר כדי להשתמש בהשוואת המחירים.");
    expect(body.error).not.toContain("מתכנן הארוחות");
  });

  it("meal planner keeps its own message", async () => {
    const { resolveHousehold } = await import("@/lib/meals/session");
    const { createClient } = await import("@/lib/supabase/server");
    const r = await resolveHousehold(await createClient());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("יש להתחבר כדי להשתמש במתכנן הארוחות.");
  });
});
