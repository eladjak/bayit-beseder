import type { User } from "@supabase/supabase-js";
import { POLICY_VERSION } from "./policy";

export type ConsentCheck = "accepted" | "needed" | "error";

/**
 * Browser-side: does the signed-in user have consent for the CURRENT policy?
 *
 * Fails CLOSED ("error", never "accepted") when the check itself fails.
 *
 * Registration with email confirmation cannot write the record (no session
 * yet), so the register form leaves a note in the account metadata. Here we
 * turn that note into a real record, but ONLY if it names the current policy
 * version and carries all three confirmations.
 */
export async function checkConsent(user: Pick<User, "user_metadata">): Promise<ConsentCheck> {
  try {
    const res = await fetch("/api/privacy/consent", { cache: "no-store" });
    if (!res.ok) return "error";
    const { accepted } = (await res.json()) as { accepted: boolean };
    if (accepted) return "accepted";

    const note = user.user_metadata?.privacy_consent as
      | { version?: string; age?: boolean; privacy?: boolean; terms?: boolean; locale?: string }
      | undefined;
    if (note?.version === POLICY_VERSION && note.age && note.privacy && note.terms) {
      const save = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageConfirmed: true,
          privacyAccepted: true,
          termsAccepted: true,
          locale: note.locale === "en" ? "en" : "he",
          source: "register",
        }),
      });
      if (save.ok) return "accepted";
    }
    return "needed";
  } catch {
    return "error";
  }
}
