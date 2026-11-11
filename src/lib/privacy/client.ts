export type ConsentCheck = "accepted" | "needed" | "error";

/** How long the browser waits for the consent check before it gives up and offers a retry. */
export const CONSENT_CHECK_TIMEOUT_MS = 8000;

/**
 * Browser-side: does the signed-in user have consent for the CURRENT policy?
 *
 *   "accepted"  the server says yes
 *   "needed"    the server checked and there is no current record -> show the form
 *   "error"     we could not find out (outage, 5xx, network, timeout) -> show a retry,
 *               NEVER the form (someone who already consented must not be asked again
 *               because of an outage) and NEVER the app (fails closed)
 *
 * Nothing in the account's user_metadata is read: that field is user-controlled
 * and cannot be evidence that anybody ticked anything. A consent record is
 * created only by the explicit confirm action (ConsentGate -> POST /api/privacy/consent).
 *
 * Pass an AbortSignal to discard a check that is no longer wanted.
 */
export async function checkConsent(signal?: AbortSignal, timeoutMs: number = CONSENT_CHECK_TIMEOUT_MS): Promise<ConsentCheck> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const onOuterAbort = () => timeout.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
    const res = await fetch("/api/privacy/consent", { cache: "no-store", signal: timeout.signal });
    if (!res.ok) return "error";
    const body = (await res.json()) as { accepted?: unknown };
    if (body.accepted === true) return "accepted";
    if (body.accepted === false) return "needed";
    return "error";
  } catch {
    return "error";
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}
