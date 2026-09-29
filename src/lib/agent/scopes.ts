/**
 * Agent token scopes.
 *
 * Every token carries a set of scopes, chosen when the token is created and
 * never widened afterwards (to widen, create a new token). The default is what
 * agents could always do: read, and add/complete tasks. Two opt-in scopes unlock
 * the actions that used to be excluded entirely:
 *
 *  - `deliver_to_me`: send the plan/brief/prep via WhatsApp to the phone of the
 *    member who CREATED the token. Never to anyone else.
 *  - `delete_tasks`: delete tasks of the token's own household.
 *
 * Both are behind a two-step confirmation (src/lib/agent/confirm.ts).
 */

export const AGENT_SCOPES = ["read", "write", "deliver_to_me", "delete_tasks"] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

/** Baseline scopes every token has. */
export const DEFAULT_SCOPES: readonly AgentScope[] = ["read", "write"];

/** Opt-in scopes: off unless the creator explicitly ticked them. */
export const SENSITIVE_SCOPES = ["deliver_to_me", "delete_tasks"] as const;
export type SensitiveScope = (typeof SENSITIVE_SCOPES)[number];

/**
 * Turn whatever the database returned into a safe scope list. A missing column,
 * NULL, or anything that is not an array yields the DEFAULT scopes, never more.
 * Unknown strings are dropped. `read` and `write` are always present.
 */
export function normalizeScopes(raw: unknown): AgentScope[] {
  const out = new Set<AgentScope>(DEFAULT_SCOPES);
  if (Array.isArray(raw)) {
    for (const s of raw) {
      if (typeof s === "string" && (AGENT_SCOPES as readonly string[]).includes(s)) {
        out.add(s as AgentScope);
      }
    }
  }
  return [...out];
}

/** Only the opt-in scopes from a requested list (what the UI/API may ask for). */
export function parseRequestedSensitiveScopes(raw: unknown): SensitiveScope[] {
  if (!Array.isArray(raw)) return [];
  return SENSITIVE_SCOPES.filter((s) => raw.includes(s));
}

export function hasScope(scopes: readonly string[] | undefined, scope: AgentScope): boolean {
  return (scopes ?? DEFAULT_SCOPES).includes(scope);
}
