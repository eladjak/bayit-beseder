/**
 * Named agent identity (migration 030).
 *
 * Properties: key works / no key / wrong key / revoked key; a named agent write is audited
 * with the agent name; delete and send are refused with 428 without X-Agent-Confirm
 * and allowed with it (confirm text stored in the audit row); a normal token keeps the
 * old two-step flow; the 61st write in a minute is 429; household isolation still holds.
 * WhatsApp transport is mocked: nothing here can send a real message.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/privacy/consent-server", async (orig) => ({
  ...(await orig<typeof import("@/lib/privacy/consent-server")>()),
  householdConsentOk: async () => true,
  requireConsent: async () => null,
}));
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase, type FakeDb } from "@/lib/agent/__tests__/fake-supabase";

const HH_A = "11111111-1111-4111-8111-111111111111";
const HH_B = "22222222-2222-4222-8222-222222222222";
const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const RAW = {
  agent: "bbs_agent_" + "a".repeat(64),
  agentRevoked: "bbs_agent_" + "b".repeat(64),
  plain: "bbs_agent_" + "c".repeat(64),
  plainDel: "bbs_agent_" + "d".repeat(64),
};
const T_A = "aaaaaaaa-0000-4000-8000-000000000001";
const T_A2 = "aaaaaaaa-0000-4000-8000-000000000002";
const T_B = "bbbbbbbb-0000-4000-8000-000000000001";
const CONFIRM = "WhatsApp from Elad 13.11 09:02: delete the dishes task";
const hdr = (t: string) => encodeURIComponent(t);

let db: FakeDb;
const sendWhatsAppMessage = vi.fn();
const counters = new Map<string, number>();

// Cookie-session client used by the human-only token-management API: nobody signed in.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: async () => ({ data: false, error: null }),
  }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => createFakeSupabase(db) }));
vi.mock("@/lib/rate-limit", () => ({
  // Honours `max` per key so the 61st-write test is real; the per-IP limiter (max 30) is never hit.
  rateLimit: (o: { max?: number }) => ({
    check: async (k: string) => {
      const key = `${o.max}:${k}`;
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return { success: n <= (o.max ?? 10), limit: o.max ?? 10, remaining: 1, reset: 1000 };
    },
  }),
  getClientIp: (r: Request) => r.headers.get("x-test-ip") ?? "127.0.0.1",
}));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppMessage: (...a: unknown[]) => sendWhatsAppMessage(...a) }));

import { POST as taskPOST } from "../task/route";
import { GET as briefGET } from "../brief/route";

const tok = (id: string, raw: string, hh: string, scopes: string[], extra: Record<string, unknown> = {}) => ({
  id, household_id: hh, token_hash: sha(raw), label: id, created_at: "2026-01-01",
  revoked_at: null, scopes, created_by: OWNER, ...extra,
});
const ALL = ["read", "write", "deliver_to_me", "delete_tasks"];

function seed() {
  return {
    household_agent_tokens: [
      tok("t-agent", RAW.agent, HH_A, ALL, { is_agent: true, agent_name: "סוכן" }),
      tok("t-agent-rev", RAW.agentRevoked, HH_A, ALL, { is_agent: true, agent_name: "סוכן", revoked_at: "2026-02-01" }),
      tok("t-plain", RAW.plain, HH_A, ["read", "write"]),
      tok("t-plain-del", RAW.plainDel, HH_A, ["read", "write", "delete_tasks"]),
    ],
    profiles: [{ id: OWNER, household_id: HH_A, display_name: "אלעד", whatsapp_phone: "0501111111" }],
    household_members: [{ household_id: HH_A, user_id: OWNER }],
    tasks: [
      { id: T_A, household_id: HH_A, title: "לשטוף כלים", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
      { id: T_A2, household_id: HH_A, title: "לקפל כביסה", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
      { id: T_B, household_id: HH_B, title: "משימה של B", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
    ],
  };
}

function taskReq(token: string | null, body: unknown, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", ...extra };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/agent/task", { method: "POST", headers, body: JSON.stringify(body) });
}
const exists = (id: string) => db.tables["tasks"].some((t) => t.id === id);
const audit = () => db.tables["agent_audit_log"] ?? [];

beforeEach(() => {
  db = createFakeDb(seed());
  counters.clear();
  sendWhatsAppMessage.mockReset();
  sendWhatsAppMessage.mockResolvedValue({ success: true, idMessage: "msg-1" });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  for (const k of ["BAYIT_AGENT_KEY", "AGENT_API_TOKEN", "BAYIT_AGENT_KEY_HOUSEHOLD_ID", "BAYIT_AGENT_WHATSAPP_TO"]) delete process.env[k];
});

describe("named agent: authentication", () => {
  it("valid key -> 200", async () => {
    expect((await taskPOST(taskReq(RAW.agent, { action: "list" }))).status).toBe(200);
  });
  it("no key -> 401", async () => {
    expect((await taskPOST(taskReq(null, { action: "list" }))).status).toBe(401);
  });
  it("wrong key -> refused (403 in this API; 401 is the no-credential case)", async () => {
    const s = (await taskPOST(taskReq("bbs_agent_" + "e".repeat(64), { action: "list" }))).status;
    expect([401, 403]).toContain(s);
  });
  it("revoked key -> refused", async () => {
    const s = (await taskPOST(taskReq(RAW.agentRevoked, { action: "list" }))).status;
    expect([401, 403]).toContain(s);
  });
  it("is pinned to its own household (cannot touch HH_B tasks even if named)", async () => {
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_B, householdId: HH_B }, { "x-agent-confirm": hdr(CONFIRM) }));
    expect(r.status).toBe(404);
    expect(exists(T_B)).toBe(true);
  });
});

describe("named agent: audit + rate limit", () => {
  it("add and complete write audit rows carrying the agent name", async () => {
    const add = await taskPOST(taskReq(RAW.agent, { action: "add", title: "לקנות חלב" }));
    expect(add.status).toBe(201);
    const done = await taskPOST(taskReq(RAW.agent, { action: "complete", taskId: T_A }));
    expect(done.status).toBe(200);
    const rows = audit();
    expect(rows.map((r) => r.action)).toEqual(["create_task", "complete_task"]);
    expect(rows.every((r) => r.agent_name === "סוכן" && r.outcome === "executed")).toBe(true);
    expect(rows[1].target).toBe(T_A);
  });
  it("a normal token's writes are not named-agent audited (behaviour unchanged)", async () => {
    await taskPOST(taskReq(RAW.plain, { action: "add", title: "x" }));
    expect(audit().length).toBe(0);
  });
  it("61st write in a minute -> 429, reads are not counted", async () => {
    for (let i = 0; i < 60; i++) {
      // distinct IP per call so only the named agent per-token limiter can trip
      const r = await taskPOST(taskReq(RAW.agent, { action: "add", title: `t${i}` }, { "x-test-ip": `10.0.0.${i}` }));
      expect(r.status).toBe(201);
    }
    const over = await taskPOST(taskReq(RAW.agent, { action: "add", title: "one too many" }, { "x-test-ip": "10.9.9.9" }));
    expect(over.status).toBe(429);
    expect((await taskPOST(taskReq(RAW.agent, { action: "list" }, { "x-test-ip": "10.8.8.8" }))).status).toBe(200);
  });
});

describe("named agent: guard rail class=delete", () => {
  it("without X-Agent-Confirm -> 428 {agent_confirm_required, delete}, nothing deleted, denial audited", async () => {
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_A }));
    expect(r.status).toBe(428);
    expect(await r.json()).toEqual({ error: "agent_confirm_required", class: "delete", reason: "missing" });
    expect(exists(T_A)).toBe(true);
    expect(audit().some((a) => a.outcome === "denied")).toBe(true);
  });
  it("with a too-short confirm -> still 428", async () => {
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_A }, { "x-agent-confirm": hdr("ok yes") }));
    expect(r.status).toBe(428);
    expect(exists(T_A)).toBe(true);
  });
  it.each([
    ["10 emoji", "😀".repeat(10), "too_short"],
    ["20 zero-width spaces", "\u200B".repeat(20), "too_short"],
    ["20 combining marks", "\u0301".repeat(20), "too_short"],
    ["601 characters", "א".repeat(601), "too_long"],
  ])("Step 0: %s -> 428 (%s), nothing deleted", async (_n, text, reason) => {
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_A }, { "x-agent-confirm": hdr(text) }));
    expect(r.status).toBe(428);
    expect(await r.json()).toEqual({ error: "agent_confirm_required", class: "delete", reason });
    expect(exists(T_A)).toBe(true);
  });
  it("Step 0: a normal Hebrew sentence of 25 letters is accepted", async () => {
    const text = "אלעד אישר בוואטסאפ מחיקה";
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_A }, { "x-agent-confirm": hdr(text) }));
    expect(r.status).toBe(200);
    expect(audit().find((a) => a.outcome === "executed")?.confirm_text).toBe(text);
  });
  it("with a Hebrew confirm statement -> deleted, text stored in the audit row", async () => {
    const text = "וואטסאפ מאלעד 13.11 09:02: למחוק את משימת הכלים";
    const r = await taskPOST(taskReq(RAW.agent, { action: "delete", taskId: T_A }, { "x-agent-confirm": hdr(text) }));
    expect(r.status).toBe(200);
    expect(exists(T_A)).toBe(false);
    const row = audit().find((a) => a.outcome === "executed");
    expect(row?.confirm_text).toBe(text);
    expect(row?.agent_name).toBe("סוכן");
  });
  it("a normal token still uses the two-step confirm_token flow (preview, nothing deleted)", async () => {
    const r = await taskPOST(taskReq(RAW.plainDel, { action: "delete", taskId: T_A }));
    expect(r.status).toBe(200);
    expect((await r.json()).requiresConfirmation).toBe(true);
    expect(exists(T_A)).toBe(true);
  });
  it("a normal token is NOT unlocked by the header alone (header is named-agent only)", async () => {
    const r = await taskPOST(taskReq(RAW.plainDel, { action: "delete", taskId: T_A }, { "x-agent-confirm": hdr(CONFIRM) }));
    expect((await r.json()).requiresConfirmation).toBe(true);
    expect(exists(T_A)).toBe(true);
  });
});

describe("named agent: guard rail class=send (deliver_to_me)", () => {
  const brief = (confirm?: string) =>
    briefGET(new NextRequest("http://localhost/api/agent/brief?deliver=whatsapp", {
      headers: { authorization: `Bearer ${RAW.agent}`, ...(confirm ? { "x-agent-confirm": hdr(confirm) } : {}) },
    }));
  it("without confirm -> 428 {send}, nothing sent", async () => {
    const r = await brief();
    expect(r.status).toBe(428);
    expect(await r.json()).toEqual({ error: "agent_confirm_required", class: "send", reason: "missing" });
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
  it("with confirm -> sent once, to the creator's own number only, audited with the text", async () => {
    const r = await brief("WhatsApp from Elad 13.11 09:05: send me the daily brief");
    expect(r.status).toBe(200);
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe("0501111111");
    const row = audit().find((a) => a.action === "deliver_to_me" && a.outcome === "executed");
    expect(row?.confirm_text).toContain("daily brief");
  });
  it("release review 13.11: a confirmed send counts against the same 60/min write limit", async () => {
    for (let i = 0; i < 60; i++) {
      const r = await taskPOST(taskReq(RAW.agent, { action: "add", title: `s${i}` }, { "x-test-ip": `10.1.0.${i}` }));
      expect(r.status).toBe(201);
    }
    const r = await brief("WhatsApp from Elad 13.11 09:05: send me the daily brief");
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    const body = await r.json();
    expect(JSON.stringify(body)).toContain("יותר מדי כתיבות של הסוכנת");
  });
});

describe("classes with no agent route in this product", () => {
  it("access: the token-management route is cookie-session only (a named agent bearer cannot use it)", async () => {
    const mod = await import("../../agent-tokens/route");
    const r = await (mod as { POST: (r: NextRequest) => Promise<Response> }).POST(
      new NextRequest("http://localhost/api/agent-tokens", {
        method: "POST",
        headers: { authorization: `Bearer ${RAW.agent}`, "content-type": "application/json" },
        body: JSON.stringify({ householdId: HH_A, label: "x", scopes: ["delete_tasks"] }),
      })
    );
    expect([401, 403]).toContain(r.status);
    expect((db.tables["household_agent_tokens"] ?? []).length).toBe(4); // nothing minted
  });
});
