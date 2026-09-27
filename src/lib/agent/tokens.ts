/**
 * Per-household agent tokens.
 *
 * Design: docs/DESIGN-per-household-agent-tokens.md
 * Gap this closes: docs/AGENT-API-MULTI-TENANT-GAP.md
 *
 * A token is a random secret handed to exactly one household's agent
 * integration (e.g. Kami). The RAW token is shown once, at issuance time,
 * and is never stored — only its SHA-256 hash lives in
 * `household_agent_tokens.token_hash`, the same principle as a password
 * hash. Presenting the raw token later lets `verifyAgentRequest`
 * (src/lib/agent/auth.ts) look up which single household it authorizes.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type AgentTokensClient = SupabaseClient<Database>;

/** Prefix so a leaked token is recognizable at a glance (e.g. in a log line). */
const TOKEN_PREFIX = "bbs_agent_";

/** Hex-encode 32 random bytes (256 bits) — plenty of entropy for a bearer token. */
export function generateRawToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

/** SHA-256 hex digest of a raw token. Deterministic, one-way, no salt needed —
 * the input space (256 bits of CSPRNG output) is far too large to brute-force
 * or rainbow-table, unlike a human password. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/** Constant-time compare of two hex digests (defence in depth; the DB lookup
 * in verifyAgentRequest already does the real hash comparison via an exact
 * index match, but this is used by legacy-key comparison and is kept here so
 * both auth paths share one safe-compare implementation). */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface IssuedToken {
  id: string;
  householdId: string;
  /** The raw token — ONLY returned here, at issuance. Never logged, never re-derivable. */
  rawToken: string;
  createdAt: string;
}

/**
 * Issue a brand-new token for a household. Requires a service-role Supabase
 * client (this table has no client RLS policies — see migration 020).
 */
export async function issueHouseholdToken(
  supabase: AgentTokensClient,
  householdId: string,
  label?: string
): Promise<IssuedToken> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const { data, error } = await supabase
    .from("household_agent_tokens")
    .insert({ household_id: householdId, token_hash: tokenHash, label: label ?? null })
    .select("id, household_id, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to issue agent token for household ${householdId}: ${error?.message ?? "unknown error"}`
    );
  }

  return {
    id: data.id as string,
    householdId: data.household_id as string,
    rawToken,
    createdAt: data.created_at as string,
  };
}

/** Revoke a token by its row id. Idempotent — revoking an already-revoked
 * token is a no-op, not an error. */
export async function revokeHouseholdToken(
  supabase: AgentTokensClient,
  tokenId: string
): Promise<void> {
  const { error } = await supabase
    .from("household_agent_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to revoke agent token ${tokenId}: ${error.message}`);
  }
}

/**
 * Look up which household (if any) a presented raw token is currently
 * authorized for. Returns `null` when the token is unknown, malformed, or
 * revoked — callers must treat `null` as "not authorized for any household",
 * never as "authorized for all households".
 */
export async function resolveHouseholdForToken(
  supabase: AgentTokensClient,
  rawToken: string
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const { data, error } = await supabase
    .from("household_agent_tokens")
    .select("household_id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.household_id as string;
}
