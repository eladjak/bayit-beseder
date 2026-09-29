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

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { normalizeScopes, type AgentScope } from "@/lib/agent/scopes";

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

/**
 * True when a Supabase error means "the scopes/created_by columns (migration
 * 024) are not there yet", as opposed to a real outage. Used to degrade to the
 * pre-migration behaviour instead of failing.
 */
export function isMissingColumnError(message: string | undefined): boolean {
  return /column|schema cache|42703|PGRST204/i.test(message ?? "");
}

export interface IssuedToken {
  id: string;
  householdId: string;
  scopes: AgentScope[];
  /** The raw token — ONLY returned here, at issuance. Never logged, never re-derivable. */
  rawToken: string;
  createdAt: string;
}

/**
 * Issue a brand-new token for a household. Requires a service-role Supabase
 * client (this table has no client RLS policies — see migration 020).
 */
export interface IssueTokenOptions {
  /** Opt-in scopes beyond the default. Stored with the token, never widened later. */
  scopes?: readonly AgentScope[];
  /** auth.users id of the member creating the token ("me" for deliver_to_me). */
  createdBy?: string | null;
}

/** Thrown when a sensitive scope is requested but migration 024 is not applied. */
export class ScopesUnavailableError extends Error {
  constructor() {
    super("agent token scopes are not available yet (migration 024 not applied)");
    this.name = "ScopesUnavailableError";
  }
}

export async function issueHouseholdToken(
  supabase: AgentTokensClient,
  householdId: string,
  label?: string,
  options: IssueTokenOptions = {}
): Promise<IssuedToken> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const scopes = normalizeScopes(options.scopes);
  const wantsMore = scopes.some((s) => s !== "read" && s !== "write");

  const base = { household_id: householdId, token_hash: tokenHash, label: label ?? null };
  const hasExtras = wantsMore || Boolean(options.createdBy);

  let { data, error } = hasExtras
    ? await supabase
        .from("household_agent_tokens")
        .insert({ ...base, scopes, created_by: options.createdBy ?? null })
        .select("id, household_id, created_at")
        .single()
    : await supabase
        .from("household_agent_tokens")
        .insert(base)
        .select("id, household_id, created_at")
        .single();

  if (hasExtras && error && isMissingColumnError(error.message)) {
    // Migration 024 not applied. A token that only wants the default scopes can
    // still be issued the old way; a token that wants an opt-in scope cannot.
    if (wantsMore) throw new ScopesUnavailableError();
    ({ data, error } = await supabase
      .from("household_agent_tokens")
      .insert(base)
      .select("id, household_id, created_at")
      .single());
  }

  if (error || !data) {
    throw new Error(
      `Failed to issue agent token for household ${householdId}: ${error?.message ?? "unknown error"}`
    );
  }

  return {
    id: data.id as string,
    householdId: data.household_id as string,
    scopes,
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
 * Result of looking a token up. Deliberately NOT collapsed into
 * `string | null`: "the lookup itself failed" (a DB/network error) and "the
 * lookup succeeded and found nothing" (an unknown or revoked token) are
 * different failures that callers must handle differently — the former is
 * an outage (verifyAgentRequest turns it into HTTP 503), the latter is a
 * genuinely bad credential (403, or fall through to another auth path).
 * Swallowing both into `null` would report an outage as "bad token".
 */
export type TokenLookupResult =
  | {
      status: "ok";
      householdId: string;
      /** Row id of the token that matched. */
      tokenId: string;
      label: string | null;
      /** DEFAULT scopes when the column is absent (migration 024 not applied). */
      scopes: AgentScope[];
      /** Member who created the token; null if unknown / column absent. */
      createdBy: string | null;
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Look up which household (if any) a presented raw token is currently
 * authorized for. See `TokenLookupResult` for why this returns three
 * distinct outcomes instead of `string | null`.
 */
export async function resolveHouseholdForToken(
  supabase: AgentTokensClient,
  rawToken: string
): Promise<TokenLookupResult> {
  const tokenHash = hashToken(rawToken);

  const lookup = (columns: string) =>
    supabase
      .from("household_agent_tokens")
      .select(columns)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

  let { data, error } = await lookup("id, household_id, label, scopes, created_by");
  if (error && isMissingColumnError(error.message)) {
    // Migration 024 not applied: same lookup, default scopes, no creator.
    ({ data, error } = await lookup("id, household_id, label"));
  }

  if (error) {
    return { status: "error", message: error.message };
  }
  if (!data) {
    return { status: "not_found" };
  }

  const row = data as unknown as Record<string, unknown>;
  return {
    status: "ok",
    householdId: row.household_id as string,
    tokenId: (row.id as string | undefined) ?? "",
    label: (row.label as string | null | undefined) ?? null,
    scopes: normalizeScopes(row.scopes),
    createdBy: (row.created_by as string | null | undefined) ?? null,
  };
}

// ── Self-serve management (settings page → "חיבור לסוכנים") ─────────────────
//
// These helpers back the logged-in-member UI. They take a service-role client
// and a householdId that the CALLER has already proven the user belongs to
// (see src/lib/agent/token-access.ts). Hashing/issuing/revoking stay in the
// functions above; nothing here reimplements them.

/** Max ACTIVE (non-revoked) tokens per household. */
export const MAX_ACTIVE_TOKENS_PER_HOUSEHOLD = 10;

/** Label length cap (also enforced by the API's zod schema). */
export const MAX_TOKEN_LABEL_LENGTH = 60;

/** What the UI is allowed to see about a token. Never the hash, never the raw value. */
export interface TokenSummary {
  id: string;
  label: string | null;
  createdAt: string;
  /** What this token may do (DEFAULT scopes when migration 024 is not applied). */
  scopes: AgentScope[];
  /** Constant prefix + bullets: the raw token is not recoverable from the hash. */
  maskedPrefix: string;
}

export const MASKED_TOKEN_PREFIX = `${TOKEN_PREFIX}••••••••`;

/** List a household's ACTIVE tokens, newest first. */
export async function listActiveHouseholdTokens(
  supabase: AgentTokensClient,
  householdId: string
): Promise<TokenSummary[]> {
  const list = (columns: string) =>
    supabase
      .from("household_agent_tokens")
      .select(columns)
      .eq("household_id", householdId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

  let { data, error } = await list("id, label, created_at, scopes");
  if (error && isMissingColumnError(error.message)) {
    ({ data, error } = await list("id, label, created_at"));
  }

  if (error) {
    throw new Error(`Failed to list agent tokens: ${error.message}`);
  }
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    label: (row.label as string | null) ?? null,
    createdAt: row.created_at as string,
    scopes: normalizeScopes(row.scopes),
    maskedPrefix: MASKED_TOKEN_PREFIX,
  }));
}

/**
 * Revoke a token, but ONLY if it is an active token of `householdId`. Returns
 * false when there is no such token (unknown id, another household's id, or
 * already revoked) so the API can answer 404 without revealing which.
 */
export async function revokeTokenInHousehold(
  supabase: AgentTokensClient,
  householdId: string,
  tokenId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("household_agent_tokens")
    .select("id")
    .eq("id", tokenId)
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up agent token: ${error.message}`);
  }
  if (!data) return false;

  await revokeHouseholdToken(supabase, tokenId);
  return true;
}
