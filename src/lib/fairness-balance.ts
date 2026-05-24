/**
 * Fairness Balance — Sprint 7.31 (founder stress-test council recommendation #1).
 *
 * The painkiller WhatsApp/Keep can't replicate: a visual, NON-competitive view of
 * how the household load split this week. Defuses the "who does more?" argument by
 * showing it in black and white — framed as teamwork + a gentle nudge to rebalance,
 * NEVER as shaming the lower contributor.
 *
 * v1 weights by completion count over a rolling 7-day window (reuses the same data
 * the stats page uses). Effort-weighting (by estimated minutes) is a future v2.
 */

import { computeMembersComparison, type MemberCompletionCount } from "@/lib/task-stats";
import type { TaskCompletionRow } from "@/lib/types/database";

export interface FairnessShare {
  readonly userId: string;
  readonly name: string;
  readonly count: number;
  /** Percentage of this week's completions, 0-100, rounded. */
  readonly pct: number;
}

export type FairnessVerdict = "balanced" | "slight" | "skewed";

export interface FairnessBalance {
  readonly shares: ReadonlyArray<FairnessShare>;
  readonly total: number;
  readonly verdict: FairnessVerdict;
  /** Warm, non-shaming headline for the dashboard card. */
  readonly headline: string;
  /** Whether the meter is worth showing (≥2 members AND ≥1 completion this week). */
  readonly show: boolean;
}

/** Largest gap (in percentage points) between any two members' shares. */
function spread(shares: ReadonlyArray<FairnessShare>): number {
  if (shares.length < 2) return 0;
  const pcts = shares.map((s) => s.pct);
  return Math.max(...pcts) - Math.min(...pcts);
}

function classify(gap: number): FairnessVerdict {
  if (gap <= 15) return "balanced";
  if (gap <= 35) return "slight";
  return "skewed";
}

/**
 * Build a non-shaming headline. Names the TOP contributor positively (gratitude)
 * and nudges toward rebalancing — never points at who did least.
 */
function buildHeadline(
  shares: ReadonlyArray<FairnessShare>,
  verdict: FairnessVerdict
): string {
  if (shares.length >= 3) {
    return verdict === "balanced"
      ? "העומס בבית מתחלק יפה השבוע 💚 כל הכבוד לכולם"
      : "ככה מתחלק העומס בבית השבוע — שווה הצצה כדי לאזן יחד 🤝";
  }
  const top = shares[0];
  switch (verdict) {
    case "balanced":
      return "איזון יפה השבוע 💚 שניכם מושכים ביחד";
    case "slight":
      return `${top.name} לקח/ה קצת יותר השבוע — תודה! אפשר לאזן בימים הקרובים`;
    default:
      return `השבוע רוב המשימות נפלו על ${top.name}. שווה לחלק מחדש כדי שיהיה הוגן לכולם 🤝`;
  }
}

export function computeFairnessBalance(
  completions: TaskCompletionRow[],
  members: Array<{ id: string; name: string }>,
  today: string
): FairnessBalance {
  const counts: MemberCompletionCount[] = computeMembersComparison(completions, members, today);
  const total = counts.reduce((sum, m) => sum + m.count, 0);

  const shares: FairnessShare[] = counts.map((m) => ({
    userId: m.userId,
    name: m.name,
    count: m.count,
    pct: total > 0 ? Math.round((m.count / total) * 100) : 0,
  }));

  const verdict = classify(spread(shares));
  const show = members.length >= 2 && total > 0;

  return {
    shares,
    total,
    verdict,
    headline: buildHeadline(shares, verdict),
    show,
  };
}
