import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<[string, unknown[]]> = [];
function makeChain() {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (res: (v: unknown) => void) => res({ data: [], error: null });
        return (...args: unknown[]) => {
          calls.push([String(prop), args]);
          return proxy;
        };
      },
    }
  );
  return proxy;
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => makeChain() }));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppMessage: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToAll: vi.fn() }));

const dueDateFilters = () =>
  calls.filter(([m, a]) => m === "eq" && a[0] === "due_date").map(([, a]) => a[1]);

// 2026-10-01T22:30Z = 01:30 on 2.10 in Israel.
describe("cron routes use the Israeli date for due_date", () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.CRON_SECRET = "s";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://x";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    process.env.WHATSAPP_PHONES = "972500000000";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T22:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const req = () =>
    new Request("http://x/api/cron", { headers: { authorization: "Bearer s" } }) as never;

  it("daily-brief", async () => {
    const { GET } = await import("../daily-brief/route");
    await GET(req());
    expect(dueDateFilters()).toContain("2026-10-02");
    expect(dueDateFilters()).not.toContain("2026-10-01");
  });

  it("daily-summary", async () => {
    const { GET } = await import("../daily-summary/route");
    await GET(req());
    expect(dueDateFilters()).toContain("2026-10-02");
    expect(dueDateFilters()).not.toContain("2026-10-01");
  });
});
