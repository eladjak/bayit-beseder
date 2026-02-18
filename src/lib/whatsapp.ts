/**
 * Green API WhatsApp client for BayitBeSeder.
 *
 * IMPORTANT: This uses the same Green API instance as Kami.
 * Kami uses polling (receiveNotification) - NEVER set webhookUrl
 * on this instance or it will break Kami's message queue.
 *
 * BayitBeSeder only SENDS messages - no webhook/receive needed.
 */

const GREEN_API_URL = "https://api.green-api.com";

function getConfig() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!instanceId || !token) {
    throw new Error("GREEN_API_INSTANCE_ID and GREEN_API_TOKEN must be set");
  }
  return { instanceId, token };
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

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; idMessage?: string; error?: string }> {
  const { instanceId, token } = getConfig();
  const chatId = formatPhone(phone);

  const url = `${GREEN_API_URL}/waInstance${instanceId}/sendMessage/${token}`;

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
