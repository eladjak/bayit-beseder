/**
 * Agent WhatsApp delivery.
 *
 * When an agent request sets `deliver: "whatsapp"`, the generated Hebrew
 * `whatsappText` is sent to ELAD'S OWN WhatsApp number ONLY.
 *
 * SAFETY LINE (do not cross): the recipient is taken EXCLUSIVELY from the
 * `BAYIT_AGENT_WHATSAPP_TO` environment variable. It is NEVER read from the
 * request body. An agent can ask us to deliver, but cannot choose the
 * recipient — that prevents the agent API from being abused to spam arbitrary
 * numbers. If the env var is unset, delivery fails closed.
 *
 * Transport: reuses the app's existing, already-live Green API client
 * (`sendWhatsAppMessage` in `src/lib/whatsapp.ts`) — the same path the
 * daily-brief cron uses. No new WhatsApp integration is introduced.
 */

import { sendWhatsAppMessage } from "@/lib/whatsapp";

export type DeliverChannel = "whatsapp";

export interface DeliveryResult {
  attempted: boolean;
  channel: DeliverChannel | null;
  /** true only when the message was actually accepted by the transport. */
  sent: boolean;
  /** Hebrew-friendly status for the agent / logs. Never includes the number. */
  status: string;
  idMessage?: string;
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
