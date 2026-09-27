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
 *    presented token's hash and returns the single household it authorizes,
 *    or `null` if it is unknown/revoked.
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

import { timingSafeEqual } from "node:crypto";
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

/** Constant-time string compare that never throws on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison against a fixed-length buffer so the timing does
    // not leak the secret length, then return false.
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
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
    const householdId = await resolveHouseholdForToken(supabase, presented);
    if (householdId) {
      return { ok: true, status: 200, householdId };
    }
  }

  // 2. Legacy global key (transition path — see module docstring).
  if (legacyKey && safeEqual(presented, legacyKey)) {
    return { ok: true, status: 200, householdId: getLegacyKeyHouseholdId() };
  }

  return { ok: false, status: 403, error: "אסימון הרשאה שגוי.", householdId: null };
}
