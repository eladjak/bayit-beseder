import webpush from "web-push";

// ============================================
// Web Push notification sender (server-side)
// ============================================

// VAPID keys must be set in environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:bayit-beseder@example.com";

/**
 * Configure web-push with VAPID credentials.
 * Call this before sending any push notification.
 */
function ensureVapidConfigured(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not configured");
    return false;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

/**
 * A push subscription as stored in the database.
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Payload for a push notification.
 */
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false on failure (including expired subscriptions).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; expired?: boolean }> {
  if (!ensureVapidConfigured()) {
    return { success: false };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    tag: payload.tag ?? "bayit-beseder",
    data: { url: payload.url ?? "/dashboard" },
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      pushPayload,
      { TTL: 60 * 60 } // 1 hour TTL
    );
    return { success: true };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 410 Gone or 404 = subscription expired/invalid
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true };
    }
    console.error("[push] Failed to send:", error);
    return { success: false };
  }
}

/**
 * Send push notification to multiple subscriptions.
 * Returns summary of results and list of expired subscription endpoints.
 */
export async function sendPushToAll(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{
  sent: number;
  failed: number;
  expired: string[];
}> {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, expired: [] };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      if (
        result.status === "fulfilled" &&
        result.value.expired
      ) {
        expired.push(subscriptions[i].endpoint);
      }
    }
  }

  return { sent, failed, expired };
}

/**
 * Get the public VAPID key for client-side subscription.
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
