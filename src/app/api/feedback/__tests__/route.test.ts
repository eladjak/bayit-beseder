/**
 * Tests for POST /api/feedback — auth, validation, rate limit, happy path.
 * Supabase and the rate limiter are faked; no real DB or Redis.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let user: { id: string } | null;
let limiterOk: boolean;
let inserted: Record<string, unknown>[];
let insertError: { code: string } | null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from(table: string) {
      if (table === "household_members") {
        const b = {
          select: () => b,
          eq: () => b,
          limit: () => b,
          maybeSingle: async () => ({ data: { household_id: "house-1" }, error: null }),
        };
        return b;
      }
      if (table === "app_feedback") {
        return {
          insert: async (row: Record<string, unknown>) => {
            inserted.push(row);
            return { error: insertError };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({
    check: async () => ({ success: limiterOk, limit: 5, remaining: 0, reset: 1000 }),
  }),
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "../route";

function req(body: unknown) {
  return new Request("http://x/api/feedback", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as never;
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    user = { id: "user-1" };
    limiterOk = true;
    inserted = [];
    insertError = null;
  });

  it("401 without a user", async () => {
    user = null;
    const res = await POST(req({ rating: 5 }));
    expect(res.status).toBe(401);
    expect(inserted).toHaveLength(0);
  });

  it.each([0, 6])("400 on rating %i", async (rating) => {
    const res = await POST(req({ rating }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("400 on a 2001-char message", async () => {
    const res = await POST(req({ rating: 3, message: "א".repeat(2001) }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("429 when the limiter refuses", async () => {
    limiterOk = false;
    const res = await POST(req({ rating: 4 }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
    expect(inserted).toHaveLength(0);
  });

  it("200 and inserts the right row", async () => {
    const res = await POST(req({ rating: 4, message: "  מעולה  ", page: "/settings" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(inserted).toEqual([
      {
        user_id: "user-1",
        household_id: "house-1",
        rating: 4,
        message: "מעולה",
        page: "/settings",
        app_version: null,
      },
    ]);
  });
});
