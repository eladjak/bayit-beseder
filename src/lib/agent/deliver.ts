/**
 * Agent WhatsApp delivery.
 *
 * When an agent request sets `deliver: "whatsapp"`, the generated Hebrew
 * `whatsappText` is sent by WhatsApp, and ONLY to the person who owns the
 * credential:
 *
 *  - Per-household token: needs the opt-in `deliver_to_me` scope, goes ONLY to
 *    the WhatsApp number in the profile of the member who CREATED the token,
 *    and is a two-step action (preview + single-use confirm_token, see
 *    src/lib/agent/confirm.ts). See `deliverWhatsApp`.
 *  - Legacy shared key (the owner's own, transition period): to the number in
 *    the `BAYIT_AGENT_WHATSAPP_TO` environment variable. See `maybeDeliverToOwner`.
 *
 * SAFETY LINE (do not cross): the recipient is NEVER read from the request. An
 * agent can ask us to deliver, but cannot choose the recipient. A request that
 * even names another number/member is rejected outright. If the recipient
 * cannot be resolved, delivery fails closed.
 *
 * Transport: reuses the app's existing, already-live Green API client
 * (`sendWhatsAppMessage` in `src/lib/whatsapp.ts`) — the same path the
 * daily-brief cron uses. No new WhatsApp integration is introduced.
 */

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import type { AgentAuthResult } from "@/lib/agent/auth";
import { getServiceClient } from "@/lib/agent/auth";
import { hasScope } from "@/lib/agent/scopes";
import {
  CONSUME_MESSAGES,
  consumeConfirmation,
  createConfirmation,
  fingerprint,
} from "@/lib/agent/confirm";
import { logAgentAudit } from "@/lib/agent/audit";

export type DeliverChannel = "whatsapp";

export interface DeliveryResult {
  attempted: boolean;
  channel: DeliverChannel | null;
  /** true only when the message was actually accepted by the transport. */
  sent: boolean;
  /** Hebrew-friendly status for the agent / logs. Never includes the number. */
  status: string;
  idMessage?: string;
  /** deliver_to_me, step 1: nothing sent yet; call again with `confirm_token`. */
  requiresConfirmation?: boolean;
  confirmToken?: string;
  expiresInSeconds?: number;
  /** Masked recipient so the human can check it is their own number. */
  recipient?: string;
  /** The request was refused (bad/used/expired confirm, no phone...). Routes answer 409. */
  rejected?: boolean;
}

const NOT_REQUESTED: DeliveryResult = {
  attempted: false,
  channel: null,
  sent: false,
  status: "לא התבקשה שליחה",
};

/** Read Elad's fixed recipient number from env (the only allowed recipient). */
function getOwnerRecipient(): string | undefined {
  return process.env.BAYIT_AGENT_WHATSAPP_TO?.trim() || undefined;
}

/**
 * Deliver `text` to Elad's WhatsApp when `deliver === "whatsapp"`.
 *
 * Returns a structured result. Never throws — a failed send must not break the
 * primary plan/brief response (the JSON + whatsappText are still useful).
 */
export async function maybeDeliverToOwner(
  deliver: DeliverChannel | undefined,
  text: string
): Promise<DeliveryResult> {
  if (deliver !== "whatsapp") {
    return NOT_REQUESTED;
  }

  const recipient = getOwnerRecipient();
  if (!recipient) {
    // Fail closed: feature requested but server not configured to send.
    return {
      attempted: true,
      channel: "whatsapp",
      sent: false,
      status:
        "שליחת WhatsApp אינה מוגדרת בשרת (BAYIT_AGENT_WHATSAPP_TO לא הוגדר).",
    };
  }

  try {
    const result = await sendWhatsAppMessage(recipient, text);
    if (result.success) {
      return {
        attempted: true,
        channel: "whatsapp",
        sent: true,
        status: "נשלח ל-WhatsApp של אלעד",
        idMessage: result.idMessage,
      };
    }
    return {
      attempted: true,
      channel: "whatsapp",
      sent: false,
      // Surface a generic failure — do not leak the raw Green API error verbatim
      // to the agent, but keep enough to debug from server logs.
      status: "שליחת WhatsApp נכשלה",
    };
  } catch {
    return {
      attempted: true,
      channel: "whatsapp",
      sent: false,
      status: "שגיאת תקשורת בשליחת WhatsApp",
    };
  }
}

// ── deliver_to_me: per-household tokens ───────────────────────────────────────

export type DeliverKind = "plan" | "brief" | "prep";

/**
 * Request keys that would name a recipient. `deliver_to_me` has NO recipient
 * parameter at all, so a request carrying any of these is refused instead of
 * being silently ignored: an agent that tries to pick someone else's number
 * should learn immediately that this is not possible.
 */
const RECIPIENT_KEYS = new Set([
  "to",
  "phone",
  "number",
  "recipient",
  "recipients",
  "chatid",
  "member",
  "memberid",
  "userid",
  "user_id",
  "target",
  "whatsapp",
  "whatsapp_phone",
]);

export function namesAnotherRecipient(keys: Iterable<string>): boolean {
  for (const k of keys) {
    if (RECIPIENT_KEYS.has(k.toLowerCase())) return true;
  }
  return false;
}

const NO_STORE = { "Cache-Control": "no-store" };

export type DeliveryGate = { ok: true } | { ok: false; response: NextResponse };

/**
 * Cheap up-front check, before any plan/brief work: is this credential allowed
 * to ask for WhatsApp delivery at all? Returns a ready 4xx response if not.
 */
export async function gateDelivery(
  auth: AgentAuthResult,
  deliver: DeliverChannel | undefined,
  requestKeys: Iterable<string>
): Promise<DeliveryGate> {
  if (deliver !== "whatsapp") return { ok: true };

  if (namesAnotherRecipient(requestKeys)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "אי אפשר לבחור נמען. שליחה בוואטסאפ מתבצעת רק למספר של מי שיצר את החיבור.",
        },
        { status: 400, headers: NO_STORE }
      ),
    };
  }
  if (auth.via === "legacy") return { ok: true };

  if (!hasScope(auth.scopes, "deliver_to_me")) {
    await auditDenied(auth, "אין לחיבור הרשאת deliver_to_me");
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "לחיבור הזה אין הרשאת שליחה אליי (deliver_to_me). כדי לאפשר זאת צרו חיבור חדש בהגדרות וסמנו את ההרשאה.",
        },
        { status: 403, headers: NO_STORE }
      ),
    };
  }
  if (!auth.createdBy) {
    await auditDenied(auth, "לא ידוע מי יצר את החיבור");
    return {
      ok: false,
      response: NextResponse.json(
        { error: "לא ניתן לזהות את מי שיצר את החיבור, ולכן אין למי לשלוח." },
        { status: 403, headers: NO_STORE }
      ),
    };
  }
  return { ok: true };
}

async function auditDenied(auth: AgentAuthResult, detail: string) {
  const service = getServiceClient();
  if (!service || !auth.householdId) return;
  await logAgentAudit(service, {
    householdId: auth.householdId,
    tokenId: auth.tokenId ?? null,
    tokenLabel: auth.tokenLabel ?? null,
    actorUserId: auth.createdBy ?? null,
    action: "deliver_to_me",
    outcome: "denied",
    detail,
  });
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `•••${digits.slice(-3)}`;
}

/**
 * Deliver `text` for a request that asked for `deliver: "whatsapp"`.
 * Never throws. See the module docstring for who receives it.
 */
export async function deliverWhatsApp(opts: {
  auth: AgentAuthResult;
  kind: DeliverKind;
  text: string;
  deliver: DeliverChannel | undefined;
  confirmToken?: string;
}): Promise<DeliveryResult> {
  const { auth, kind, text, deliver, confirmToken } = opts;
  if (deliver !== "whatsapp") return NOT_REQUESTED;
  if (auth.via === "legacy") return maybeDeliverToOwner(deliver, text);

  const refuse = (status: string): DeliveryResult => ({
    attempted: false,
    channel: "whatsapp",
    sent: false,
    status,
    rejected: true,
  });

  const service = getServiceClient();
  if (
    !service ||
    !auth.householdId ||
    !auth.tokenId ||
    !auth.createdBy ||
    !hasScope(auth.scopes, "deliver_to_me")
  ) {
    return refuse("אין הרשאה לשליחה בוואטסאפ עבור החיבור הזה.");
  }
  const householdId = auth.householdId;
  const audit = (
    outcome: "preview" | "executed" | "rejected" | "failed",
    target: string | null,
    detail?: string
  ) =>
    logAgentAudit(service, {
      householdId,
      tokenId: auth.tokenId ?? null,
      tokenLabel: auth.tokenLabel ?? null,
      actorUserId: auth.createdBy ?? null,
      action: "deliver_to_me",
      target,
      outcome,
      detail,
    });

  // "Me" = the profile of the member who created this token, and only while
  // that member still belongs to this token's household.
  let phone: string | null = null;
  try {
    const { data: profile } = await service
      .from("profiles")
      .select("whatsapp_phone, household_id")
      .eq("id", auth.createdBy)
      .maybeSingle();
    if (profile && profile.household_id === householdId && profile.whatsapp_phone) {
      phone = String(profile.whatsapp_phone);
    }
  } catch {
    phone = null;
  }
  if (!phone) {
    await audit("rejected", null, "אין מספר וואטסאפ בפרופיל יוצר החיבור");
    return refuse(
      "אין מספר וואטסאפ בפרופיל של מי שיצר את החיבור. הוסיפו אותו בהגדרות ונסו שוב."
    );
  }

  const binding = {
    tokenId: auth.tokenId,
    householdId,
    action: "deliver_to_me" as const,
    target: `${kind}:${fingerprint(phone)}`,
  };

  // Step 1: preview + single-use confirm token. Nothing is sent.
  if (!confirmToken) {
    const created = await createConfirmation(service, binding);
    if (!created.ok) return refuse(CONSUME_MESSAGES.unavailable);
    await audit("preview", binding.target, `תצוגה מקדימה: ${kind}`);
    return {
      attempted: false,
      channel: "whatsapp",
      sent: false,
      status:
        "לא נשלח. זו תצוגה מקדימה: ההודעה המלאה נמצאת בשדה whatsappText. הציגו אותה לאדם ושאלו אם לשלוח למספר שלו. רק אם אישר, קראו שוב עם אותה בקשה ועם confirm_token.",
      requiresConfirmation: true,
      confirmToken: created.confirmToken,
      expiresInSeconds: created.expiresInSeconds,
      recipient: maskPhone(phone),
    };
  }

  // Step 2: the confirm token must match this token, this action, this kind and
  // this recipient, be unexpired, and be unused.
  const consumed = await consumeConfirmation(service, binding, confirmToken);
  if (!consumed.ok) {
    await audit("rejected", binding.target, `אישור נדחה: ${consumed.reason}`);
    return refuse(CONSUME_MESSAGES[consumed.reason]);
  }

  try {
    const result = await sendWhatsAppMessage(phone, text);
    if (result.success) {
      await audit("executed", binding.target, `נשלח: ${kind}`);
      return {
        attempted: true,
        channel: "whatsapp",
        sent: true,
        status: "נשלח לוואטסאפ שלך",
        idMessage: result.idMessage,
        recipient: maskPhone(phone),
      };
    }
    await audit("failed", binding.target, "שליחה נכשלה");
    return { attempted: true, channel: "whatsapp", sent: false, status: "שליחת WhatsApp נכשלה" };
  } catch {
    await audit("failed", binding.target, "שגיאת תקשורת");
    return {
      attempted: true,
      channel: "whatsapp",
      sent: false,
      status: "שגיאת תקשורת בשליחת WhatsApp",
    };
  }
}
