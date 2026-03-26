import type { Metadata } from "next";
import { InviteContent } from "./invite-content";

export const metadata: Metadata = {
  title: "הזמנה להצטרף לבית",
  description: "קיבלתם הזמנה להצטרף לניהול הבית המשותף ב-בית בסדר",
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return <InviteContent />;
}
