import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSupabaseMock } from "@/lib/meals/__tests__/supabaseMock";
import { makeMeal } from "@/lib/meals/__tests__/fixtures";

let mock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mock,
}));

const uuid = "22222222-2222-4222-8222-222222222222";

describe("GET /api/agent/prep", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.BAYIT_AGENT_KEY = "test-agent-key";
    mock = makeSupabaseMock({
      meals: [makeMeal({ id: "m1", household_id: uuid, name: "עוף בתנור", prep_lead_hours: 12 })],
      meal_plan: [],
    });
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("401s without a Bearer token", async () => {
    const { GET } = await import("../prep/route");
    const res = await GET(new Request(`http://x/api/agent/prep?householdId=${uuid}`) as never);
    expect(res.status).toBe(401);
  });

  it("403s with the wrong token", async () => {
    const { GET } = await import("../prep/route");
    const res = await GET(
      new Request(`http://x/api/agent/prep?householdId=${uuid}`, {
        headers: { Authorization: "Bearer wrong-key" },
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("400s without a valid householdId", async () => {
    const { GET } = await import("../prep/route");
    const res = await GET(
      new Request("http://x/api/agent/prep", {
        headers: { Authorization: "Bearer test-agent-key" },
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns tonightPrep + a ready whatsappText with a valid token and household", async () => {
    const { GET } = await import("../prep/route");
    const res = await GET(
      new Request(`http://x/api/agent/prep?householdId=${uuid}`, {
        headers: { Authorization: "Bearer test-agent-key" },
      }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tonightPrep)).toBe(true);
    expect(typeof body.whatsappText).toBe("string");
    expect(body.meta.householdId).toBe(uuid);
  });
});
