/**
 * Privacy-friendly analytics via Plausible.
 * No cookies, GDPR-compliant, production-only.
 */
export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window !== "undefined" && (window as unknown as { plausible?: (name: string, opts: { props?: Record<string, string> }) => void }).plausible) {
    (window as unknown as { plausible: (name: string, opts: { props?: Record<string, string> }) => void }).plausible(name, { props });
  }
}
