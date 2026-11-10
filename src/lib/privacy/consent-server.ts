import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CONSENT_REQUIRED_ERROR, POLICY_VERSION, isConsentCurrent } from "./policy";

/**
 * Does this user have a consent record for the CURRENT policy version?
 *
 * Uses the caller's own (RLS-scoped) client: a user can only ever read their
 * own rows, so this can never answer for somebody else.
 *
 * Fails CLOSED: a query error is "no consent", never "fine".
 */
export async function hasCurrentConsent(
  // Loose on purpose: the generated Database type does not know this table yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("privacy_consents")
    .select("policy_version, age_confirmed, privacy_accepted, terms_accepted")
    .eq("user_id", userId)
    .eq("policy_version", POLICY_VERSION)
    .maybeSingle();
  if (error) return false;
  return isConsentCurrent(data);
}

/** 403 body for a route that refuses to touch household data without consent. */
export function consentRequiredResponse() {
  return NextResponse.json({ error: CONSENT_REQUIRED_ERROR }, { status: 403 });
}

/**
 * Guard for routes that act on behalf of a signed-in user.
 *
 *   const guard = await requireConsent(supabase, user);
 *   if (guard) return guard;
 *
 * Returns a 403 response when the user has not accepted the current policy,
 * otherwise null.
 */
export async function requireConsent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  user: Pick<User, "id">,
): Promise<NextResponse | null> {
  return (await hasCurrentConsent(supabase, user.id)) ? null : consentRequiredResponse();
}
