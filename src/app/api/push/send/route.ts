import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendPushToAll,
  type PushSubscriptionData,
  type PushPayload,
} from "@/lib/push";

/**
 * POST /api/push/send
 * Sends push notification to all subscribed users.
 * Protected by CRON_SECRET (same as WhatsApp crons).
 *
 * Body: { title: string, body: string, tag?: string, url?: string }
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  let payload: PushPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.title || !payload.body) {
    return NextResponse.json(
      { error: "Missing title or body" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get all profiles with push subscriptions
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, push_subscription")
    .not("push_subscription", "is", null);

  if (error) {
    console.error("[push/send] DB error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No push subscriptions found" });
  }

  // Extract valid subscriptions
  const subscriptions: PushSubscriptionData[] = [];
  const profileIds: string[] = [];

  for (const p of profiles) {
    const sub = p.push_subscription as PushSubscriptionData | null;
    if (sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth) {
      subscriptions.push(sub);
      profileIds.push(p.id);
    }
  }

  // Send to all
  const result = await sendPushToAll(subscriptions, payload);

  // Clean up expired subscriptions
  if (result.expired.length > 0) {
    for (let i = 0; i < subscriptions.length; i++) {
      if (result.expired.includes(subscriptions[i].endpoint)) {
        await supabase
          .from("profiles")
          .update({ push_subscription: null })
          .eq("id", profileIds[i]);
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent: result.sent,
    failed: result.failed,
    expiredCleaned: result.expired.length,
  });
}
