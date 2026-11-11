/**
 * Single source of truth for the privacy gate.
 *
 * Bump POLICY_VERSION whenever the privacy policy or the terms change in a way
 * people should re-confirm. Everyone without a consent record for the exact
 * version below sees the gate again (see ConsentGuard and requireConsent).
 */
export const POLICY_VERSION = "2026-11-10";

/** Human date for the pages (kept next to the version so they cannot drift). */
export const POLICY_DATE = { he: "10 בנובמבר 2026", en: "10 November 2026" } as const;

export const PRIVACY_EMAIL = "privacy@bayitbeseder.com";
export const CONTACT_EMAIL = "hello@bayitbeseder.com";

export type ConsentSource = "register" | "gate" | "invite";

export interface ConsentRecord {
  policy_version: string;
  age_confirmed: boolean;
  privacy_accepted: boolean;
  terms_accepted: boolean;
}

/** True only if the record is for the CURRENT version and all three boxes were ticked. */
export function isConsentCurrent(record: Partial<ConsentRecord> | null | undefined): boolean {
  return (
    !!record &&
    record.policy_version === POLICY_VERSION &&
    record.age_confirmed === true &&
    record.privacy_accepted === true &&
    record.terms_accepted === true
  );
}

/** Error body that server routes return when consent is missing. */
export const CONSENT_REQUIRED_ERROR = "consent_required";

/** Error body when the consent check itself could not be performed (not the same as "not accepted"). */
export const CONSENT_UNAVAILABLE_ERROR = "consent_unavailable";
