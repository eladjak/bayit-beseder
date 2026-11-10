import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: vi.fn(async () => ({ error: null })), getUser: vi.fn(async () => ({ data: { user: null } })) } })) }));
import { GET } from "../route";
afterEach(() => vi.unstubAllEnvs());
describe("callback next", () => {
  it.each([["@evil.example", "https://app.example/dashboard"], ["/shopping", "https://app.example/shopping"]])("validates %s", async (next, expected) => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", "true");
    const request = new Request(`https://app.example/callback?code=ok&next=${encodeURIComponent(next)}`);
    expect((await GET(request)).headers.get("location")).toBe(expected);
  });
  it("preserves existing behavior when the switch is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_NEW_UI", "false");
    expect((await GET(new Request("https://app.example/callback?code=ok&next=%2Fshopping"))).headers.get("location")).toBe("https://app.example/shopping");
  });
});
