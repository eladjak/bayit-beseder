/**
 * Token scopes + two-step confirm for the two opt-in agent actions:
 * `delete_tasks` (POST /api/agent/task action=delete) and `deliver_to_me`
 * (`deliver=whatsapp` on brief / plan).
 *
 * The properties that matter, each with a red twin (see the "RED" comments and
 * the sabotage note in the PR): a missing scope is a 403; a delivery can only
 * ever reach the phone of the member who created the token; nothing happens
 * without a valid, single-use, unexpired, matching confirm token.
 *
 * The WhatsApp transport is mocked. No test here can send a real message.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase, type FakeDb } from "@/lib/agent/__tests__/fake-supabase";

const HH_A = "11111111-1111-4111-8111-111111111111";
const HH_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // creator of the tokens in HH_A
const USER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // ANOTHER member of HH_A
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // member of HH_B
const PHONE_A = "0501111111";
const PHONE_C = "0503333333";
const PHONE_B = "0502222222";

const RAW = {
  plain: "bbs_agent_" + "1".repeat(64),
  del: "bbs_agent_" + "2".repeat(64),
  del2: "bbs_agent_" + "3".repeat(64),
  dlv: "bbs_agent_" + "4".repeat(64),
  dlv2: "bbs_agent_" + "5".repeat(64),
  orphan: "bbs_agent_" + "6".repeat(64), // deliver_to_me but creator unknown
  other: "bbs_agent_" + "7".repeat(64), // HH_B
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const T_A = "aaaaaaaa-0000-4000-8000-000000000001";
const T_A2 = "aaaaaaaa-0000-4000-8000-000000000002";
const T_B = "bbbbbbbb-0000-4000-8000-000000000001";

let db: FakeDb;
const sendWhatsAppMessage = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabase(db),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 999, remaining: 998, reset: 0 }) }),
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: (...args: unknown[]) => sendWhatsAppMessage(...args),
}));

import { POST as taskPOST } from "../task/route";
import { GET as briefGET } from "../brief/route";
import { POST as planPOST } from "../plan/route";

const tok = (id: string, raw: string, hh: string, scopes: string[] | undefined, createdBy: string | null) => ({
  id,
  household_id: hh,
  token_hash: sha(raw),
  label: id,
  created_at: "2026-01-01",
  revoked_at: null,
  ...(scopes ? { scopes } : {}),
  created_by: createdBy,
});

function seed(): Record<string, Record<string, unknown>[]> {
  return {
    household_agent_tokens: [
      tok("t-plain", RAW.plain, HH_A, ["read", "write"], USER_A),
      tok("t-del", RAW.del, HH_A, ["read", "write", "delete_tasks"], USER_A),
      tok("t-del2", RAW.del2, HH_A, ["read", "write", "delete_tasks"], USER_A),
      tok("t-dlv", RAW.dlv, HH_A, ["read", "write", "deliver_to_me"], USER_A),
      tok("t-dlv2", RAW.dlv2, HH_A, ["read", "write", "deliver_to_me"], USER_A),
      tok("t-orphan", RAW.orphan, HH_A, ["read", "write", "deliver_to_me"], null),
      tok("t-other", RAW.other, HH_B, ["read", "write", "delete_tasks", "deliver_to_me"], USER_B),
    ],
    profiles: [
      { id: USER_A, household_id: HH_A, display_name: "אלעד", whatsapp_phone: PHONE_A },
      { id: USER_C, household_id: HH_A, display_name: "אחרת", whatsapp_phone: PHONE_C },
      { id: USER_B, household_id: HH_B, display_name: "בי", whatsapp_phone: PHONE_B },
    ],
    tasks: [
      { id: T_A, household_id: HH_A, title: "לשטוף כלים", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
      { id: T_A2, household_id: HH_A, title: "לקפל כביסה", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
      { id: T_B, household_id: HH_B, title: "משימה של B", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
    ],
  };
}

function taskReq(token: string | null, body: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/agent/task", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
const briefReq = (token: string, qs = "") =>
  new NextRequest(`http://localhost/api/agent/brief?${qs}`, {
    headers: { authorization: `Bearer ${token}` },
  });
const planReq = (token: string, body: unknown) =>
  new NextRequest("http://localhost/api/agent/plan", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

const taskExists = (id: string) => db.tables["tasks"].some((t) => t.id === id);
const audits = (outcome?: string) =>
  (db.tables["agent_audit_log"] ?? []).filter((r) => !outcome || r.outcome === outcome);

beforeEach(() => {
  db = createFakeDb(seed());
  sendWhatsAppMessage.mockReset();
  sendWhatsAppMessage.mockResolvedValue({ success: true, idMessage: "msg-1" });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
  delete process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID;
  delete process.env.BAYIT_AGENT_WHATSAPP_TO;
});

// ── delete_tasks ──────────────────────────────────────────────────────────────

describe("delete_tasks scope", () => {
  it("a default-scope token gets 403 and the task survives (red twin: delete_tasks token works)", async () => {
    const res = await taskPOST(taskReq(RAW.plain, { action: "delete", taskId: T_A }));
    expect(res.status).toBe(403);
    expect(taskExists(T_A)).toBe(true);
    expect(db.tables["agent_confirmations"] ?? []).toHaveLength(0);
    expect(audits("denied")).toHaveLength(1);
  });

  it("the legacy shared key can never delete", async () => {
    process.env.BAYIT_AGENT_KEY = "legacy-key";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HH_A;
    const res = await taskPOST(taskReq("legacy-key", { action: "delete", taskId: T_A }));
    expect(res.status).toBe(403);
    expect(taskExists(T_A)).toBe(true);
  });

  it("step 1 without confirm_token is a PREVIEW only: nothing deleted, single-use token issued and only its hash stored", async () => {
    const res = await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      requiresConfirmation: true,
      deleted: false,
      preview: { id: T_A, title: "לשטוף כלים" },
      expiresInSeconds: 300,
    });
    expect(body.confirm_token).toMatch(/^bbs_confirm_[0-9a-f]{48}$/);
    expect(taskExists(T_A)).toBe(true);

    const stored = db.tables["agent_confirmations"];
    expect(stored).toHaveLength(1);
    expect(stored[0].confirm_hash).toBe(sha(body.confirm_token));
    expect(JSON.stringify(stored)).not.toContain(body.confirm_token);
    expect(stored[0]).toMatchObject({ token_id: "t-del", household_id: HH_A, action: "delete_task", target: T_A });
  });

  it("step 2 with the confirm_token deletes exactly that task, and both steps are audited", async () => {
    const preview = await (await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }))).json();
    const res = await taskPOST(
      taskReq(RAW.del, { action: "delete", taskId: T_A, confirm_token: preview.confirm_token })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ deleted: true, taskId: T_A });
    expect(taskExists(T_A)).toBe(false);
    expect(taskExists(T_A2)).toBe(true);
    expect(taskExists(T_B)).toBe(true);
    expect(audits().map((a) => a.outcome)).toEqual(["preview", "executed"]);
    expect(audits()[1]).toMatchObject({ action: "delete_task", household_id: HH_A, token_id: "t-del", actor_user_id: USER_A });
  });

  it("a made-up confirm_token deletes nothing", async () => {
    const res = await taskPOST(
      taskReq(RAW.del, { action: "delete", taskId: T_A, confirm_token: "bbs_confirm_" + "0".repeat(48) })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("invalid");
    expect(taskExists(T_A)).toBe(true);
    expect(audits("rejected")).toHaveLength(1);
  });

  it("reuse: a confirm_token cannot delete twice (parallel calls: exactly one wins)", async () => {
    const preview = await (await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }))).json();
    const call = () =>
      taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A, confirm_token: preview.confirm_token }));
    const [r1, r2] = await Promise.all([call(), call()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).not.toBe(200);
    expect(db.writes.filter((w) => w.table === "tasks" && w.op === "delete")).toHaveLength(1);
    // And afterwards it is dead for good.
    expect((await call()).status).not.toBe(200);
  });

  it("expiry: a confirm_token older than 5 minutes is rejected and the task survives", async () => {
    const preview = await (await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }))).json();
    db.tables["agent_confirmations"][0].expires_at = new Date(Date.now() - 1000).toISOString();
    const res = await taskPOST(
      taskReq(RAW.del, { action: "delete", taskId: T_A, confirm_token: preview.confirm_token })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("expired");
    expect(taskExists(T_A)).toBe(true);
  });

  it("the preview TTL is 5 minutes", async () => {
    const before = Date.now();
    await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }));
    const exp = new Date(db.tables["agent_confirmations"][0].expires_at as string).getTime();
    expect(exp - before).toBeGreaterThan(4.9 * 60_000);
    expect(exp - before).toBeLessThan(5.1 * 60_000);
  });

  it("mismatch (target): a confirm_token issued for task A cannot delete task A2", async () => {
    const preview = await (await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }))).json();
    const res = await taskPOST(
      taskReq(RAW.del, { action: "delete", taskId: T_A2, confirm_token: preview.confirm_token })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("mismatch");
    expect(taskExists(T_A)).toBe(true);
    expect(taskExists(T_A2)).toBe(true);
  });

  it("mismatch (token): another agent token's confirm_token is rejected", async () => {
    const preview = await (await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }))).json();
    const res = await taskPOST(
      taskReq(RAW.del2, { action: "delete", taskId: T_A, confirm_token: preview.confirm_token })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("mismatch");
    expect(taskExists(T_A)).toBe(true);
  });

  it("household isolation: a delete_tasks token cannot preview or delete another household's task", async () => {
    const res = await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_B }));
    expect(res.status).toBe(404);
    expect(taskExists(T_B)).toBe(true);
    expect(db.tables["agent_confirmations"] ?? []).toHaveLength(0);
  });

  it("fails closed when the confirmations table is missing (migration not applied)", async () => {
    db.missingTables = ["agent_confirmations"];
    const res = await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }));
    expect(res.status).toBe(503);
    expect(taskExists(T_A)).toBe(true);
  });
});

// ── deliver_to_me ─────────────────────────────────────────────────────────────

describe("deliver_to_me scope", () => {
  it("a default-scope token asking for deliver=whatsapp gets 403 and nothing is sent", async () => {
    const res = await briefGET(briefReq(RAW.plain, "deliver=whatsapp"));
    expect(res.status).toBe(403);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(audits("denied")).toHaveLength(1);
  });

  it("a default token without deliver still works exactly as before (no regression)", async () => {
    const res = await briefGET(briefReq(RAW.plain));
    expect(res.status).toBe(200);
    expect((await res.json()).delivery).toMatchObject({ attempted: false, sent: false });
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("a deliver_to_me token with no known creator gets 403 (there is no 'me')", async () => {
    const res = await briefGET(briefReq(RAW.orphan, "deliver=whatsapp"));
    expect(res.status).toBe(403);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("step 1 returns the message as a preview plus a confirm_token, and sends NOTHING", async () => {
    const res = await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.whatsappText).toBe("string");
    expect(body.delivery).toMatchObject({
      attempted: false,
      sent: false,
      requiresConfirmation: true,
      recipient: "•••111",
      expiresInSeconds: 300,
    });
    expect(body.delivery.confirmToken).toMatch(/^bbs_confirm_/);
    expect(JSON.stringify(body)).not.toContain(PHONE_A);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    // The stored binding contains a fingerprint, never the phone number.
    expect(JSON.stringify(db.tables["agent_confirmations"])).not.toContain(PHONE_A);
  });

  it("step 2 sends to the CREATOR's own phone and to nobody else (self-only, red twin: other member's phone)", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    const res = await briefGET(
      briefReq(RAW.dlv, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivery).toMatchObject({ attempted: true, sent: true });
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe(PHONE_A);
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith(PHONE_C, expect.anything());
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith(PHONE_B, expect.anything());
    expect(audits().map((a) => a.outcome)).toEqual(["preview", "executed"]);
    expect(JSON.stringify(audits())).not.toContain(PHONE_A);
  });

  it.each([
    ["phone", `phone=${PHONE_C}`],
    ["to", `to=${PHONE_C}`],
    ["recipient", `recipient=${PHONE_C}`],
    ["member", `member=${USER_C}`],
    ["userId", `userId=${USER_C}`],
  ])("naming another recipient (%s) is rejected with 400, at both steps, and nothing is sent", async (_k, extra) => {
    const r1 = await briefGET(briefReq(RAW.dlv, `deliver=whatsapp&${extra}`));
    expect(r1.status).toBe(400);
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    const r2 = await briefGET(
      briefReq(RAW.dlv, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}&${extra}`)
    );
    expect(r2.status).toBe(400);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("plan route: a body naming another phone/member is rejected; a clean one still goes only to the creator", async () => {
    const bad = await planPOST(planReq(RAW.dlv, { deliver: "whatsapp", phone: PHONE_C, members: [USER_C] }));
    expect(bad.status).toBe(400);
    const bad2 = await planPOST(planReq(RAW.dlv, { deliver: "whatsapp", to: PHONE_C }));
    expect(bad2.status).toBe(400);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();

    const preview = await (await planPOST(planReq(RAW.dlv, { deliver: "whatsapp" }))).json();
    expect(preview.delivery.requiresConfirmation).toBe(true);
    const sent = await planPOST(
      planReq(RAW.dlv, { deliver: "whatsapp", confirm_token: preview.delivery.confirmToken })
    );
    expect(sent.status).toBe(200);
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe(PHONE_A);
  });

  it("plan route without the scope: 403", async () => {
    const res = await planPOST(planReq(RAW.plain, { deliver: "whatsapp" }));
    expect(res.status).toBe(403);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("reuse: the same confirm_token cannot send a second message", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    const url = `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`;
    expect((await briefGET(briefReq(RAW.dlv, url))).status).toBe(200);
    const again = await briefGET(briefReq(RAW.dlv, url));
    expect(again.status).toBe(409);
    expect((await again.json()).delivery).toMatchObject({ sent: false, rejected: true });
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
  });

  it("expiry: an old confirm_token sends nothing", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    db.tables["agent_confirmations"][0].expires_at = new Date(Date.now() - 1000).toISOString();
    const res = await briefGET(
      briefReq(RAW.dlv, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`)
    );
    expect(res.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("mismatch (kind): a confirm issued for the brief cannot authorise a plan", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    const res = await planPOST(
      planReq(RAW.dlv, { deliver: "whatsapp", confirm_token: preview.delivery.confirmToken })
    );
    expect(res.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("mismatch (token): another token's confirm_token is rejected", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    const res = await briefGET(
      briefReq(RAW.dlv2, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`)
    );
    expect(res.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("if the creator's phone changes between preview and confirm, the confirm no longer matches", async () => {
    const preview = await (await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"))).json();
    db.tables["profiles"].find((p) => p.id === USER_A)!.whatsapp_phone = PHONE_C;
    const res = await briefGET(
      briefReq(RAW.dlv, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`)
    );
    expect(res.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("a creator who left the household (or has no phone) receives nothing", async () => {
    db.tables["profiles"].find((p) => p.id === USER_A)!.household_id = HH_B;
    const r1 = await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"));
    expect(r1.status).toBe(409);
    db.tables["profiles"].find((p) => p.id === USER_A)!.household_id = HH_A;
    db.tables["profiles"].find((p) => p.id === USER_A)!.whatsapp_phone = null;
    const r2 = await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"));
    expect(r2.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("another household's token resolves 'me' from ITS creator, never from this household", async () => {
    const preview = await (await briefGET(briefReq(RAW.other, "deliver=whatsapp"))).json();
    await briefGET(briefReq(RAW.other, `deliver=whatsapp&confirm_token=${preview.delivery.confirmToken}`));
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe(PHONE_B);
  });

  it("fails closed when the confirmations table is missing: no confirm token, nothing sent", async () => {
    db.missingTables = ["agent_confirmations"];
    const res = await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"));
    expect(res.status).toBe(409);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("legacy key keeps its previous behaviour: owner number from env, no scope needed", async () => {
    process.env.BAYIT_AGENT_KEY = "legacy-key";
    process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID = HH_A;
    process.env.BAYIT_AGENT_WHATSAPP_TO = "972500000000";
    const res = await briefGET(briefReq("legacy-key", "deliver=whatsapp"));
    expect(res.status).toBe(200);
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe("972500000000");
  });
});

// ── degrade: migration 024 not applied ────────────────────────────────────────

describe("before migration 024 is applied", () => {
  beforeEach(() => {
    db.missingColumns = { household_agent_tokens: ["scopes", "created_by"] };
    db.missingTables = ["agent_confirmations", "agent_audit_log"];
  });

  it("existing tokens keep working as default-scope tokens", async () => {
    const res = await taskPOST(taskReq(RAW.del, { action: "list" }));
    expect(res.status).toBe(200);
    const brief = await briefGET(briefReq(RAW.dlv));
    expect(brief.status).toBe(200);
  });

  it("no token can delete (scope unknown => default) and no token can deliver", async () => {
    const d = await taskPOST(taskReq(RAW.del, { action: "delete", taskId: T_A }));
    expect(d.status).toBe(403);
    expect(taskExists(T_A)).toBe(true);
    const s = await briefGET(briefReq(RAW.dlv, "deliver=whatsapp"));
    expect(s.status).toBe(403);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});

// ── sanity for the fixtures themselves ────────────────────────────────────────

describe("fixtures", () => {
  it("the plain token really has no sensitive scope, the others really do", () => {
    const by = (id: string) => db.tables["household_agent_tokens"].find((t) => t.id === id)!;
    expect(by("t-plain").scopes).toEqual(["read", "write"]);
    expect(by("t-del").scopes).toContain("delete_tasks");
    expect(by("t-dlv").scopes).toContain("deliver_to_me");
  });
});
