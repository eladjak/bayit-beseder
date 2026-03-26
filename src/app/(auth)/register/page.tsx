import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "הרשמה",
  description: "צרו חשבון חינמי ב-בית בסדר — אפליקציה לניהול הבית לזוגות ומשפחות",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
