/**
 * /api/mcp: remote MCP server (Streamable HTTP, stateless).
 *
 * Proves: no/bad token → 401; a valid token lists the tools; and, the
 * important one, `add_task` lands in the TOKEN's household even when the
 * arguments name another household (isolation).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase, type FakeDb } from "@/lib/agent/__tests__/fake-supabase";

const HH_A = "11111111-1111-4111-8111-111111111111";
const HH_B = "22222222-2222-4222-8222-222222222222";
const RAW_A = "bbs_agent_" + "a".repeat(64);
const RAW_B = "bbs_agent_" + "b".repeat(64);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

let db: FakeDb;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabase(db),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 999, remaining: 998, reset: 0 }) }),
  getClientIp: () => "127.0.0.1",
}));

import { POST, GET } from "../route";

function rpc(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function callTool(token: string, name: string, args: Record<string, unknown>) {
  const res = await POST(
    rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, token)
  );
  expect(res.status).toBe(200);
  return (await res.json()) as {
    result?: { isError?: boolean; content: Array<{ type: string; text: string }> };
    error?: unknown;
  };
}

beforeEach(() => {
  db = createFakeDb({
    household_agent_tokens: [
      { id: "t-a", household_id: HH_A, token_hash: sha(RAW_A), label: "a", created_at: "2026-01-01", revoked_at: null },
      { id: "t-b", household_id: HH_B, token_hash: sha(RAW_B), label: "b", created_at: "2026-01-01", revoked_at: null },
    ],
    tasks: [
      { id: "aaaaaaaa-0000-4000-8000-000000000001", household_id: HH_A, title: "משימה של A", status: "pending", due_date: "2026-09-30", assigned_to: null, points: 10, category_id: null },
      { id: "bbbbbbbb-0000-4000-8000-000000000002", household_id: HH_B, title: "משימה של B", status: "pending", due_date: "2026-09-30", assigned_to: null, points: 10, category_id: null },
    ],
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
});

describe("/api/mcp auth (fails closed)", () => {
  const listReq = { jsonrpc: "2.0", id: 1, method: "tools/list" };

  it("no token → 401 with a Bearer challenge", async () => {
    const res = await POST(rpc(listReq));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
  });

  it("unknown token → 401", async () => {
    const res = await POST(rpc(listReq, "bbs_agent_" + "0".repeat(64)));
    expect(res.status).toBe(401);
  });

  it("revoked token → 401", async () => {
    db.tables["household_agent_tokens"][0].revoked_at = "2026-02-01";
    const res = await POST(rpc(listReq, RAW_A));
    expect(res.status).toBe(401);
  });

  it("GET without a token → 401 (not a 405 that leaks the endpoint is open)", async () => {
    const res = await GET(new NextRequest("http://localhost/api/mcp"));
    expect(res.status).toBe(401);
  });

  it("GET with a valid token → 405 (stateless, POST only)", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/mcp", { headers: { authorization: `Bearer ${RAW_A}` } })
    );
    expect(res.status).toBe(405);
  });
});

describe("/api/mcp tools", () => {
  it("a valid token lists the tools, with Hebrew+English descriptions and schemas", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, RAW_A));
    expect(res.status).toBe(200);
    const json = await res.json();
    const tools = json.result.tools as Array<{
      name: string;
      description: string;
      inputSchema: { properties?: Record<string, unknown> };
    }>;
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["add_task", "complete_task", "daily_brief", "list_tasks", "tonight_prep", "weekly_plan"].sort()
    );
    for (const t of tools) {
      expect(t.description).toMatch(/[֐-׿]/); // Hebrew
      expect(t.description).toMatch(/[A-Za-z]{4,}/); // English
      expect(t.inputSchema).toBeTruthy();
      // No tool may accept a household or a delivery target.
      expect(Object.keys(t.inputSchema.properties ?? {})).not.toContain("householdId");
      expect(Object.keys(t.inputSchema.properties ?? {})).not.toContain("deliver");
    }
  });

  it("list_tasks returns only the token's household", async () => {
    const out = await callTool(RAW_A, "list_tasks", {});
    expect(out.result?.isError).toBeFalsy();
    const text = out.result!.content[0].text;
    expect(text).toContain("משימה של A");
    expect(text).not.toContain("משימה של B");
  });

  it("add_task via MCP lands in the token's household even if arguments name another one", async () => {
    const out = await callTool(RAW_A, "add_task", { title: "לקנות חלב", householdId: HH_B });
    expect(out.result?.isError).toBeFalsy();

    const added = db.tables["tasks"].filter((t) => t.title === "לקנות חלב");
    expect(added).toHaveLength(1);
    expect(added[0].household_id).toBe(HH_A);
    expect(db.tables["tasks"].filter((t) => t.household_id === HH_B)).toHaveLength(1); // B untouched
  });

  it("complete_task cannot touch another household's task", async () => {
    const out = await callTool(RAW_A, "complete_task", {
      taskId: "bbbbbbbb-0000-4000-8000-000000000002",
    });
    expect(out.result?.isError).toBe(true);
    const b = db.tables["tasks"].find((t) => t.id === "bbbbbbbb-0000-4000-8000-000000000002")!;
    expect(b.status).toBe("pending");
  });

  it("complete_task completes the token's own task", async () => {
    const out = await callTool(RAW_A, "complete_task", {
      taskId: "aaaaaaaa-0000-4000-8000-000000000001",
    });
    expect(out.result?.isError).toBeFalsy();
    const a = db.tables["tasks"].find((t) => t.id === "aaaaaaaa-0000-4000-8000-000000000001")!;
    expect(a.status).toBe("completed");
  });

  it("invalid arguments are rejected by the schema, not passed through", async () => {
    const out = await callTool(RAW_A, "add_task", { title: "" });
    const failed = out.error !== undefined || out.result?.isError === true;
    expect(failed).toBe(true);
    expect(db.tables["tasks"]).toHaveLength(2);
  });
});
