import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/push/subscribe
 * Saves a push subscription to the user's profile in Supabase.
 *
 * Body: { userId: string, subscription: PushSubscriptionJSON }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  let body: { userId?: string; subscription?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, subscription } = body;

  if (!userId || !subscription) {
    return NextResponse.json(
      { error: "Missing userId or subscription" },
      { status: 400 }
    );
  }

  // Validate subscription shape
  const sub = subscription as Record<string, unknown>;
  if (
    typeof sub.endpoint !== "string" ||
    !sub.keys ||
    typeof (sub.keys as Record<string, unknown>).p256dh !== "string" ||
    typeof (sub.keys as Record<string, unknown>).auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid subscription format" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: subscription })
    .eq("id", userId);

  if (error) {
    console.error("[push/subscribe] DB error:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/push/subscribe
 * Removes push subscription from user's profile.
 *
 * Body: { userId: string }
 */
export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: null })
    .eq("id", userId);

  if (error) {
    console.error("[push/subscribe] DB error:", error);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
