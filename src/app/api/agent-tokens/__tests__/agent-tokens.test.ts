/**
 * Self-serve agent-token management (settings → "חיבור לסוכנים").
 *
 * Proves: a household member can create/list/revoke; a non-member gets 403 on
 * every verb; the raw token is returned only by the create call; a revoked
 * token fails real agent auth (verifyAgentRequest); the 10-active cap holds;
 * a token id from another household cannot be revoked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase, type FakeDb } from "@/lib/agent/__tests__/fake-supabase";

const HH_A = "11111111-1111-4111-8111-111111111111";
const HH_B = "22222222-2222-4222-8222-222222222222";
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const session = { user: null as { id: string } | null, memberOf: new Set<string>() };
let db: FakeDb;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: session.user } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== "is_household_member") return { data: null, error: { message: "unexpected rpc" } };
      return { data: session.memberOf.has(String(args.target_household_id)), error: null };
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabase(db),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({ check: async () => ({ success: true, limit: 999, remaining: 998, reset: 0 }) }),
  getClientIp: () => "127.0.0.1",
}));

import { GET, POST } from "../route";
import { DELETE } from "../[id]/route";
import { verifyAgentRequest } from "@/lib/agent/auth";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/agent-tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const list = (hh: string) => new NextRequest(`http://localhost/api/agent-tokens?householdId=${hh}`);
const del = (id: string, hh: string) =>
  DELETE(new NextRequest(`http://localhost/api/agent-tokens/${id}?householdId=${hh}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  db = createFakeDb();
  session.user = { id: USER };
  session.memberOf = new Set([HH_A]);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.BAYIT_AGENT_KEY;
  delete process.env.AGENT_API_TOKEN;
});

describe("agent-tokens: household member", () => {
  it("creates a token and returns the raw value exactly once", async () => {
    const res = await POST(post({ householdId: HH_A, label: "קלוד" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token.rawToken).toMatch(/^bbs_agent_[0-9a-f]{64}$/);
    expect(body.token.label).toBe("קלוד");

    // Only the hash is stored.
    const stored = db.tables["household_agent_tokens"][0];
    expect(stored.token_hash).toBe(createHash("sha256").update(body.token.rawToken).digest("hex"));
    expect(JSON.stringify(stored)).not.toContain(body.token.rawToken);
  });

  it("list never contains the raw token or its hash", async () => {
    const created = await (await POST(post({ householdId: HH_A, label: "קאמי" }))).json();
    const res = await GET(list(HH_A));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(created.token.rawToken);
    expect(text).not.toContain(db.tables["household_agent_tokens"][0].token_hash as string);
    expect(text).not.toContain("token_hash");
    const parsed = JSON.parse(text);
    expect(parsed.tokens).toHaveLength(1);
    expect(parsed.tokens[0]).toMatchObject({ id: created.token.id, label: "קאמי" });
    expect(parsed.tokens[0].maskedPrefix).toContain("••••");
    expect(parsed.max).toBe(10);
  });

  it("only lists ACTIVE tokens of its own household", async () => {
    session.memberOf.add(HH_B);
    await POST(post({ householdId: HH_A, label: "a" }));
    await POST(post({ householdId: HH_B, label: "b" }));
    const a = await (await GET(list(HH_A))).json();
    expect(a.tokens.map((t: { label: string }) => t.label)).toEqual(["a"]);
  });

  it("revokes a token, and a revoked token then fails agent auth", async () => {
    const created = await (await POST(post({ householdId: HH_A, label: "x" }))).json();
    const bearer = (t: string) =>
      new Request("http://localhost/api/agent/task", { headers: { authorization: `Bearer ${t}` } });

    const before = await verifyAgentRequest(bearer(created.token.rawToken));
    expect(before).toMatchObject({ ok: true, householdId: HH_A });

    const res = await del(created.token.id, HH_A);
    expect(res.status).toBe(200);

    const after = await verifyAgentRequest(bearer(created.token.rawToken));
    expect(after.ok).toBe(false);
    expect(after.status).toBe(403);
    expect(after.householdId).toBeNull();

    const remaining = await (await GET(list(HH_A))).json();
    expect(remaining.tokens).toHaveLength(0);
  });

  it("refuses an 11th active token (cap of 10)", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(post({ householdId: HH_A, label: `t${i}` }))).status).toBe(201);
    }
    const res = await POST(post({ householdId: HH_A, label: "one too many" }));
    expect(res.status).toBe(409);
    expect(db.tables["household_agent_tokens"]).toHaveLength(10);

    // Revoking one frees a slot.
    const first = db.tables["household_agent_tokens"][0].id as string;
    await del(first, HH_A);
    expect((await POST(post({ householdId: HH_A, label: "fits now" }))).status).toBe(201);
  });

  it("validates input", async () => {
    expect((await POST(post({ householdId: HH_A, label: "   " }))).status).toBe(400);
    expect((await POST(post({ householdId: HH_A, label: "x".repeat(61) }))).status).toBe(400);
    expect((await POST(post({ householdId: "not-a-uuid", label: "x" }))).status).toBe(400);
    expect(db.tables["household_agent_tokens"] ?? []).toHaveLength(0);
  });
});

describe("agent-tokens: non-member and anonymous", () => {
  it("non-member gets 403 on create, list and revoke, and nothing is written", async () => {
    // Seed a token in B so revoke has a real target.
    db.tables["household_agent_tokens"] = [
      { id: "33333333-3333-4333-8333-333333333333", household_id: HH_B, token_hash: "h", label: "b", created_at: "2026-01-01", revoked_at: null },
    ];
    expect((await POST(post({ householdId: HH_B, label: "sneaky" }))).status).toBe(403);
    expect((await GET(list(HH_B))).status).toBe(403);
    expect((await del("33333333-3333-4333-8333-333333333333", HH_B)).status).toBe(403);

    expect(db.tables["household_agent_tokens"]).toHaveLength(1);
    expect(db.tables["household_agent_tokens"][0].revoked_at).toBeNull();
  });

  it("a member of A cannot revoke B's token by naming A (404, untouched)", async () => {
    const rowInB = "44444444-4444-4444-8444-444444444444";
    db.tables["household_agent_tokens"] = [
      { id: rowInB, household_id: HH_B, token_hash: "h", label: "b", created_at: "2026-01-01", revoked_at: null },
    ];
    const res = await del(rowInB, HH_A);
    expect(res.status).toBe(404);
    expect(db.tables["household_agent_tokens"][0].revoked_at).toBeNull();
  });

  it("anonymous gets 401", async () => {
    session.user = null;
    expect((await POST(post({ householdId: HH_A, label: "x" }))).status).toBe(401);
    expect((await GET(list(HH_A))).status).toBe(401);
    expect((await del("55555555-5555-4555-8555-555555555555", HH_A)).status).toBe(401);
  });
});

describe("agent-tokens: scopes chosen at creation", () => {
  const seedProfile = (phone: string | null) => {
    db.tables["profiles"] = [
      { id: USER, household_id: HH_A, display_name: "אלעד", whatsapp_phone: phone },
    ];
  };

  it("default creation: default scopes, creator recorded, sensitive scopes OFF", async () => {
    const res = await POST(post({ householdId: HH_A, label: "רגיל" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token.scopes).toEqual(["read", "write"]);
    const stored = db.tables["household_agent_tokens"][0];
    expect(stored.scopes).toEqual(["read", "write"]);
    expect(stored.created_by).toBe(USER);
  });

  it("opt-in scopes are stored exactly as ticked, and the list shows them", async () => {
    seedProfile("0501234567");
    const res = await POST(
      post({ householdId: HH_A, label: "מלא", scopes: ["deliver_to_me", "delete_tasks"] })
    );
    expect(res.status).toBe(201);
    expect((await res.json()).token.scopes).toEqual(["read", "write", "deliver_to_me", "delete_tasks"]);
    const listed = await (await GET(list(HH_A))).json();
    expect(listed.tokens[0].scopes).toEqual(["read", "write", "deliver_to_me", "delete_tasks"]);
  });

  it("only ONE opt-in ticked => only that one", async () => {
    const res = await POST(post({ householdId: HH_A, label: "מחיקה", scopes: ["delete_tasks"] }));
    expect((await res.json()).token.scopes).toEqual(["read", "write", "delete_tasks"]);
  });

  it("an unknown or default-widening scope is rejected, not ignored", async () => {
    const r1 = await POST(post({ householdId: HH_A, label: "x", scopes: ["admin"] }));
    expect(r1.status).toBe(400);
    const r2 = await POST(post({ householdId: HH_A, label: "x", scopes: ["*"] }));
    expect(r2.status).toBe(400);
    expect(db.tables["household_agent_tokens"] ?? []).toHaveLength(0);
  });

  it("deliver_to_me needs a WhatsApp number in the creator's profile", async () => {
    seedProfile(null);
    const res = await POST(post({ householdId: HH_A, label: "x", scopes: ["deliver_to_me"] }));
    expect(res.status).toBe(400);
    expect(db.tables["household_agent_tokens"] ?? []).toHaveLength(0);
  });

  it("scopes cannot be widened in place: a second POST is a NEW token, the first keeps its scopes", async () => {
    const created = await (await POST(post({ householdId: HH_A, label: "x" }))).json();
    const res = await POST(post({ householdId: HH_A, label: "x", scopes: ["delete_tasks"], id: created.token.id }));
    expect(res.status).toBe(201);
    const first = db.tables["household_agent_tokens"].find((t) => t.id === created.token.id)!;
    expect(first.scopes).toEqual(["read", "write"]);
  });

  it("GET returns the recent sensitive-action audit for THIS household only", async () => {
    db.tables["agent_audit_log"] = [
      { id: "1", household_id: HH_A, action: "delete_task", outcome: "executed", token_label: "קלוד", target: "t", detail: "נמחקה: משימה", created_at: "2026-09-29T10:00:00Z" },
      { id: "2", household_id: HH_B, action: "delete_task", outcome: "executed", token_label: "זר", target: "t", detail: "של אחר", created_at: "2026-09-29T11:00:00Z" },
    ];
    const body = await (await GET(list(HH_A))).json();
    expect(body.audit).toHaveLength(1);
    expect(body.audit[0]).toMatchObject({ action: "delete_task", outcome: "executed", tokenLabel: "קלוד" });
    expect(JSON.stringify(body)).not.toContain("של אחר");
  });

  it("before migration 024: default creation still works, opt-in scopes answer 503, list degrades", async () => {
    db.missingColumns = { household_agent_tokens: ["scopes", "created_by"] };
    db.missingTables = ["agent_audit_log", "agent_confirmations"];
    seedProfile("0501234567");

    const ok = await POST(post({ householdId: HH_A, label: "ישן" }));
    expect(ok.status).toBe(201);
    expect((await ok.json()).token.scopes).toEqual(["read", "write"]);

    const blocked = await POST(post({ householdId: HH_A, label: "חדש", scopes: ["delete_tasks"] }));
    expect(blocked.status).toBe(503);
    expect(db.tables["household_agent_tokens"]).toHaveLength(1);

    const listed = await GET(list(HH_A));
    expect(listed.status).toBe(200);
    const body = await listed.json();
    expect(body.audit).toEqual([]);
    expect(body.tokens[0].scopes).toEqual(["read", "write"]);
  });
});
