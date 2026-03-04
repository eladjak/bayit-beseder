import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, extractPhoneFromChatId } from "@/lib/whatsapp";

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
  const body = await request.json();

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
  const today = new Date().toISOString().slice(0, 10);

  // Find today's incomplete tasks (same query as morning brief)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("due_date", today)
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

  // Mark task as completed
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" })
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

  return NextResponse.json({
    ok: true,
    completed: task.title,
    remaining,
  });
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
