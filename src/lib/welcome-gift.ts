/**
 * Welcome Gift — Sprint 7.30 Loop L (Alopik final review backlog).
 *
 * Post-onboarding instant gratification: 50 bonus points + 1 free Surprise Box redeem.
 * Triggered once per user via localStorage flag.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

const STORAGE_KEY = "bayit-welcome-gift-claimed-v1";

export type WelcomeGift = {
  readonly bonusPoints: number;
  readonly freeSurpriseBoxes: number;
  readonly title: string;
  readonly subtitle: string;
  readonly emoji: string;
};

export const WELCOME_GIFT: WelcomeGift = {
  bonusPoints: 50,
  freeSurpriseBoxes: 1,
  title: "מתנת ברוכים הבאים 🎁",
  subtitle: "50 נקודות בונוס + קופסת הפתעה חינם — לפתיחה מצוינת",
  emoji: "🎁",
};

export function hasClaimedWelcomeGift(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markWelcomeGiftClaimed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // quota
  }
}

export function shouldShowWelcomeGift(): boolean {
  if (typeof window === "undefined") return false;
  // Show only after onboarding finished AND not yet claimed
  const onboardingDone = localStorage.getItem("bayit-onboarding-done-v1") === "1";
  return onboardingDone && !hasClaimedWelcomeGift();
}

/** Key inside the existing `profiles.settings` jsonb column. */
const SETTINGS_CLAIM_KEY = "welcome_gift_claimed_at";

type MinimalSupabase = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { settings?: Record<string, unknown> | null } | null }> };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => {
        is: (c: string, v: null) => { select: (c: string) => Promise<{ data: unknown[] | null }> };
      };
    };
  };
  rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Grant the welcome bonus AT MOST ONCE PER USER, enforced server-side.
 *
 * WHY — the claim used to be gated only by a localStorage flag, so the 50-point
 * bonus was re-granted on every new browser, device or cleared cache. Verified
 * in production on 2026-08-07: claiming on two browsers took one account from
 * 50 to 100 points. In an app where points unlock real household rewards and
 * feed the fairness meter, that makes the score meaningless.
 *
 * The marker lives in the EXISTING `profiles.settings` jsonb column — no schema
 * migration. The `.is(...is null)` filter makes the write conditional, so two
 * concurrent claims cannot both succeed: whoever updates 0 rows does not grant.
 *
 * Returns true only when the points were actually granted by THIS call.
 */
export async function claimWelcomeGiftOnce(
  supabase: MinimalSupabase,
  userId: string,
  bonusPoints: number,
): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", userId)
      .maybeSingle();

    const settings = (profile?.settings ?? {}) as Record<string, unknown>;
    if (settings[SETTINGS_CLAIM_KEY]) return false; // already claimed, ever, anywhere

    // Conditional write — only succeeds if the marker is still absent.
    const { data: updated } = await supabase
      .from("profiles")
      .update({ settings: { ...settings, [SETTINGS_CLAIM_KEY]: new Date().toISOString() } })
      .eq("id", userId)
      .is(`settings->>${SETTINGS_CLAIM_KEY}`, null)
      .select("id");

    if (!updated || updated.length === 0) return false; // lost the race

    await supabase.rpc("increment_user_points", { p_amount: bonusPoints });
    return true;
  } catch {
    // Fail closed: on any error we do NOT grant. A missed bonus is recoverable;
    // an unbounded points faucet is not.
    return false;
  }
}
