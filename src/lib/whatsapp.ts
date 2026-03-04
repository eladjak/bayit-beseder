/**
 * Green API WhatsApp client for BayitBeSeder.
 *
 * Uses a DEDICATED Green API instance (not shared with Kami).
 * This instance supports webhooks for reply-to-complete.
 */

function getConfig() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  const baseUrl = process.env.GREEN_API_URL || "https://api.green-api.com";
  if (!instanceId || !token) {
    throw new Error("GREEN_API_INSTANCE_ID and GREEN_API_TOKEN must be set");
  }
  return { instanceId, token, baseUrl };
}

function formatPhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, "");
  // Israeli number: convert 05x to 9725x
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.slice(1);
  }
  // Ensure no + prefix
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  return `${cleaned}@c.us`;
}

export function extractPhoneFromChatId(chatId: string): string {
  return chatId.replace("@c.us", "");
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; idMessage?: string; error?: string }> {
  const { instanceId, token, baseUrl } = getConfig();
  const chatId = formatPhone(phone);

  const url = `${baseUrl}/waInstance${instanceId}/sendMessage/${token}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: `Green API error: ${response.status} ${text}` };
  }

  const data = await response.json();
  return { success: true, idMessage: data.idMessage };
}
