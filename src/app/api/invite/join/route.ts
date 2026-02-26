import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * POST /api/invite/join
 * Joins the current user to a household using an invite code.
 * Sets partner_id on both profiles.
 *
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code } = body;
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  // Fetch the current user's profile
  const { data: joinerProfile, error: joinerError } = await supabase
    .from("profiles")
    .select("id, display_name, household_id, partner_id")
    .eq("id", user.id)
    .single();

  if (joinerError || !joinerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Prevent joining if already in a household
  if (joinerProfile.household_id) {
    return NextResponse.json(
      { error: "already_in_household" },
      { status: 409 }
    );
  }

  // Find the household by invite code
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, invite_code")
    .eq("invite_code", code.toUpperCase())
    .single();

  if (householdError || !household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Find the owner of this household
  const { data: ownerMember, error: ownerError } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", household.id)
    .eq("role", "owner")
    .single();

  if (ownerError || !ownerMember) {
    return NextResponse.json({ error: "Household owner not found" }, { status: 404 });
  }

  // Prevent joining own household
  if (ownerMember.user_id === user.id) {
    return NextResponse.json(
      { error: "cannot_join_own_household" },
      { status: 409 }
    );
  }

  // Use service role client to bypass RLS for writes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const serviceClient = createServiceClient<Database>(supabaseUrl, supabaseServiceKey);

  // Add joiner to household_members
  const { error: memberError } = await serviceClient
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) {
    console.error("[invite/join] Failed to add member:", memberError);
    return NextResponse.json(
      { error: "Failed to join household" },
      { status: 500 }
    );
  }

  // Update joiner's profile: set household_id and partner_id
  const { error: joinerUpdateError } = await serviceClient
    .from("profiles")
    .update({
      household_id: household.id,
      partner_id: ownerMember.user_id,
    })
    .eq("id", user.id);

  if (joinerUpdateError) {
    console.error("[invite/join] Failed to update joiner profile:", joinerUpdateError);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  // Update owner's profile: set partner_id to joiner
  const { error: ownerUpdateError } = await serviceClient
    .from("profiles")
    .update({ partner_id: user.id })
    .eq("id", ownerMember.user_id);

  if (ownerUpdateError) {
    console.error("[invite/join] Failed to update owner profile:", ownerUpdateError);
    // Non-fatal: joiner is still in the household
  }

  // Fetch owner display name for response
  const { data: ownerProfile } = await serviceClient
    .from("profiles")
    .select("display_name")
    .eq("id", ownerMember.user_id)
    .single();

  return NextResponse.json({
    success: true,
    householdId: household.id,
    householdName: household.name,
    partnerId: ownerMember.user_id,
    partnerName: ownerProfile?.display_name ?? null,
  });
}
