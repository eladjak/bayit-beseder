import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, extractPhoneFromChatId } from "@/lib/whatsapp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 30 requests per minute — allows burst traffic from Green API retries
// while blocking abusive callers.
const limiter = rateLimit({ windowMs: 60_000, max: 30 });

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
  const rateLimitResult = limiter.check(getClientIp(request));
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimitResult.reset / 1000)) },
      }
    );
  }

  const body = await request.json();

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
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", assigned_to: profile.id })
    .eq("id", task.id);

  if (error) {
    await sendReply(chatId, "שגיאה בעדכון המשימה, נסו שוב");
    return NextResponse.json({ error: error.message }, { status: 500 });
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
