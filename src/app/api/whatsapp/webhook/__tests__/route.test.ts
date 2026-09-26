/**
 * Tests for POST /api/whatsapp/webhook.
 *
 * Covers, per the 2026-09-25 prep-stage task:
 *  - webhook token auth (missing / wrong / right / unset-fail-open)
 *  - idempotency by Green API idMessage (duplicate delivery → single completion)
 *  - foreign/unknown sender (phone not linked to any household)
 *  - household boundary: a sender is scoped strictly to their own household's
 *    task list and the completing UPDATE carries that same household filter
 *
 * Supabase is faked with a small in-memory query-builder rather than hitting
 * a real Postgres instance (no local Supabase/Docker was available in this
 * worktree — see PROGRESS.md and the task report for that limitation).
 * @/lib/whatsapp is mocked so no real Green API call is ever made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true, idMessage: "OUT1" }),
  extractPhoneFromChatId: (chatId: string) => chatId.replace("@c.us", ""),
}));

import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { POST } from "../route";

// ── fake Supabase ──────────────────────────────────────────────────────────

interface FakeTask {
  id: string;
  title: string;
  status: string;
}

interface FakeSupabaseConfig {
  /** profile keyed by whatsapp_phone (E.164, no @c.us) */
  profilesByPhone?: Record<string, { id: string; household_id: string | null }>;
  /** today's incomplete tasks, keyed by household_id */
  tasksByHousehold?: Record<string, FakeTask[]>;
  updateError?: { message: string } | null;
  dedupeCheckError?: { message: string } | null;
  dedupeInsertError?: { message: string } | null;
}

type FakeCall =
  | { table: "whatsapp_webhook_events"; op: "check"; idMessage: string }
  | { table: "whatsapp_webhook_events"; op: "insert"; row: Record<string, unknown> }
  | { table: "profiles"; op: "select"; phone: string }
  | { table: "tasks"; op: "select"; householdId?: string }
  | { table: "tasks"; op: "update"; row: Record<string, unknown>; eqs: [string, unknown][] };

function createFakeSupabase(cfg: FakeSupabaseConfig) {
  const calls: FakeCall[] = [];
  // Real, mutable dedupe store so two POSTs against the SAME fake client
  // observe each other — this is what makes the "duplicate delivery" test
  // meaningful rather than just asserting on a fixed canned response.
  const dedupeStore = new Map<string, Record<string, unknown>>();

  function from(table: string) {
    const state: {
      op: "select" | "insert" | "update";
      eqs: [string, unknown][];
      insertRow?: Record<string, unknown>;
      updateRow?: Record<string, unknown>;
    } = { op: "select", eqs: [] };

    const resolve = (): { data: unknown; error: unknown } => {
      if (table === "whatsapp_webhook_events") {
        if (state.op === "select") {
          const idMessage = state.eqs.find(([c]) => c === "id_message")?.[1] as string;
          calls.push({ table, op: "check", idMessage });
          if (cfg.dedupeCheckError) return { data: null, error: cfg.dedupeCheckError };
          return { data: dedupeStore.has(idMessage) ? { id_message: idMessage } : null, error: null };
        }
        // insert
        calls.push({ table, op: "insert", row: state.insertRow! });
        if (cfg.dedupeInsertError) return { data: null, error: cfg.dedupeInsertError };
        dedupeStore.set(state.insertRow!.id_message as string, state.insertRow!);
        return { data: null, error: null };
      }

      if (table === "profiles") {
        const phone = state.eqs.find(([c]) => c === "whatsapp_phone")?.[1] as string;
        calls.push({ table, op: "select", phone });
        const profile = cfg.profilesByPhone?.[phone] ?? null;
        return { data: profile, error: profile ? null : { message: "not found" } };
      }

      if (table === "tasks") {
        if (state.op === "select") {
          const householdId = state.eqs.find(([c]) => c === "household_id")?.[1] as
            | string
            | undefined;
          calls.push({ table, op: "select", householdId });
          return { data: householdId ? (cfg.tasksByHousehold?.[householdId] ?? []) : [], error: null };
        }
        // update
        calls.push({ table, op: "update", row: state.updateRow!, eqs: state.eqs });
        return { data: null, error: cfg.updateError ?? null };
      }

      return { data: null, error: { message: `fake supabase: unhandled table "${table}"` } };
    };

    const builder: {
      select: (cols: string) => typeof builder;
      insert: (row: Record<string, unknown>) => typeof builder;
      update: (row: Record<string, unknown>) => typeof builder;
      eq: (col: string, val: unknown) => typeof builder;
      neq: (col: string, val: unknown) => typeof builder;
      order: () => typeof builder;
      single: () => Promise<{ data: unknown; error: unknown }>;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      then: <T>(
        onFulfilled: (value: { data: unknown; error: unknown }) => T
      ) => Promise<T>;
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
      neq() {
        return builder;
      },
      order() {
        return builder;
      },
      single: () => Promise.resolve(resolve()),
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onFulfilled) => Promise.resolve(resolve()).then(onFulfilled),
    };

    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, calls, dedupeStore };
}

// ── payload builder ──────────────────────────────────────────────────────

let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function makePayload(opts: {
  idMessage?: string;
  sender?: string; // "972501234567@c.us"
  text?: string;
  instanceId?: string;
}) {
  const sender = opts.sender ?? "972501234567@c.us";
  return {
    typeWebhook: "incomingMessageReceived",
    instanceData: { idInstance: Number(opts.instanceId ?? "7100000001") },
    timestamp: 1_700_000_000,
    idMessage: opts.idMessage ?? "MSG-DEFAULT",
    senderData: { chatId: sender, sender, chatName: "Test", senderName: "Test" },
    messageData: {
      typeMessage: "textMessage",
      textMessageData: { textMessage: opts.text ?? "1" },
    },
  };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/whatsapp/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": nextIp(),
      ...headers,
    },
  });
}

// ── setup ────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  process.env.GREEN_API_INSTANCE_ID = "7100000001";
  delete process.env.WHATSAPP_WEBHOOK_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function useFakeSupabase(cfg: FakeSupabaseConfig) {
  const fake = createFakeSupabase(cfg);
  vi.mocked(createClient).mockReturnValue(fake.client);
  return fake;
}

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";
const HOUSEHOLD_B = "22222222-2222-2222-2222-222222222222";

// ── tests: webhook token auth ───────────────────────────────────────────

describe("POST /api/whatsapp/webhook — token auth", () => {
  it("rejects with 401 when WHATSAPP_WEBHOOK_TOKEN is set and no Authorization header is sent", async () => {
    process.env.WHATSAPP_WEBHOOK_TOKEN = "correct-token";
    useFakeSupabase({});

    const res = await POST(makeRequest(makePayload({})));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("rejects with 401 when WHATSAPP_WEBHOOK_TOKEN is set and the wrong token is sent", async () => {
    process.env.WHATSAPP_WEBHOOK_TOKEN = "correct-token";
    useFakeSupabase({});

    const res = await POST(
      makeRequest(makePayload({}), { authorization: "Bearer wrong-token" })
    );

    expect(res.status).toBe(401);
  });

  it("accepts the request when the correct Bearer token is sent", async () => {
    process.env.WHATSAPP_WEBHOOK_TOKEN = "correct-token";
    useFakeSupabase({
      profilesByPhone: { "972501234567": { id: "user-1", household_id: HOUSEHOLD_A } },
      tasksByHousehold: { [HOUSEHOLD_A]: [{ id: "task-1", title: "שטיפת כלים", status: "pending" }] },
    });

    const res = await POST(
      makeRequest(makePayload({ text: "1" }), { authorization: "Bearer correct-token" })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
  });

  it("(control) accepts the request unauthenticated when WHATSAPP_WEBHOOK_TOKEN is not set — documented fail-open", async () => {
    // WHATSAPP_WEBHOOK_TOKEN deliberately left unset by beforeEach().
    useFakeSupabase({
      profilesByPhone: { "972501234567": { id: "user-1", household_id: HOUSEHOLD_A } },
      tasksByHousehold: { [HOUSEHOLD_A]: [{ id: "task-1", title: "שטיפת כלים", status: "pending" }] },
    });

    const res = await POST(makeRequest(makePayload({ text: "1" })));

    expect(res.status).toBe(200);
  });
});

// ── tests: idempotency ──────────────────────────────────────────────────

describe("POST /api/whatsapp/webhook — idempotency (Green API idMessage)", () => {
  it("completes the task once and treats a redelivery of the same idMessage as a no-op", async () => {
    const fake = useFakeSupabase({
      profilesByPhone: { "972501234567": { id: "user-1", household_id: HOUSEHOLD_A } },
      tasksByHousehold: {
        [HOUSEHOLD_A]: [{ id: "task-1", title: "שטיפת כלים", status: "pending" }],
      },
    });

    const payload = makePayload({ idMessage: "DUP-MSG-1", text: "1" });

    const first = await POST(makeRequest(payload));
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(firstJson.duplicate).toBeUndefined();

    const second = await POST(makeRequest(payload));
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.duplicate).toBe(true);

    // The state-changing write must only have happened once.
    const updateCalls = fake.calls.filter((c) => c.table === "tasks" && c.op === "update");
    expect(updateCalls).toHaveLength(1);

    // Only ONE completion reply was sent — the duplicate never reached sendReply.
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
  });

  it("still processes normally (and logs) when idMessage is missing — documented gap, not a crash", async () => {
    const fake = useFakeSupabase({
      profilesByPhone: { "972501234567": { id: "user-1", household_id: HOUSEHOLD_A } },
      tasksByHousehold: {
        [HOUSEHOLD_A]: [{ id: "task-1", title: "שטיפת כלים", status: "pending" }],
      },
    });

    const payload = makePayload({ text: "1" });
    // Force idMessage away entirely, including the default set by makePayload.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (payload as any).idMessage;

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);

    const dedupeCalls = fake.calls.filter((c) => c.table === "whatsapp_webhook_events");
    expect(dedupeCalls).toHaveLength(0);
  });

  it("degrades gracefully (proceeds) when the dedupe table query errors — e.g. migration 016 not applied", async () => {
    useFakeSupabase({
      profilesByPhone: { "972501234567": { id: "user-1", household_id: HOUSEHOLD_A } },
      tasksByHousehold: {
        [HOUSEHOLD_A]: [{ id: "task-1", title: "שטיפת כלים", status: "pending" }],
      },
      dedupeCheckError: { message: 'relation "whatsapp_webhook_events" does not exist' },
    });

    const res = await POST(makeRequest(makePayload({ text: "1" })));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ── tests: foreign / unknown sender ─────────────────────────────────────

describe("POST /api/whatsapp/webhook — unknown sender", () => {
  it("silently ignores a phone number that is not linked to any household", async () => {
    const fake = useFakeSupabase({
      profilesByPhone: {}, // nobody registered
      tasksByHousehold: { [HOUSEHOLD_A]: [{ id: "task-1", title: "X", status: "pending" }] },
    });

    const res = await POST(
      makeRequest(makePayload({ sender: "972599999999@c.us", text: "1" }))
    );

    expect(res.status).toBe(200);
    // No reply sent to a stranger, and the task list was never even queried.
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    const taskSelects = fake.calls.filter((c) => c.table === "tasks" && c.op === "select");
    expect(taskSelects).toHaveLength(0);
  });
});

// ── tests: household boundary ───────────────────────────────────────────

describe("POST /api/whatsapp/webhook — household boundary", () => {
  it("scopes the task list to the sender's OWN household, never a different household's tasks", async () => {
    const fake = useFakeSupabase({
      profilesByPhone: {
        "972501111111": { id: "user-a", household_id: HOUSEHOLD_A },
      },
      tasksByHousehold: {
        [HOUSEHOLD_A]: [{ id: "task-a1", title: "משימה של בית A", status: "pending" }],
        [HOUSEHOLD_B]: [
          { id: "task-b1", title: "משימה של בית B — סודית", status: "pending" },
          { id: "task-b2", title: "עוד משימה של בית B", status: "pending" },
        ],
      },
    });

    const res = await POST(
      makeRequest(makePayload({ sender: "972501111111@c.us", text: "1" }))
    );

    expect(res.status).toBe(200);

    // The tasks query must have been scoped to household A, never B.
    const taskSelect = fake.calls.find((c) => c.table === "tasks" && c.op === "select");
    expect(taskSelect).toBeDefined();
    if (taskSelect && taskSelect.table === "tasks" && taskSelect.op === "select") {
      expect(taskSelect.householdId).toBe(HOUSEHOLD_A);
    }

    // The completing UPDATE must be scoped to household A's task, not any
    // household-B task, and must itself carry a household_id filter.
    const update = fake.calls.find((c) => c.table === "tasks" && c.op === "update");
    expect(update).toBeDefined();
    if (update && update.table === "tasks" && update.op === "update") {
      const idEq = update.eqs.find(([col]) => col === "id");
      const hidEq = update.eqs.find(([col]) => col === "household_id");
      expect(idEq?.[1]).toBe("task-a1");
      expect(hidEq?.[1]).toBe(HOUSEHOLD_A);
    }
  });

  it("a sender in household A can never complete a household-B task even by numbering, because their numbered list never contains household-B tasks", async () => {
    const fake = useFakeSupabase({
      profilesByPhone: {
        "972502222222": { id: "user-a", household_id: HOUSEHOLD_A },
      },
      tasksByHousehold: {
        [HOUSEHOLD_A]: [], // household A has NO tasks today
        [HOUSEHOLD_B]: [{ id: "task-b1", title: "משימה של בית B", status: "pending" }],
      },
    });

    // Sender from household A replies "1" — if the endpoint were not scoped,
    // an off-by-list-source bug could resolve to household B's task #1.
    const res = await POST(
      makeRequest(makePayload({ sender: "972502222222@c.us", text: "1" }))
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("no tasks today");

    // No update ever touched household B's task.
    const update = fake.calls.find((c) => c.table === "tasks" && c.op === "update");
    expect(update).toBeUndefined();
  });
});
