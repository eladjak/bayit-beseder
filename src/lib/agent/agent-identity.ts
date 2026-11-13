/**
 * named agent identity (display name from BAYIT_AGENT_DISPLAY_NAME, default "סוכן"; owner decision 12.11.2026).
 *
 * A named agent is NOT a second auth mechanism: it is a normal per-household agent token
 * (src/lib/agent/tokens.ts) flagged `is_agent` (migration 030), pinned to one
 * household like every other token. This module holds the three things that are
 * extra for that identity:
 *
 *  1. Guard rails: delete and send actions are REFUSED (HTTP 428) unless the
 *     request carries `X-Agent-Confirm: <encodeURIComponent(text)>` naming the
 *     human instruction (>= 20 characters decoded). Same convention in every
 *     named agent system. Ordinary tokens keep the older two-step confirm_token flow.
 *  2. A write rate limit: 60 state-changing calls per minute per token (429).
 *  3. The display name used in the audit trail.
 *
 * Classes in this product: money = none (Bayit has no payment API for agents);
 * access = none (token management is cookie-session only, /api/agent-tokens);
 * send = deliver_to_me; delete = delete_task.
 */
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { AgentAuthResult } from "@/lib/agent/auth";

export const AGENT_DISPLAY_NAME = process.env.BAYIT_AGENT_DISPLAY_NAME?.trim() || "סוכן";
export const CONFIRM_HEADER = "x-agent-confirm";
export const CONFIRM_MIN_CHARS = 20;
export const AGENT_WRITES_PER_MINUTE = 60;

export type GuardClass = "money" | "send" | "delete" | "access";

export function isNamedAgent(auth: AgentAuthResult): boolean {
  return auth.ok && auth.via === "token" && auth.isAgent === true;
}

export const CONFIRM_MAX_CHARS = 600;
export type ConfirmReason = "missing" | "too_short" | "too_long";

/** Characters that count for nothing: whitespace, control, format (zero-width, joiners, BOM), combining marks, variation selectors. */
const INVISIBLE = /[\s\p{Cf}\p{Cc}\p{M}\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
export const visibleLength = (text: string): number => [...text.replace(INVISIBLE, "")].length;

/**
 * Decoded confirm text, or the reason it was refused. Counted in code points after removing invisible characters;
 * a text over 600 code points is refused, never truncated.
 */
export function checkAgentConfirm(request: Request): { text: string; reason: null } | { text: null; reason: ConfirmReason } {
  const raw = request.headers.get(CONFIRM_HEADER);
  if (!raw) return { text: null, reason: "missing" };
  let text: string;
  try {
    text = decodeURIComponent(raw).trim();
  } catch {
    return { text: null, reason: "missing" };
  }
  if ([...text].length > CONFIRM_MAX_CHARS) return { text: null, reason: "too_long" };
  if (visibleLength(text) < CONFIRM_MIN_CHARS) return { text: null, reason: "too_short" };
  return { text, reason: null };
}

/** Decoded confirm text, or null when missing / malformed / too short / too long. */
export function readAgentConfirm(request: Request): string | null {
  return checkAgentConfirm(request).text;
}

export function confirmRequiredResponse(klass: GuardClass, reason: ConfirmReason = "missing"): NextResponse {
  return NextResponse.json(
    { error: "agent_confirm_required", class: klass, reason },
    { status: 428, headers: { "Cache-Control": "no-store" } }
  );
}

const writeLimiter = rateLimit({ windowMs: 60_000, max: AGENT_WRITES_PER_MINUTE });

/** Returns a 429 response when this token exceeded its write budget, else null. */
export async function agentWriteRateLimited(tokenId: string): Promise<NextResponse | null> {
  const r = await writeLimiter.check(`agent-write:${tokenId}`);
  if (r.success) return null;
  return NextResponse.json(
    { error: "יותר מדי כתיבות של הסוכנת. נסו שוב עוד דקה.", class: "rate_limit" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(r.reset / 1000)) } }
  );
}
