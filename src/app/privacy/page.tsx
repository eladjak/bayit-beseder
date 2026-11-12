import { isNewUiBuild } from "@/lib/ui-flag";
import { PublicPage } from "@/screens/public/PublicPage";
import type { Metadata } from "next";
import { PolicyDocument } from "@/components/privacy/PolicyDocument";

/*
 * Privacy policy. The text lives in src/lib/privacy/content.ts (Hebrew + English) and the
 * version in src/lib/privacy/policy.ts: change meaning => bump POLICY_VERSION so
 * everyone confirms again. NOT reviewed by a lawyer. Every claim must match what
 * the code does.
 */

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: "מדיניות הפרטיות של בית בסדר — איך אנחנו מגנים על המידע שלך",
  alternates: { canonical: "https://www.bayitbeseder.com/privacy" },
  openGraph: {
    title: "מדיניות פרטיות | בית בסדר",
    description: "מדיניות הפרטיות של בית בסדר — איך אנחנו מגנים על המידע שלך",
    url: "https://www.bayitbeseder.com/privacy",
    siteName: "בית בסדר",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://www.bayitbeseder.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "בית בסדר — מדיניות פרטיות",
      },
    ],
  },
};

export default function PrivacyPage() {
  if (isNewUiBuild()) return <PublicPage existingDocument><PolicyDocument kind="privacy" /></PublicPage>;
  return <PolicyDocument kind="privacy" />;
}
