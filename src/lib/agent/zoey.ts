/**
 * The named agent identity "Zoey (סוכנת)" (owner decision 12.11.2026).
 *
 * Zoey is NOT a second auth mechanism: it is a normal per-household agent token
 * (src/lib/agent/tokens.ts) flagged `is_agent` (migration 030), pinned to one
 * household like every other token. This module holds the three things that are
 * extra for that identity:
 *
 *  1. Guard rails: delete and send actions are REFUSED (HTTP 428) unless the
 *     request carries `X-Agent-Confirm: <encodeURIComponent(text)>` naming the
 *     human instruction (>= 20 characters decoded). Same convention in every
 *     Zoey system. Ordinary tokens keep the older two-step confirm_token flow.
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

export const ZOEY_NAME = "Zoey (סוכנת)";
export const CONFIRM_HEADER = "x-agent-confirm";
export const CONFIRM_MIN_CHARS = 20;
export const ZOEY_WRITES_PER_MINUTE = 60;

export type GuardClass = "money" | "send" | "delete" | "access";

export function isZoey(auth: AgentAuthResult): boolean {
  return auth.ok && auth.via === "token" && auth.isAgent === true;
}

/** Decoded confirm text, or null when missing / malformed / too short. */
export function readAgentConfirm(request: Request): string | null {
  const raw = request.headers.get(CONFIRM_HEADER);
  if (!raw) return null;
  let text: string;
  try {
    text = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  return text.length >= CONFIRM_MIN_CHARS ? text : null;
}

export function confirmRequiredResponse(klass: GuardClass): NextResponse {
  return NextResponse.json(
    { error: "agent_confirm_required", class: klass },
    { status: 428, headers: { "Cache-Control": "no-store" } }
  );
}

const writeLimiter = rateLimit({ windowMs: 60_000, max: ZOEY_WRITES_PER_MINUTE });

/** Returns a 429 response when this token exceeded its write budget, else null. */
export async function zoeyWriteRateLimited(tokenId: string): Promise<NextResponse | null> {
  const r = await writeLimiter.check(`zoey-write:${tokenId}`);
  if (r.success) return null;
  return NextResponse.json(
    { error: "יותר מדי כתיבות של הסוכנת. נסו שוב עוד דקה.", class: "rate_limit" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(r.reset / 1000)) } }
  );
}
