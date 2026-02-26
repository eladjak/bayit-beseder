import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Generates a random 8-character uppercase alphanumeric invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/invite
 * Creates or retrieves the household for the current user.
 * Returns the invite code and a shareable link.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the user's profile to check for an existing household
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, household_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // If the user already has a household, return its invite code
  if (profile.household_id) {
    const { data: household, error: householdError } = await supabase
      .from("households")
      .select("id, name, invite_code")
      .eq("id", profile.household_id)
      .single();

    if (householdError || !household) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bayit-beseder.vercel.app";
    return NextResponse.json({
      inviteCode: household.invite_code,
      link: `${baseUrl}/invite/${household.invite_code}`,
      householdId: household.id,
      householdName: household.name,
    });
  }

  // Use service role client to bypass RLS for household creation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const serviceClient = createServiceClient<Database>(supabaseUrl, supabaseServiceKey);

  // Create a new household for the user
  const inviteCode = generateInviteCode();
  const householdName = `הבית של ${profile.display_name ?? "משתמש"}`;

  const { data: newHousehold, error: createError } = await serviceClient
    .from("households")
    .insert({
      name: householdName,
      invite_code: inviteCode,
    })
    .select("id, name, invite_code")
    .single();

  if (createError || !newHousehold) {
    console.error("[invite] Failed to create household:", createError);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }

  // Add user as owner in household_members
  const { error: memberError } = await serviceClient
    .from("household_members")
    .insert({
      household_id: newHousehold.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    console.error("[invite] Failed to add household member:", memberError);
  }

  // Update the user's profile with the new household_id
  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({ household_id: newHousehold.id })
    .eq("id", user.id);

  if (updateError) {
    console.error("[invite] Failed to update profile household:", updateError);
    return NextResponse.json(
      { error: "Failed to link household to profile" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bayit-beseder.vercel.app";
  return NextResponse.json({
    inviteCode: newHousehold.invite_code,
    link: `${baseUrl}/invite/${newHousehold.invite_code}`,
    householdId: newHousehold.id,
    householdName: newHousehold.name,
  });
}

/**
 * GET /api/invite?code=XXXXXXXX
 * Validates an invite code and returns household info.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, invite_code")
    .eq("invite_code", code.toUpperCase())
    .single();

  if (error || !household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Get owner profile info
  const { data: ownerMember } = await supabase
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", household.id)
    .eq("role", "owner")
    .single();

  let ownerName: string | null = null;
  if (ownerMember) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", ownerMember.user_id)
      .single();
    ownerName = ownerProfile?.display_name ?? null;
  }

  return NextResponse.json({
    valid: true,
    householdId: household.id,
    householdName: household.name,
    inviteCode: household.invite_code,
    ownerName,
  });
}
