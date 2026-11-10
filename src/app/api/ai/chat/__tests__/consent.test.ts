/**
 * The AI chat endpoint sends the person's text to Google. For a signed-in user
 * it must NEVER do that without a current consent record, in particular not
 * when the consent lookup itself fails or throws (it used to fall through to
 * "demo mode" inside a broad try/catch).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";

type Lookup = () => Promise<{ data: unknown; error: { message: string } | null }>;
let lookup: Lookup;
let signedIn: boolean;

const FULL = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => undefined }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "user-a" } : null } }) },
    from(table: string) {
      const b = {
        select: () => b,
        eq: () => b,
        in: () => b,
        order: () => b,
        limit: () => b,
        maybeSingle: () => (table === "privacy_consents" ? lookup() : Promise.resolve({ data: null, error: null })),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      };
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 99, remaining: 98, reset: 1000 }) }),
  getClientIp: () => "1.2.3.4",
}));
vi.mock("@/lib/prices/assistant-context", () => ({ buildPriceContext: async () => null }));

const geminiCalls = vi.fn();

function req() {
  return new Request("http://x/api/ai/chat", { method: "POST", body: JSON.stringify({ message: "hello" }) }) as never;
}

describe("POST /api/ai/chat privacy gate", () => {
  beforeEach(() => {
    signedIn = true;
    lookup = async () => ({ data: FULL, error: null });
    geminiCalls.mockReset();
    process.env.GEMINI_API_KEY = "test-placeholder";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-placeholder";
    vi.stubGlobal("fetch", async (...args: unknown[]) => {
      geminiCalls(...args);
      return new Response('data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}\n', { status: 200 });
    });
  });

  it("control: with consent the request reaches the AI provider exactly once", async () => {
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(geminiCalls).toHaveBeenCalledTimes(1);
  });

  it("no consent record: 403 consent_required, the provider is NOT called", async () => {
    lookup = async () => ({ data: null, error: null });
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("consent_required");
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("lookup RETURNS an error: refused (503 consent_unavailable), provider NOT called", async () => {
    lookup = async () => ({ data: null, error: { message: "relation does not exist" } });
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("consent_unavailable");
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("lookup THROWS: refused, provider NOT called (red before the fix: it fell through to demo mode and called the provider)", async () => {
    lookup = async () => {
      throw new TypeError("fetch failed");
    };
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("signed out: the existing demo mode is unchanged (no consent to check)", async () => {
    signedIn = false;
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Auth")).toBe("demo");
  });
});
