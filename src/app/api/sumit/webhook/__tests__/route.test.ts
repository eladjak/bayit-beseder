/**
 * Tests for POST /api/sumit/webhook.
 *
 * Modeled on src/app/api/whatsapp/webhook/__tests__/route.test.ts — Supabase
 * is faked with a small in-memory query-builder, no real DB/Docker needed.
 *
 * Covers the 2026-09-28 billing-hardening task:
 *  - signature auth (valid / invalid / missing-in-production)
 *  - idempotency by sumit_payment_id (dedup)
 *  - unknown SKU never upgrades a tier
 *  - SABOTAGE / negative control: force the billing_events insert or the
 *    subscriptions write to return { error }, and assert the route returns
 *    a NON-2xx status — not { ok: true } — so Sumit's webhook retry logic
 *    actually kicks in on a real write failure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { POST } from "../route";

// ── fake Supabase ──────────────────────────────────────────────────────────

interface FakeSupabaseConfig {
  billingEventsInsertError?: { message: string } | null;
  dedupeCheckError?: { message: string } | null;
  subscriptionsFindError?: { message: string } | null;
  subscriptionsWriteError?: { message: string } | null;
  /** Pre-seeded dedupe store: payment ids already logged. */
  existingPaymentIds?: string[];
  /** Pre-seeded active subscription row per household id. */
  activeSubByHousehold?: Record<string, { id: string }>;
}

type FakeCall =
  | { table: "billing_events"; op: "dedupe_check"; paymentId: string }
  | { table: "billing_events"; op: "insert"; row: Record<string, unknown> }
  | { table: "subscriptions"; op: "find_active"; householdId?: string }
  | { table: "subscriptions"; op: "update"; row: Record<string, unknown>; eqs: [string, unknown][] }
  | { table: "subscriptions"; op: "insert"; row: Record<string, unknown> };

function createFakeSupabase(cfg: FakeSupabaseConfig) {
  const calls: FakeCall[] = [];
  const dedupeStore = new Set<string>(cfg.existingPaymentIds ?? []);

  function from(table: string) {
    const state: {
      op: "select" | "insert" | "update";
      eqs: [string, unknown][];
      insertRow?: Record<string, unknown>;
      updateRow?: Record<string, unknown>;
    } = { op: "select", eqs: [] };

    const resolve = (): { data: unknown; error: unknown } => {
      if (table === "billing_events") {
        if (state.op === "select") {
          const paymentId = state.eqs.find(([c]) => c === "sumit_payment_id")?.[1] as string;
          calls.push({ table, op: "dedupe_check", paymentId });
          if (cfg.dedupeCheckError) return { data: null, error: cfg.dedupeCheckError };
          return { data: dedupeStore.has(paymentId) ? { id: "existing-event" } : null, error: null };
        }
        // insert
        calls.push({ table, op: "insert", row: state.insertRow! });
        if (cfg.billingEventsInsertError) return { data: null, error: cfg.billingEventsInsertError };
        const paymentId = state.insertRow?.sumit_payment_id as string | undefined;
        if (paymentId) dedupeStore.add(paymentId);
        return { data: null, error: null };
      }

      if (table === "subscriptions") {
        if (state.op === "select") {
          const householdId = state.eqs.find(([c]) => c === "household_id")?.[1] as string | undefined;
          calls.push({ table, op: "find_active", householdId });
          if (cfg.subscriptionsFindError) return { data: null, error: cfg.subscriptionsFindError };
          const row = householdId ? cfg.activeSubByHousehold?.[householdId] : undefined;
          return { data: row ?? null, error: null };
        }
        if (state.op === "update") {
          calls.push({ table, op: "update", row: state.updateRow!, eqs: state.eqs });
          return { data: null, error: cfg.subscriptionsWriteError ?? null };
        }
        // insert
        calls.push({ table, op: "insert", row: state.insertRow! });
        return { data: null, error: cfg.subscriptionsWriteError ?? null };
      }

      return { data: null, error: { message: `fake supabase: unhandled table "${table}"` } };
    };

    const builder: {
      select: (cols: string) => typeof builder;
      insert: (row: Record<string, unknown>) => typeof builder;
      update: (row: Record<string, unknown>) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      then: <T>(onFulfilled: (value: { data: unknown; error: unknown }) => T) => Promise<T>;
    } = {
      select() {
        state.op = "select";
        return builder;
      },
      insert(row) {
        state.op = "insert";
        state.insertRow = row;
        return builder;
      },
      update(row) {
        state.op = "update";
        state.updateRow = row;
        return builder;
      },
      eq(col, val) {
        state.eqs.push([col, val]);
        return builder;
      },
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onFulfilled) => Promise.resolve(resolve()).then(onFulfilled),
    };

    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, calls };
}

function useFakeSupabase(cfg: FakeSupabaseConfig) {
  const fake = createFakeSupabase(cfg);
  vi.mocked(createClient).mockReturnValue(fake.client);
  return fake;
}

// ── payload / request builders ──────────────────────────────────────────

function makeEvent(opts: {
  eventType?: string;
  paymentId?: string;
  householdId?: string;
  sku?: string;
} = {}) {
  return {
    EventType: opts.eventType ?? "payment.succeeded",
    PaymentID: opts.paymentId ?? "PAY-1",
    DocumentID: "DOC-1",
    ExternalIdentifier: opts.householdId ?? "11111111-1111-1111-1111-111111111111",
    SKU: opts.sku ?? "plus-monthly",
  };
}

function sign(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/sumit/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

// ── setup ────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  delete process.env.SUMIT_WEBHOOK_SECRET;
  delete process.env.NODE_ENV_OVERRIDE;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ── tests: signature auth ───────────────────────────────────────────────

describe("POST /api/sumit/webhook — signature auth", () => {
  it("accepts a request whose signature header equals the shared secret verbatim (the realistic Sumit UI-configured-header case)", async () => {
    process.env.SUMIT_WEBHOOK_SECRET = "shared-secret-123";
    useFakeSupabase({});

    const body = JSON.stringify(makeEvent());
    const res = await POST(
      new NextRequest("https://example.com/api/sumit/webhook", {
        method: "POST",
        body,
        headers: { "content-type": "application/json", "x-sumit-signature": "shared-secret-123" },
      })
    );

    expect(res.status).toBe(200);
  });

  it("accepts a request whose signature header is a valid HMAC-SHA256 hex digest of the raw body (forward-compat path)", async () => {
    process.env.SUMIT_WEBHOOK_SECRET = "shared-secret-123";
    useFakeSupabase({});

    const event = makeEvent();
    const body = JSON.stringify(event);
    const signature = sign(body, "shared-secret-123");

    const res = await POST(
      new NextRequest("https://example.com/api/sumit/webhook", {
        method: "POST",
        body,
        headers: { "content-type": "application/json", "x-sumit-signature": signature },
      })
    );

    expect(res.status).toBe(200);
  });

  it("rejects with 401 when the signature header is wrong", async () => {
    process.env.SUMIT_WEBHOOK_SECRET = "shared-secret-123";
    useFakeSupabase({});

    const res = await POST(
      makeRequest(makeEvent(), { "x-sumit-signature": "totally-wrong" })
    );

    expect(res.status).toBe(401);
  });

  it("rejects with 503 when SUMIT_WEBHOOK_SECRET is unset in production — never fail-open on money", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    useFakeSupabase({});

    const res = await POST(makeRequest(makeEvent()));

    expect(res.status).toBe(503);
  });

  it("(dev-only, documented) accepts an unsigned event when SUMIT_WEBHOOK_SECRET is unset outside production", async () => {
    // NODE_ENV left as test/development by the test runner.
    useFakeSupabase({});

    const res = await POST(makeRequest(makeEvent()));

    expect(res.status).toBe(200);
  });
});

// ── tests: idempotency ──────────────────────────────────────────────────

describe("POST /api/sumit/webhook — idempotency", () => {
  it("treats a redelivery of the same sumit_payment_id as a dedup no-op, without writing subscriptions again", async () => {
    const fake = useFakeSupabase({ existingPaymentIds: ["PAY-DUP"] });

    const res = await POST(makeRequest(makeEvent({ paymentId: "PAY-DUP" })));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.dedup).toBe(true);
    expect(fake.calls.filter((c) => c.table === "subscriptions")).toHaveLength(0);
  });
});

// ── tests: SKU handling ─────────────────────────────────────────────────

describe("POST /api/sumit/webhook — SKU handling", () => {
  it("never upgrades a tier for an unknown SKU (including the retired 'family-monthly' SKU)", async () => {
    const fake = useFakeSupabase({});

    const res = await POST(makeRequest(makeEvent({ sku: "family-monthly", paymentId: "PAY-FAMILY" })));

    expect(res.status).toBe(200);
    // The event is still logged (audit trail)...
    expect(fake.calls.some((c) => c.table === "billing_events" && c.op === "insert")).toBe(true);
    // ...but no subscription write is ever attempted for an unknown SKU.
    expect(fake.calls.filter((c) => c.table === "subscriptions")).toHaveLength(0);
  });

  it("upgrades the household to 'plus' for the real plus-monthly SKU, inserting a new row when none exists", async () => {
    const fake = useFakeSupabase({});

    const res = await POST(
      makeRequest(makeEvent({ sku: "plus-monthly", paymentId: "PAY-OK", householdId: "HOUSE-A" }))
    );

    expect(res.status).toBe(200);
    const insertCall = fake.calls.find((c) => c.table === "subscriptions" && c.op === "insert");
    expect(insertCall).toBeDefined();
    if (insertCall && insertCall.table === "subscriptions" && insertCall.op === "insert") {
      expect(insertCall.row.tier).toBe("plus");
      expect(insertCall.row.status).toBe("active");
    }
  });

  it("updates the existing active row in place instead of inserting a second one", async () => {
    const fake = useFakeSupabase({
      activeSubByHousehold: { "HOUSE-B": { id: "sub-existing" } },
    });

    const res = await POST(
      makeRequest(makeEvent({ sku: "plus-monthly", paymentId: "PAY-RENEW", householdId: "HOUSE-B" }))
    );

    expect(res.status).toBe(200);
    expect(fake.calls.some((c) => c.table === "subscriptions" && c.op === "insert")).toBe(false);
    const updateCall = fake.calls.find((c) => c.table === "subscriptions" && c.op === "update");
    expect(updateCall).toBeDefined();
    if (updateCall && updateCall.table === "subscriptions" && updateCall.op === "update") {
      expect(updateCall.eqs).toEqual([["id", "sub-existing"]]);
    }
  });
});

// ── tests: SABOTAGE / negative control ──────────────────────────────────

describe("POST /api/sumit/webhook — write-failure handling (negative control)", () => {
  it("returns a NON-2xx status when the billing_events insert fails, so Sumit retries instead of believing { ok: true }", async () => {
    useFakeSupabase({ billingEventsInsertError: { message: "relation does not exist" } });

    const res = await POST(makeRequest(makeEvent({ paymentId: "PAY-BOOM-1" })));
    const json = await res.json();

    expect(res.status).not.toBe(200);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(json.ok).not.toBe(true);
  });

  it("returns a NON-2xx status when the subscriptions insert fails on a brand-new household", async () => {
    useFakeSupabase({ subscriptionsWriteError: { message: "constraint violation" } });

    const res = await POST(
      makeRequest(makeEvent({ paymentId: "PAY-BOOM-2", householdId: "HOUSE-NEW" }))
    );
    const json = await res.json();

    expect(res.status).not.toBe(200);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(json.ok).not.toBe(true);
  });

  it("returns a NON-2xx status when the subscriptions update fails on an existing active row", async () => {
    useFakeSupabase({
      activeSubByHousehold: { "HOUSE-C": { id: "sub-c" } },
      subscriptionsWriteError: { message: "constraint violation" },
    });

    const res = await POST(
      makeRequest(makeEvent({ paymentId: "PAY-BOOM-3", householdId: "HOUSE-C" }))
    );
    const json = await res.json();

    expect(res.status).not.toBe(200);
    expect(json.ok).not.toBe(true);
  });

  it("returns 500 when the dedupe check itself errors, rather than silently proceeding to double-write", async () => {
    useFakeSupabase({ dedupeCheckError: { message: "connection reset" } });

    const res = await POST(makeRequest(makeEvent({ paymentId: "PAY-BOOM-4" })));

    expect(res.status).toBe(500);
  });
});

// ── tests: failure / cancellation events downgrade tier ─────────────────

describe("POST /api/sumit/webhook — failure and cancellation events", () => {
  it("marks the active subscription past_due on a payment.failed event", async () => {
    const fake = useFakeSupabase({
      activeSubByHousehold: { "HOUSE-D": { id: "sub-d" } },
    });

    const res = await POST(
      makeRequest(
        makeEvent({ eventType: "payment.failed", paymentId: "PAY-FAIL", householdId: "HOUSE-D" })
      )
    );

    expect(res.status).toBe(200);
    const updateCall = fake.calls.find((c) => c.table === "subscriptions" && c.op === "update");
    expect(updateCall).toBeDefined();
    if (updateCall && updateCall.table === "subscriptions" && updateCall.op === "update") {
      expect(updateCall.row.status).toBe("past_due");
    }
  });

  it("marks the active subscription canceled on a recurring.cancelled event, and sets canceled_at", async () => {
    const fake = useFakeSupabase({
      activeSubByHousehold: { "HOUSE-E": { id: "sub-e" } },
    });

    const res = await POST(
      makeRequest(
        makeEvent({ eventType: "recurring.cancelled", paymentId: "PAY-CANCEL", householdId: "HOUSE-E" })
      )
    );

    expect(res.status).toBe(200);
    const updateCall = fake.calls.find((c) => c.table === "subscriptions" && c.op === "update");
    expect(updateCall).toBeDefined();
    if (updateCall && updateCall.table === "subscriptions" && updateCall.op === "update") {
      expect(updateCall.row.status).toBe("canceled");
      expect(updateCall.row.canceled_at).toBeTruthy();
    }
  });

  it("is a no-op (not an error) when a cancellation event arrives for a household with no active row", async () => {
    const fake = useFakeSupabase({});

    const res = await POST(
      makeRequest(
        makeEvent({ eventType: "recurring.cancelled", paymentId: "PAY-CANCEL-NOOP", householdId: "HOUSE-F" })
      )
    );

    expect(res.status).toBe(200);
    expect(fake.calls.some((c) => c.table === "subscriptions" && c.op === "update")).toBe(false);
  });
});
