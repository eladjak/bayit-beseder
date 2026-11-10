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
let authImpl: () => Promise<{ data: { user: { id: string } | null }; error?: { status?: number; message: string } | null }>;
let cookiesThrow: boolean;

const FULL = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (cookiesThrow) throw new Error("cookies unavailable");
    return { getAll: () => (signedIn ? [{ name: "sb-proj-auth-token", value: "x" }] : []), set: () => undefined };
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => authImpl() },
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
    cookiesThrow = false;
    authImpl = async () => ({ data: { user: { id: "user-a" } }, error: null });
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

  it("AUTH LOOKUP RETURNS an error while a session cookie is present: refused (503), NOT continued as anonymous", async () => {
    authImpl = async () => ({ data: { user: null }, error: { status: 500, message: "auth server down" } });
    const { POST } = await import("../route");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("auth_unavailable");
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("AUTH LOOKUP THROWS while a session cookie is present: refused, provider NOT called", async () => {
    authImpl = async () => {
      throw new TypeError("fetch failed");
    };
    const { POST } = await import("../route");
    expect((await POST(req())).status).toBe(503);
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("an invalid or expired session (401 from auth) is refused with 401, not served as a demo user", async () => {
    authImpl = async () => ({ data: { user: null }, error: { status: 401, message: "invalid JWT" } });
    const { POST } = await import("../route");
    expect((await POST(req())).status).toBe(401);
    expect(geminiCalls).not.toHaveBeenCalled();
  });

  it("if even reading the cookies fails we cannot tell anonymous from signed in: refused", async () => {
    cookiesThrow = true;
    const { POST } = await import("../route");
    expect((await POST(req())).status).toBe(503);
    expect(geminiCalls).not.toHaveBeenCalled();
  });
});
