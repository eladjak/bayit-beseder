/**
 * Agent API authentication.
 *
 * The agent-facing namespace (`/api/agent/*`) is a SECOND front door to the app
 * for external agents (Kami / Box / Solis / any Claude / OpenClaw instance) so a
 * person can command BayitBeSeder by voice/text instead of clicking the UI.
 *
 * Because these endpoints can expose private household data and create tasks,
 * every request MUST present a bearer token — and, as of
 * docs/DESIGN-per-household-agent-tokens.md, that token is what determines
 * WHICH household the caller may act on. `householdId` in a request body or
 * query string is NEVER trusted for that decision; every route resolves the
 * household from `AgentAuthResult.householdId` instead. See
 * docs/AGENT-API-MULTI-TENANT-GAP.md for the gap this closes.
 *
 * Two credential shapes are accepted, in this order:
 *
 * 1. A per-household token (table `household_agent_tokens`, migration 020).
 *    Only its SHA-256 hash is stored; `resolveHouseholdForToken` looks up the
 *    presented token's hash and returns one of three outcomes: the household
 *    it authorizes ("ok"), "not_found" (unknown or revoked — falls through
 *    to the legacy key below), or "error" (the lookup itself failed, e.g. a
 *    DB/network problem) — which this function turns into an HTTP 503, NOT
 *    a 403, so an outage is never reported to the caller as "bad token".
 * 2. The legacy global key (`BAYIT_AGENT_KEY` / `AGENT_API_TOKEN`), kept
 *    working ONLY as a documented transition path (design doc §3). It no
 *    longer grants access to "any household the caller names" — it grants
 *    access to at most ONE household, pinned by the server operator via
 *    `BAYIT_AGENT_KEY_HOUSEHOLD_ID`. If that env var is not set, the legacy
 *    key still authenticates (so it does not 401 outright) but authorizes
 *    ZERO households — every household-scoped handler then fails closed
 *    with 403, which is the safe default until an operator explicitly pins
 *    it or (better) switches the caller to a real per-household token.
 *
 * Security notes:
 * - Secrets are read ONLY from the environment / database. Nothing is
 *   hardcoded.
 * - The legacy key comparison is constant-time to avoid timing oracles.
 * - The per-household token is never compared byte-for-byte in application
 *   code; only its hash is looked up via an exact index match in Postgres,
 *   the same approach any hashed-credential lookup uses.
 * - This token is SEPARATE from `CRON_SECRET` so it can be rotated/scoped
 *   independently from the Vercel cron jobs.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { resolveHouseholdForToken } from "@/lib/agent/tokens";

export interface AgentAuthResult {
  ok: boolean;
  /** HTTP status to return when `ok` is false. */
  status: number;
  /** Hebrew-friendly error payload when `ok` is false. */
  error?: string;
  /**
   * The SINGLE household this credential authorizes, resolved from the
   * token itself — never from anything the caller wrote in the request.
   * `null` means "authorized for no household" (a legacy key with no pin
   * configured, or `ok: false`). Every route MUST treat `null` as "reject
   * any household-scoped operation", never as "all households".
   */
  householdId: string | null;
}

/** Read the configured legacy agent key (BAYIT_AGENT_KEY preferred, AGENT_API_TOKEN alias). */
export function getAgentKey(): string | undefined {
  return (
    process.env.BAYIT_AGENT_KEY?.trim() ||
    process.env.AGENT_API_TOKEN?.trim() ||
    undefined
  );
}

/** The single household the legacy key is pinned to during the transition
 * period, if an operator has configured one. */
function getLegacyKeyHouseholdId(): string | null {
  return process.env.BAYIT_AGENT_KEY_HOUSEHOLD_ID?.trim() || null;
}

/**
 * Constant-time string compare with NO length-dependent branch.
 *
 * The earlier version compared raw buffers and took an early `if (bufA.length
 * !== bufB.length)` branch before calling `timingSafeEqual` — that branch
 * itself leaks the presented token's length relative to the secret's length
 * (a fast rejection path an attacker can time, independent of
 * `timingSafeEqual`'s own constant-time guarantee, which only covers the
 * comparison it is given, not the code deciding whether to call it).
 *
 * Hashing both inputs to a fixed-size SHA-256 digest FIRST removes the
 * length-dependent branch entirely: every input, of any length (including
 * empty), always produces exactly 32 bytes, so `timingSafeEqual` never sees
 * a length mismatch and this function never has a fast path to take.
 */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

/** Service-role Supabase client for the token lookup, or `null` if the
 * server is not configured to reach the database (e.g. missing env in a
 * misconfigured deploy). Callers fall back to legacy-key-only auth in that
 * case rather than crashing. */
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient<Database>(supabaseUrl, serviceKey);
}

/**
 * Verify the `Authorization: Bearer <token>` header and resolve which single
 * household (if any) it authorizes.
 *
 * Returns `{ ok: true, householdId }` on success. `householdId` can still be
 * `null` on success (legacy key, no pin) — callers must check it separately
 * before touching any household-scoped data.
 */
export async function verifyAgentRequest(request: Request): Promise<AgentAuthResult> {
  const legacyKey = getAgentKey();
  const supabase = getServiceClient();

  // If neither a per-household token store nor a legacy key is reachable at
  // all, the agent API is effectively disabled. Fail closed rather than
  // exposing household data to the open internet.
  if (!legacyKey && !supabase) {
    return {
      ok: false,
      status: 503,
      error:
        "ממשק הסוכנים אינו מופעל (חסרים גם BAYIT_AGENT_KEY וגם הגדרות Supabase). הגדירו טוקן בשרת.",
      householdId: null,
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const presented = match?.[1]?.trim();

  if (!presented) {
    return {
      ok: false,
      status: 401,
      error: "חסר אסימון הרשאה. שלחו כותרת Authorization: Bearer <token>.",
      householdId: null,
    };
  }

  // 1. Per-household token (preferred path).
  if (supabase) {
    const resolved = await resolveHouseholdForToken(supabase, presented);
    if (resolved.status === "ok") {
      return { ok: true, status: 200, householdId: resolved.householdId };
    }
    if (resolved.status === "error") {
      // A DB/network failure is NOT the same thing as "this token is
      // invalid" — conflating the two would silently mask real outages as
      // ordinary auth rejections (and, worse, would then fall through to
      // the legacy-key check below on every transient DB hiccup). Answer
      // 503 so a monitoring/retry layer treats it as an outage, not a
      // rejected credential.
      return {
        ok: false,
        status: 503,
        error: "שגיאה בבדיקת הטוקן מול מסד הנתונים. נסו שוב בעוד רגע.",
        householdId: null,
      };
    }
    // status === "not_found" — fall through to the legacy key check below.
  }

  // 2. Legacy global key (transition path — see module docstring).
  if (legacyKey && safeEqual(presented, legacyKey)) {
    const pinnedHouseholdId = getLegacyKeyHouseholdId();
    if (!pinnedHouseholdId) {
      // Deliberate operator-facing warning: this is exactly the "shared key
      // with no pin" state that silently authorizes zero households, and an
      // operator watching server logs during the Kami migration needs to
      // see this, not infer it from a wave of 403s on every household-scoped
      // request.
      console.warn(
        "[bayit-agent-auth] BAYIT_AGENT_KEY was presented and matched, but " +
          "BAYIT_AGENT_KEY_HOUSEHOLD_ID is not set — this credential authorizes " +
          "ZERO households (fail-closed default). Set BAYIT_AGENT_KEY_HOUSEHOLD_ID " +
          "to the one household this legacy key should act on during the " +
          "transition, or (preferred) issue a real per-household token via " +
          "scripts/issue-agent-token.mjs and retire this key."
      );
    }
    return { ok: true, status: 200, householdId: pinnedHouseholdId };
  }

  return { ok: false, status: 403, error: "אסימון הרשאה שגוי.", householdId: null };
}
