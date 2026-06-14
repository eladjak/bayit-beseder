/**
 * Agent API authentication.
 *
 * The agent-facing namespace (`/api/agent/*`) is a SECOND front door to the app
 * for external agents (Kami / Box / Solis / any Claude / OpenClaw instance) so a
 * person can command BayitBeSeder by voice/text instead of clicking the UI.
 *
 * Because these endpoints can expose private household data and create tasks,
 * every request MUST present a bearer token that matches `BAYIT_AGENT_KEY`.
 *
 * Security notes:
 * - The secret is read ONLY from the environment. Nothing is hardcoded.
 * - `AGENT_API_TOKEN` is accepted as a documented alias (the original
 *   docs/AGENT-INTERFACE.md design named it that). `BAYIT_AGENT_KEY` wins.
 * - Comparison is constant-time to avoid timing oracles on the token.
 * - This token is SEPARATE from `CRON_SECRET` so it can be rotated/scoped
 *   independently from the Vercel cron jobs.
 */

import { timingSafeEqual } from "node:crypto";

export interface AgentAuthResult {
  ok: boolean;
  /** HTTP status to return when `ok` is false. */
  status: number;
  /** Hebrew-friendly error payload when `ok` is false. */
  error?: string;
}

/** Read the configured agent key (BAYIT_AGENT_KEY preferred, AGENT_API_TOKEN alias). */
export function getAgentKey(): string | undefined {
  return (
    process.env.BAYIT_AGENT_KEY?.trim() ||
    process.env.AGENT_API_TOKEN?.trim() ||
    undefined
  );
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

/**
 * Verify the `Authorization: Bearer <token>` header against `BAYIT_AGENT_KEY`.
 *
 * Returns `{ ok: true }` on success, otherwise an error result with the status
 * and a Hebrew message ready to hand back to the caller.
 */
export function verifyAgentRequest(request: Request): AgentAuthResult {
  const configuredKey = getAgentKey();

  // If no key is configured, the agent API is effectively disabled. Fail closed
  // rather than exposing household data to the open internet.
  if (!configuredKey) {
    return {
      ok: false,
      status: 503,
      error:
        "ממשק הסוכנים אינו מופעל (BAYIT_AGENT_KEY לא הוגדר). הגדירו מפתח בשרת.",
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
    };
  }

  if (!safeEqual(presented, configuredKey)) {
    return { ok: false, status: 403, error: "אסימון הרשאה שגוי." };
  }

  return { ok: true, status: 200 };
}
