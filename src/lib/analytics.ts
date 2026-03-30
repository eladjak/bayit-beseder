/**
 * Privacy-friendly analytics via Plausible.
 * No cookies, GDPR-compliant, production-only.
 */
type PlausibleFn = (name: string, opts?: { props?: Record<string, string> }) => void;

export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const plausible = (window as unknown as { plausible?: PlausibleFn }).plausible;
  if (typeof plausible === "function") {
    plausible(name, { props });
  }
}
