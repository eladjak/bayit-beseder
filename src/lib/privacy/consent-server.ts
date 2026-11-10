import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CONSENT_REQUIRED_ERROR, CONSENT_UNAVAILABLE_ERROR, POLICY_VERSION, isConsentCurrent } from "./policy";

/**
 * THE one server-side consent helper. Every route that serves personal data
 * goes through here (src/app/api/__tests__/consent-coverage.test.ts enforces it).
 *
 * Three answers, never two:
 *   "accepted"     the user has a record for the CURRENT policy version
 *   "needed"       we could ask, and there is no (current) record
 *   "unavailable"  we could NOT ask (database error, network error, thrown exception)
 *
 * "unavailable" is NOT "needed": showing the consent form to someone who already
 * consented is wrong, and treating it as "accepted" would fail open. Every
 * caller refuses on both, and the two refusals differ only in what the person is
 * told (403 consent_required vs 503 consent_unavailable).
 */
export type ConsentStatus = "accepted" | "needed" | "unavailable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Looks up the consent record with the caller's own (RLS-scoped) client: a user
 * can only ever read their own rows, so this cannot answer for somebody else.
 * NEVER throws: a thrown lookup is "unavailable".
 */
export async function getConsentStatus(supabase: AnyClient, userId: string): Promise<ConsentStatus> {
  try {
    const { data, error } = await supabase
      .from("privacy_consents")
      .select("policy_version, age_confirmed, privacy_accepted, terms_accepted")
      .eq("user_id", userId)
      .eq("policy_version", POLICY_VERSION)
      .maybeSingle();
    if (error) return "unavailable";
    return isConsentCurrent(data) ? "accepted" : "needed";
  } catch {
    return "unavailable";
  }
}

/** True only for "accepted". Fails CLOSED on every other outcome, including a throw. */
export async function hasCurrentConsent(supabase: AnyClient, userId: string): Promise<boolean> {
  return (await getConsentStatus(supabase, userId)) === "accepted";
}

/** 403 body for a route that refuses to touch household data without consent. */
export function consentRequiredResponse() {
  return NextResponse.json({ error: CONSENT_REQUIRED_ERROR }, { status: 403 });
}

/** 503 body: we could not check, so we do not serve (and we do not claim the person refused). */
export function consentUnavailableResponse() {
  return NextResponse.json({ error: CONSENT_UNAVAILABLE_ERROR }, { status: 503, headers: { "Retry-After": "5" } });
}

/** Maps a non-accepted status to its refusal; null when accepted. */
export function refusalFor(status: ConsentStatus): NextResponse | null {
  if (status === "accepted") return null;
  return status === "needed" ? consentRequiredResponse() : consentUnavailableResponse();
}

/**
 * Guard for routes that act on behalf of a signed-in user.
 *
 *   const guard = await requireConsent(supabase, user);
 *   if (guard) return guard;
 */
export async function requireConsent(supabase: AnyClient, user: Pick<User, "id">): Promise<NextResponse | null> {
  return refusalFor(await getConsentStatus(supabase, user.id));
}

/**
 * For code that has NO user session but acts for a household or a phone number
 * (agent tokens, the WhatsApp webhook, cron jobs): ask with a service client
 * which of these people currently have consent. Returns the subset that does.
 * Fails CLOSED: any error or throw means nobody is consented.
 */
export async function filterConsentedUserIds(service: AnyClient, userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Set();
  try {
    const { data, error } = await service
      .from("privacy_consents")
      .select("user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted")
      .in("user_id", unique)
      .eq("policy_version", POLICY_VERSION);
    if (error || !Array.isArray(data)) return new Set();
    return new Set(
      (data as { user_id: string }[])
        .filter((row) => isConsentCurrent(row as never))
        .map((row) => row.user_id),
    );
  } catch {
    return new Set();
  }
}

/**
 * A household may be served over an agent token (no user session) only if the
 * person who created the token has consent; a token with no known creator (old
 * tokens, the shared legacy key) needs at least one household member with
 * consent. Fails CLOSED.
 */
export async function householdConsentOk(
  service: AnyClient,
  householdId: string,
  createdBy: string | null,
): Promise<boolean> {
  try {
    if (createdBy) return (await filterConsentedUserIds(service, [createdBy])).has(createdBy);
    const { data, error } = await service.from("household_members").select("user_id").eq("household_id", householdId);
    if (error || !Array.isArray(data)) return false;
    const ids = (data as { user_id: string }[]).map((m) => m.user_id);
    return (await filterConsentedUserIds(service, ids)).size > 0;
  } catch {
    return false;
  }
}
