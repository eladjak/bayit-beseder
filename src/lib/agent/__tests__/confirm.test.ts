/**
 * The confirm-token store, exercised directly (the route tests cover the same
 * gate end to end). Every rejection reason is produced by a real cause.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { createFakeDb, createFakeSupabase } from "./fake-supabase";
import {
  CONFIRM_TTL_MS,
  consumeConfirmation,
  createConfirmation,
  fingerprint,
  type ConfirmBinding,
} from "../confirm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const binding: ConfirmBinding = {
  tokenId: "tok-1",
  householdId: "hh-1",
  action: "delete_task",
  target: "task-1",
};
const client = (db: ReturnType<typeof createFakeDb>) =>
  createFakeSupabase(db) as unknown as SupabaseClient<Database>;

describe("confirmation store", () => {
  it("issues a token, stores only its hash, expires in 5 minutes", async () => {
    const db = createFakeDb();
    const now = new Date("2026-09-29T10:00:00Z");
    const made = await createConfirmation(client(db), binding, now);
    if (!made.ok) throw new Error("expected ok");
    const row = db.tables["agent_confirmations"][0];
    expect(row.confirm_hash).toBe(createHash("sha256").update(made.confirmToken).digest("hex"));
    expect(JSON.stringify(row)).not.toContain(made.confirmToken);
    expect(new Date(row.expires_at as string).getTime() - now.getTime()).toBe(CONFIRM_TTL_MS);
    expect(CONFIRM_TTL_MS).toBe(300_000);
  });

  it("consumes exactly once: the second use is 'used'", async () => {
    const db = createFakeDb();
    const c = client(db);
    const made = await createConfirmation(c, binding);
    if (!made.ok) throw new Error("expected ok");
    expect(await consumeConfirmation(c, binding, made.confirmToken)).toEqual({ ok: true });
    expect(await consumeConfirmation(c, binding, made.confirmToken)).toEqual({
      ok: false,
      reason: "used",
    });
  });

  it("rejects after the TTL (expired) and does not consume it", async () => {
    const db = createFakeDb();
    const c = client(db);
    const t0 = new Date("2026-09-29T10:00:00Z");
    const made = await createConfirmation(c, binding, t0);
    if (!made.ok) throw new Error("expected ok");
    const late = new Date(t0.getTime() + CONFIRM_TTL_MS + 1);
    expect(await consumeConfirmation(c, binding, made.confirmToken, late)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(db.tables["agent_confirmations"][0].used_at ?? null).toBeNull();
    // one millisecond before the deadline it is still valid
    const edge = new Date(t0.getTime() + CONFIRM_TTL_MS - 1);
    expect(await consumeConfirmation(c, binding, made.confirmToken, edge)).toEqual({ ok: true });
  });

  it.each([
    ["token", { tokenId: "tok-2" }],
    ["household", { householdId: "hh-2" }],
    ["action", { action: "deliver_to_me" as const }],
    ["target", { target: "task-2" }],
  ])("a different %s is a mismatch and burns nothing", async (_n, change) => {
    const db = createFakeDb();
    const c = client(db);
    const made = await createConfirmation(c, binding);
    if (!made.ok) throw new Error("expected ok");
    expect(await consumeConfirmation(c, { ...binding, ...change }, made.confirmToken)).toEqual({
      ok: false,
      reason: "mismatch",
    });
    // the legitimate holder can still use it
    expect(await consumeConfirmation(c, binding, made.confirmToken)).toEqual({ ok: true });
  });

  it("an unknown token is 'invalid'", async () => {
    const c = client(createFakeDb());
    expect(await consumeConfirmation(c, binding, "bbs_confirm_nope")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("unavailable store: cannot issue, cannot consume (fails closed)", async () => {
    const db = createFakeDb();
    db.missingTables = ["agent_confirmations"];
    const c = client(db);
    expect(await createConfirmation(c, binding)).toEqual({ ok: false, reason: "unavailable" });
    expect(await consumeConfirmation(c, binding, "bbs_confirm_x")).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("fingerprint ignores formatting but distinguishes numbers", () => {
    expect(fingerprint("050-111 1111")).toBe(fingerprint("0501111111"));
    expect(fingerprint("0501111111")).not.toBe(fingerprint("0503333333"));
    expect(fingerprint("0501111111")).toHaveLength(16);
  });
});
