import { isNewUiBuild } from "@/lib/ui-flag";
import { PublicPage } from "@/screens/public/PublicPage";
import type { Metadata } from "next";
import { PolicyDocument } from "@/components/privacy/PolicyDocument";

/*
 * Terms of use. The text lives in src/lib/privacy/content.ts (Hebrew + English) and the
 * version in src/lib/privacy/policy.ts: change meaning => bump POLICY_VERSION so
 * everyone confirms again. NOT reviewed by a lawyer. Every claim must match what
 * the code does.
 */

export const metadata: Metadata = {
  title: "תנאי שימוש",
  description: "תנאי השימוש של בית בסדר — מה מותר, מה אסור, ומה אנחנו מבטיחים",
  alternates: { canonical: "https://www.bayitbeseder.com/terms" },
  openGraph: {
    title: "תנאי שימוש | בית בסדר",
    description: "תנאי השימוש של בית בסדר — מה מותר, מה אסור, ומה אנחנו מבטיחים",
    url: "https://www.bayitbeseder.com/terms",
    siteName: "בית בסדר",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://www.bayitbeseder.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "בית בסדר — תנאי שימוש",
      },
    ],
  },
};

export default function TermsPage() {
  if (isNewUiBuild()) return <PublicPage existingDocument><PolicyDocument kind="terms" /></PublicPage>;
  return <PolicyDocument kind="terms" />;
}
