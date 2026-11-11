/**
 * Cron jobs act for households without a signed-in person. They must skip every household in
 * which any member has not accepted the current policy, and must return counts only (no ids).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POLICY_VERSION } from "@/lib/privacy/policy";

const FULL = { policy_version: POLICY_VERSION, age_confirmed: true, privacy_accepted: true, terms_accepted: true };

interface Db {
  households: { id: string }[];
  household_members: { household_id: string; user_id: string }[];
  profiles: { id: string; household_id: string | null }[];
  privacy_consents: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  failConsents?: boolean;
}
let db: Db;
const seenTaskFilters: unknown[][] = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: string) {
      let rows: Record<string, unknown>[] = ((db as unknown as Record<string, Record<string, unknown>[]>)[table] ?? []).slice();
      const b = {
        select: () => b,
        order: () => b,
        range: () => b,
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), b),
        neq: () => b,
        lt: () => b,
        limit: () => b,
        single: async () => ({ data: rows[0] ?? null, error: null }),
        not: (c: string, _o: string, v: unknown) => ((rows = rows.filter((r) => r[c] !== v)), b),
        in: (c: string, vs: unknown[]) => {
          if (table === "tasks") seenTaskFilters.push([c, vs]);
          rows = rows.filter((r) => vs.includes(r[c]));
          return b;
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(db.failConsents && table === "privacy_consents" ? { data: null, error: { message: "x" } } : { data: rows, error: null }).then(res, rej),
      };
      return b;
    },
  }),
}));

const planned: string[][] = [];
vi.mock("@/lib/auto-scheduler", async (orig) => ({
  ...(await orig<typeof import("@/lib/auto-scheduler")>()),
  runNightlyPlannerForHouseholds: async (_db: unknown, ids: string[]) => {
    planned.push(ids);
    return {
      results: ids.map((id) => ({ householdId: id, movedToday: 1, movedLater: 0, flaggedForReview: 0, errors: [] })),
      summary: { householdsProcessed: ids.length, tasksMovedToday: ids.length, tasksMovedLater: 0, tasksFlaggedForReview: 0, errors: [] },
    };
  },
}));
const sendWhatsAppMessage = vi.fn(async () => ({ success: true }));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppMessage }));

const SECRET = `t${Math.random().toString(36).slice(2)}`; // generated at run time: no key-shaped literal is committed
const req = () => new Request("http://x.example/api/cron", { headers: { authorization: `Bearer ${SECRET}` } }) as never;

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = `t${Math.random().toString(36).slice(2)}`;
  process.env.WHATSAPP_PHONES = "972500000000";
  planned.length = 0;
  seenTaskFilters.length = 0;
  sendWhatsAppMessage.mockClear();
  db = {
    households: [{ id: "h-all" }, { id: "h-partial" }, { id: "h-none" }],
    household_members: [
      { household_id: "h-all", user_id: "a1" },
      { household_id: "h-all", user_id: "a2" },
      { household_id: "h-partial", user_id: "p1" },
      { household_id: "h-partial", user_id: "p2" },
      { household_id: "h-none", user_id: "n1" },
    ],
    profiles: [],
    privacy_consents: [{ user_id: "a1", ...FULL }, { user_id: "a2", ...FULL }, { user_id: "p1", ...FULL }],
    tasks: [],
  };
});

describe("GET /api/cron/auto-schedule privacy gate", () => {
  it("processes only households in which EVERY member consented, and returns counts only", async () => {
    const { GET } = await import("../auto-schedule/route");
    const res = await GET(req());
    const body = await res.json();
    expect(planned).toEqual([["h-all"]]);
    expect(body).toMatchObject({ householdsProcessed: 1, householdsSkippedNoConsent: 2, errorCount: 0 });
    // counts only: no per-household results, no ids anywhere in the response
    expect(body.results).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/h-all|h-partial|h-none/);
  });

  it("a household with one unconsented member (p2) is skipped even though p1 consented", async () => {
    const { GET } = await import("../auto-schedule/route");
    await GET(req());
    expect(planned.flat()).not.toContain("h-partial");
  });

  it("fails closed: if consent cannot be read, NO household is processed", async () => {
    db.failConsents = true;
    const { GET } = await import("../auto-schedule/route");
    const body = await (await GET(req())).json();
    expect(planned).toEqual([[]]);
    expect(body.householdsProcessed).toBe(0);
    expect(body.householdsSkippedNoConsent).toBe(3);
  });
});

describe("GET /api/cron/daily-brief privacy gate", () => {
  it("with no fully consented household it sends nothing", async () => {
    db.privacy_consents = [];
    const { GET } = await import("../daily-brief/route");
    const res = await GET(req());
    expect((await res.json()).message).toMatch(/full consent/);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("task queries are restricted to the fully consented households only", async () => {
    const { GET } = await import("../daily-brief/route");
    await GET(req());
    expect(seenTaskFilters.length).toBeGreaterThan(0);
    for (const [col, ids] of seenTaskFilters) {
      expect(col).toBe("household_id");
      expect(ids).toEqual(["h-all"]);
    }
  });
});
