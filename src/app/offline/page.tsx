import type { Metadata } from "next";
import { OfflineContent } from "./offline-content";

export const metadata: Metadata = {
  title: "אין חיבור לאינטרנט",
  description: "נראה שאין חיבור לאינטרנט. בית בסדר עובד גם במצב לא מקוון.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineContent />;
}
