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

const CHUNK = 150;

/**
 * For code that has NO user session but acts for a household or a phone number
 * (agent tokens, the WhatsApp webhook, cron jobs): ask with a service client
 * which of these people currently have consent. Returns the subset that does.
 * Fails CLOSED: any error or throw means nobody is consented.
 */
export async function filterConsentedUserIds(service: AnyClient, userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Set();
  const ok = new Set<string>();
  try {
    for (let i = 0; i < unique.length; i += CHUNK) {
      const { data, error } = await service
        .from("privacy_consents")
        .select("user_id, policy_version, age_confirmed, privacy_accepted, terms_accepted")
        .in("user_id", unique.slice(i, i + CHUNK))
        .eq("policy_version", POLICY_VERSION);
      if (error || !Array.isArray(data)) return new Set();
      for (const row of data as { user_id: string }[]) if (isConsentCurrent(row as never)) ok.add(row.user_id);
    }
    return ok;
  } catch {
    return new Set();
  }
}

/**
 * Households in which EVERY current member has a current consent record.
 * "Member" is anyone in household_members OR whose profile points at the household.
 * A household with no members is not served. Pass `only` to restrict the question to some
 * households. Fails CLOSED: any error or throw returns [].
 *
 * This is the rule for everything that acts for a household without a signed-in person:
 * agent tokens (and MCP), cron jobs. One person's consent is not another's.
 */
export async function consentedHouseholdIds(service: AnyClient, only?: string[]): Promise<string[]> {
  try {
    const members = new Map<string, Set<string>>();
    const add = (household: string | null | undefined, user: string | null | undefined) => {
      if (!household || !user) return;
      if (!members.has(household)) members.set(household, new Set());
      members.get(household)!.add(user);
    };
    if (only?.length === 0) return [];
    // Request every page: PostgREST may silently cap a response at 1000 rows.
    // A deterministic unique ordering avoids losing rows between pages in a stable dataset.
    const readPages = async (table: "household_members" | "profiles") => {
      const rows: Record<string, string>[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        let query = table === "household_members"
          ? service.from(table).select("household_id, user_id").order("household_id").order("user_id")
          : service.from(table).select("id, household_id").not("household_id", "is", null).order("id");
        if (only) query = query.in("household_id", only);
        const result = await query.range(offset, offset + pageSize - 1);
        if (result.error || !Array.isArray(result.data)) throw new Error("membership lookup failed");
        rows.push(...result.data);
        if (result.data.length < pageSize) return rows;
      }
    };
    const [m, p] = await Promise.all([readPages("household_members"), readPages("profiles")]);
    for (const r of m) add(r.household_id, r.user_id);
    for (const r of p) add(r.household_id, r.id);
    const everyone = [...members.values()].flatMap((set) => [...set]);
    const consented = await filterConsentedUserIds(service, everyone);
    return [...members.entries()]
      .filter(([household, set]) => (!only || only.includes(household)) && set.size > 0 && [...set].every((u) => consented.has(u)))
      .map(([household]) => household);
  } catch {
    return [];
  }
}

/** May an agent act for this household? Only if every current member has consented. Fails CLOSED. */
export async function householdConsentOk(service: AnyClient, householdId: string): Promise<boolean> {
  return (await consentedHouseholdIds(service, [householdId])).includes(householdId);
}
