import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getStyleSummary,
  getBestCoachingStyle,
} from "@/lib/coaching-tracker";

/**
 * GET /api/coaching/insights
 * Returns coaching effectiveness data for the current user's household.
 * Used by the CoachingInsight dashboard widget.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Cookies can't be set in server component context – ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get household_id for this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id;

  if (!householdId) {
    return NextResponse.json({
      hasData: false,
      bestStyle: "encouraging",
      summary: [],
      totalSent: 0,
    });
  }

  // Get effectiveness data
  const [summary, bestStyle] = await Promise.all([
    getStyleSummary(householdId, 30),
    getBestCoachingStyle(householdId),
  ]);

  const totalSent = summary.reduce((sum, s) => sum + s.total_sent, 0);

  return NextResponse.json({
    hasData: totalSent >= 10,
    bestStyle,
    summary,
    totalSent,
  });
}
