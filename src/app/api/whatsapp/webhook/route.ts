import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { sendWhatsAppMessage, extractPhoneFromChatId } from "@/lib/whatsapp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 30 requests per minute — allows burst traffic from Green API retries
// while blocking abusive callers.
const limiter = rateLimit({ windowMs: 60_000, max: 30 });

/**
 * Has this instance already reported the missing-token condition?
 *
 * The report fires ONCE per cold start, not once per request: the alert is
 * about a configuration state, not about traffic, so a per-request report
 * would produce hundreds of duplicates for a single underlying cause and
 * train the reader to ignore it.
 */
let missingTokenReported = false;

/**
 * Make the fail-open VISIBLE, and say exactly what closes it.
 *
 * This endpoint accepts unauthenticated requests from anyone on the
 * internet when WHATSAPP_WEBHOOK_TOKEN is unset. This function does NOT
 * close that hole (closing it before the token exists would take the live
 * reply-to-complete flow down). It only ensures the condition is reported
 * somewhere a human actually looks, instead of a console.warn nobody reads.
 *
 * Closing it needs no code change: the moment WHATSAPP_WEBHOOK_TOKEN is set
 * in Vercel AND the same value is set as `webhookUrlToken` in the Green API
 * instance settings (SetSettings / console), the very next request enforces
 * it — see the `if (webhookToken)` branch below.
 */
function reportMissingWebhookToken() {
  if (missingTokenReported) return;
  missingTokenReported = true;

  const msg =
    "[whatsapp/webhook] WHATSAPP_WEBHOOK_TOKEN is not set — this endpoint " +
    "accepts unauthenticated requests from anyone on the internet. Set " +
    "WHATSAPP_WEBHOOK_TOKEN in Vercel AND the same value as webhookUrlToken " +
    "in the Green API instance settings to close this (no redeploy needed " +
    "once both are set).";

  console.error(msg);

  if (process.env.NODE_ENV === "production") {
    Sentry.captureMessage(msg, {
      level: "error",
      tags: { area: "webhook-auth", endpoint: "whatsapp" },
    });
  }
}

/** Constant-time string compare that never throws on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison against a fixed-length buffer so the timing
    // does not leak the token length, then return false.
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages from Green API webhook.
 * Parses reply-to-complete: user replies with task number to mark it done.
 *
 * Supported formats:
 *   "1"       → complete task #1
 *   "בוצע 3"  → complete task #3
 *   "done 2"  → complete task #2
 *   "✅2"     → complete task #2
 */
export async function POST(request: NextRequest) {
  // A6: Rate limiting — protect against webhook flooding.
  const rateLimitResult = await limiter.check(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimitResult.reset / 1000)) },
      }
    );
  }

  // A2: Webhook authentication.
  //
  // Green API's ONLY supported webhook-authentication mechanism is a static
  // token: it sends `Authorization: Bearer <webhookUrlToken>` on every
  // webhook request, where `webhookUrlToken` is a field you set once via
  // the SetSettings API / instance console. Green API does NOT support
  // HMAC body-signing — there is no `x-webhook-signature` header it can
  // send. (Verified against Green API's own docs, 2026-09-25.) This route
  // previously implemented an HMAC-SHA256 check that real Green API traffic
  // could never satisfy — see docs/whatsapp-webhook-secret.md for the
  // history and the token-based replacement.
  //
  // When WHATSAPP_WEBHOOK_TOKEN is set, the caller must send a matching
  // bearer token. When it is unset, we log/report and continue unsigned —
  // see reportMissingWebhookToken() above.
  const rawBody = await request.text();
  const webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (webhookToken) {
    const authHeader = request.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const presented = match?.[1]?.trim();

    if (!presented || !safeEqual(presented, webhookToken)) {
      console.warn("[webhook] Missing or invalid webhook token — request rejected");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // NOTE: this branch is the fail-open path, and it is the LIVE path in
    // production today (as of 2026-09-25). It deliberately still continues
    // — see reportMissingWebhookToken() above for why this only reports.
    reportMissingWebhookToken();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // A1: Validate that this webhook originates from our Green API instance
  const expectedInstance = process.env.GREEN_API_INSTANCE_ID;
  if (expectedInstance) {
    const receivedInstance = body.instanceData?.idInstance?.toString();
    if (receivedInstance !== expectedInstance) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Green API webhook payload
  const type = body.typeWebhook;
  if (type !== "incomingMessageReceived") {
    // Acknowledge non-message webhooks (stateInstanceChanged, etc.)
    return NextResponse.json({ ok: true });
  }

  const messageData = body.messageData;
  if (!messageData || messageData.typeMessage !== "textMessage") {
    return NextResponse.json({ ok: true });
  }

  const text = (messageData.textMessageData?.textMessage ?? "").trim();
  const chatId = body.senderData?.chatId as string | undefined;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true });
  }

  // Parse task number from reply
  const taskNumber = parseTaskNumber(text);
  if (taskNumber === null) {
    return NextResponse.json({ ok: true, ignored: "not a task completion" });
  }

  // Get Supabase service client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Idempotency: Green API redelivers a webhook on timeout/non-2xx, and can
  // in principle deliver the same message twice for other reasons too. Each
  // delivery carries a stable `idMessage` (verified against Green API's own
  // docs, 2026-09-25 — it is a top-level field, e.g.
  // "F7AEC1B7086ECDC7E6E45923F5EDB825"). We use it to make sure a redelivery
  // of an already-completed reply does not complete the same task twice.
  //
  // This check is check-then-act, not atomic (same pattern already used by
  // this repo's sibling route, api/sumit/webhook, for billing_events): two
  // truly concurrent deliveries of the same idMessage could both pass the
  // check before either records it. Green API retries are sequential
  // (deliver → wait for response → retry only on failure), so this window
  // is narrow in practice, and is documented here rather than hidden.
  //
  // If whatsapp_webhook_events does not exist yet (migration
  // supabase/migrations/016_whatsapp_webhook_dedupe.sql not applied), this
  // is a idempotency nicety, not a security control — degrade to
  // "cannot verify, proceed" rather than failing the whole webhook.
  const idMessage: string | undefined =
    typeof body.idMessage === "string" && body.idMessage ? body.idMessage : undefined;

  if (idMessage) {
    const { data: existingEvent, error: dedupeCheckErr } = await supabase
      .from("whatsapp_webhook_events")
      .select("id_message")
      .eq("id_message", idMessage)
      .maybeSingle();

    if (dedupeCheckErr) {
      console.error(
        "[webhook] dedupe check failed (table may be missing — see " +
          "supabase/migrations/016_whatsapp_webhook_dedupe.sql), proceeding without it:",
        dedupeCheckErr.message
      );
    } else if (existingEvent) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } else {
    console.warn(
      "[webhook] incoming message has no idMessage — cannot dedupe this delivery"
    );
  }

  // C3: Identify the sender by their WhatsApp phone number.
  // Green API sender format: "972501234567@c.us" → strip suffix to get E.164 number.
  const senderPhone = (body.senderData?.sender as string | undefined)
    ?.replace("@c.us", "")
    ?? chatId.replace(/@.*$/, "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, household_id")
    .eq("whatsapp_phone", senderPhone)
    .single();

  if (!profile) {
    // Unknown sender – silently ignore to avoid leaking task info to strangers.
    return NextResponse.json({ ok: true });
  }

  if (!profile.household_id) {
    await sendReply(chatId, "לא נמצא בית מקושר לחשבון שלכם. עדכנו את הגדרות הבית.");
    return NextResponse.json({ ok: true, message: "no household" });
  }

  const today = new Date().toISOString().slice(0, 10);

  // C3: Find today's incomplete tasks scoped to this user's household only.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("due_date", today)
    .eq("household_id", profile.household_id)
    .neq("status", "completed")
    .order("created_at", { ascending: true });

  if (!tasks || tasks.length === 0) {
    await sendReply(chatId, "אין משימות פתוחות להיום 🎉");
    return NextResponse.json({ ok: true, message: "no tasks today" });
  }

  if (taskNumber < 1 || taskNumber > tasks.length) {
    await sendReply(
      chatId,
      `מספר לא תקין. יש ${tasks.length} משימות היום (1-${tasks.length})`
    );
    return NextResponse.json({ ok: true, message: "invalid task number" });
  }

  const task = tasks[taskNumber - 1];

  // C3: Mark task as completed and attribute it to the identified user.
  // household_id filter is a second safety line even though `task` was
  // already selected scoped to `profile.household_id` above: it means this
  // UPDATE can never touch a row outside the sender's household even if the
  // in-memory `tasks` array above were ever built incorrectly.
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", assigned_to: profile.id })
    .eq("id", task.id)
    .eq("household_id", profile.household_id);

  if (error) {
    await sendReply(chatId, "שגיאה בעדכון המשימה, נסו שוב");
    console.error("[webhook] Task update failed:", error.message);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  // Record this delivery as processed. Best-effort: if this insert fails we
  // still confirm the completion to the user (it already happened), but log
  // loudly — a retry of this exact idMessage could now double-complete.
  if (idMessage) {
    const { error: dedupeInsertErr } = await supabase
      .from("whatsapp_webhook_events")
      .insert({ id_message: idMessage, chat_id: chatId, task_id: task.id });

    if (dedupeInsertErr) {
      console.error(
        "[webhook] failed to record dedupe marker — a retry of this delivery " +
          "could double-complete the task:",
        dedupeInsertErr.message
      );
    }
  }

  // Count remaining tasks
  const remaining = tasks.length - 1;
  const confirmMsg =
    remaining === 0
      ? `✅ ${task.title} הושלמה!\n\n🎉 כל המשימות להיום הושלמו! יום מצוין!`
      : `✅ ${task.title} הושלמה!\n\nנשארו עוד ${remaining} משימות להיום`;

  await sendReply(chatId, confirmMsg);

  // A8: Minimize response data — never echo task details back to caller
  return NextResponse.json({ ok: true });
}

function parseTaskNumber(text: string): number | null {
  // Direct number: "1", "2", "3"
  if (/^\d+$/.test(text)) {
    return parseInt(text, 10);
  }

  // Hebrew: "בוצע 1", "בוצע1", "סיימתי 2"
  const hebrewMatch = text.match(/(?:בוצע|סיימתי|עשיתי|השלמתי)\s*(\d+)/);
  if (hebrewMatch) {
    return parseInt(hebrewMatch[1], 10);
  }

  // English: "done 1", "done1"
  const englishMatch = text.match(/(?:done|complete|finished)\s*(\d+)/i);
  if (englishMatch) {
    return parseInt(englishMatch[1], 10);
  }

  // Emoji: "✅1", "✅ 2"
  const emojiMatch = text.match(/[✅✔️☑️]\s*(\d+)/);
  if (emojiMatch) {
    return parseInt(emojiMatch[1], 10);
  }

  return null;
}

async function sendReply(chatId: string, message: string) {
  const phone = extractPhoneFromChatId(chatId);
  await sendWhatsAppMessage(phone, message);
}
