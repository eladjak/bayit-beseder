import { NextRequest, NextResponse } from "next/server";

// Temporary containment: source and recipient binding are not established.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    error: "report_source_or_recipient_unverified",
    status: "לא ידוע / לא נקרא",
    evaluated_at: new Date().toISOString(),
    source_read_at: null,
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
