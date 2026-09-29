/**
 * /api/mcp: the two opt-in tools (`delete_task`, `send_to_me`) exist only for
 * tokens holding the matching scope, and each is two-step through MCP exactly
 * as it is over HTTP. WhatsApp transport is mocked; nothing real is sent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase, type FakeDb } from "@/lib/agent/__tests__/fake-supabase";

const HH_A = "11111111-1111-4111-8111-111111111111";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PHONE_A = "0501111111";
const PHONE_C = "0503333333";
const RAW_PLAIN = "bbs_agent_" + "a".repeat(64);
const RAW_DEL = "bbs_agent_" + "d".repeat(64);
const RAW_DLV = "bbs_agent_" + "e".repeat(64);
const T_A = "aaaaaaaa-0000-4000-8000-000000000001";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

let db: FakeDb;
const sendWhatsAppMessage = vi.fn();

vi.mock("@supabase/supabase-js", () => ({ createClient: () => createFakeSupabase(db) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 999, remaining: 998, reset: 0 }) }),
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: (...a: unknown[]) => sendWhatsAppMessage(...a),
}));

import { POST } from "../route";

function rpc(body: unknown, token: string) {
  return new NextRequest("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}
async function listTools(token: string): Promise<string[]> {
  const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, token));
  const json = await res.json();
  return (json.result.tools as Array<{ name: string }>).map((t) => t.name).sort();
}
async function call(token: string, name: string, args: Record<string, unknown>) {
  const res = await POST(
    rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }, token)
  );
  const json = (await res.json()) as {
    result?: { isError?: boolean; content: Array<{ text: string }> };
    error?: unknown;
  };
  const text = json.result?.content?.[0]?.text ?? "";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // plain text
  }
  return { json, text, parsed, isError: json.result?.isError === true || json.error !== undefined };
}

beforeEach(() => {
  const tok = (id: string, raw: string, scopes: string[]) => ({
    id,
    household_id: HH_A,
    token_hash: sha(raw),
    label: id,
    created_at: "2026-01-01",
    revoked_at: null,
    scopes,
    created_by: USER_A,
  });
  db = createFakeDb({
    household_agent_tokens: [
      tok("t-plain", RAW_PLAIN, ["read", "write"]),
      tok("t-del", RAW_DEL, ["read", "write", "delete_tasks"]),
      tok("t-dlv", RAW_DLV, ["read", "write", "deliver_to_me"]),
    ],
    profiles: [
      { id: USER_A, household_id: HH_A, display_name: "א", whatsapp_phone: PHONE_A },
      { id: USER_C, household_id: HH_A, display_name: "ג", whatsapp_phone: PHONE_C },
    ],
    tasks: [
      { id: T_A, household_id: HH_A, title: "לשטוף כלים", status: "pending", due_date: "2026-01-01", assigned_to: null, points: 10, category_id: null },
    ],
  });
  sendWhatsAppMessage.mockReset();
  sendWhatsAppMessage.mockResolvedValue({ success: true, idMessage: "m1" });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
});

describe("MCP tool visibility follows the token's scopes", () => {
  const base = ["add_task", "complete_task", "daily_brief", "list_tasks", "tonight_prep", "weekly_plan"];
  it("default token: the six standard tools only", async () => {
    expect(await listTools(RAW_PLAIN)).toEqual(base);
  });
  it("delete_tasks token additionally gets delete_task", async () => {
    expect(await listTools(RAW_DEL)).toEqual([...base, "delete_task"].sort());
  });
  it("deliver_to_me token additionally gets send_to_me, which has no recipient argument", async () => {
    expect(await listTools(RAW_DLV)).toEqual([...base, "send_to_me"].sort());
    const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, RAW_DLV));
    const tool = (await res.json()).result.tools.find((t: { name: string }) => t.name === "send_to_me");
    const props = Object.keys(tool.inputSchema.properties);
    expect(props.sort()).toEqual(["confirm_token", "weekStart", "what"]);
    expect(tool.description).toMatch(/לעולם אל תאשרו בעצמכם/);
    expect(tool.description).toMatch(/Never confirm on your own/);
  });
  it("a default token calling delete_task / send_to_me is refused and nothing happens", async () => {
    const d = await call(RAW_PLAIN, "delete_task", { taskId: T_A });
    expect(d.isError).toBe(true);
    const s = await call(RAW_PLAIN, "send_to_me", { what: "brief" });
    expect(s.isError).toBe(true);
    expect(db.tables["tasks"]).toHaveLength(1);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});

describe("delete_task over MCP is two-step", () => {
  it("preview first, deletion only with the confirm_token", async () => {
    const preview = await call(RAW_DEL, "delete_task", { taskId: T_A });
    expect(preview.isError).toBe(false);
    expect(preview.parsed).toMatchObject({ requiresConfirmation: true, deleted: false });
    expect(db.tables["tasks"]).toHaveLength(1);

    const done = await call(RAW_DEL, "delete_task", {
      taskId: T_A,
      confirm_token: preview.parsed.confirm_token,
    });
    expect(done.isError).toBe(false);
    expect(done.parsed).toMatchObject({ deleted: true });
    expect(db.tables["tasks"]).toHaveLength(0);
  });
});

describe("send_to_me over MCP is two-step and self-only", () => {
  it("preview first (sends nothing), then sends to the creator's phone only", async () => {
    const preview = await call(RAW_DLV, "send_to_me", { what: "brief" });
    expect(preview.isError).toBe(false);
    const delivery = preview.parsed.delivery as Record<string, unknown>;
    expect(delivery).toMatchObject({ requiresConfirmation: true, sent: false });
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();

    const sent = await call(RAW_DLV, "send_to_me", {
      what: "brief",
      confirm_token: delivery.confirmToken,
    });
    expect(sent.isError).toBe(false);
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage.mock.calls[0][0]).toBe(PHONE_A);
  });

  it("extra arguments naming a phone or member never reach the recipient logic", async () => {
    const preview = await call(RAW_DLV, "send_to_me", {
      what: "brief",
      phone: PHONE_C,
      member: USER_C,
    } as Record<string, unknown>);
    const delivery = preview.parsed.delivery as Record<string, unknown> | undefined;
    if (delivery?.confirmToken) {
      await call(RAW_DLV, "send_to_me", {
        what: "brief",
        phone: PHONE_C,
        confirm_token: delivery.confirmToken,
      } as Record<string, unknown>);
    }
    for (const c of sendWhatsAppMessage.mock.calls) expect(c[0]).toBe(PHONE_A);
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith(PHONE_C, expect.anything());
  });

  it("a bad confirm_token sends nothing", async () => {
    const res = await call(RAW_DLV, "send_to_me", { what: "plan", confirm_token: "bbs_confirm_" + "0".repeat(48) });
    expect(res.isError).toBe(true);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});
