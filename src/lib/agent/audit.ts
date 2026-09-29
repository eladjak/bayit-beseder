/**
 * Audit trail for sensitive agent actions (migration 024, `agent_audit_log`).
 *
 * Writing is best-effort: an audit failure never turns a refusal into a
 * success or blocks the request. Reading degrades to an empty list when the
 * table does not exist yet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type AuditAction = "delete_task" | "deliver_to_me";
export type AuditOutcome = "preview" | "executed" | "denied" | "rejected" | "failed";

export interface AuditEntry {
  householdId: string;
  tokenId: string | null;
  tokenLabel?: string | null;
  actorUserId: string | null;
  action: AuditAction;
  target?: string | null;
  outcome: AuditOutcome;
  /** Short human note. Never a phone number. */
  detail?: string | null;
}

export interface AuditRow {
  id: string;
  action: AuditAction;
  outcome: AuditOutcome;
  tokenLabel: string | null;
  target: string | null;
  detail: string | null;
  createdAt: string;
}

type Client = SupabaseClient<Database>;

export async function logAgentAudit(supabase: Client, entry: AuditEntry): Promise<boolean> {
  try {
    const { error } = await supabase.from("agent_audit_log").insert({
      household_id: entry.householdId,
      token_id: entry.tokenId,
      token_label: entry.tokenLabel ?? null,
      actor_user_id: entry.actorUserId,
      action: entry.action,
      target: entry.target ?? null,
      outcome: entry.outcome,
      detail: entry.detail ? entry.detail.slice(0, 200) : null,
    });
    if (error) {
      console.error("[bayit-agent-audit] write failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[bayit-agent-audit] write threw:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Most recent sensitive actions for a household, newest first. [] if unavailable. */
export async function listRecentAudit(
  supabase: Client,
  householdId: string,
  limit = 15
): Promise<AuditRow[]> {
  try {
    const { data, error } = await supabase
      .from("agent_audit_log")
      .select("id, action, outcome, token_label, target, detail, created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      action: r.action as AuditAction,
      outcome: r.outcome as AuditOutcome,
      tokenLabel: (r.token_label as string | null) ?? null,
      target: (r.target as string | null) ?? null,
      detail: (r.detail as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
