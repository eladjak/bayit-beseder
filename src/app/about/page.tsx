import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "אודות",
  description:
    "אודות בית בסדר — אפליקציה חינמית בעברית לניהול משק הבית לזוגות, משפחות ושותפים. מי אנחנו, למה בנינו את זה, ואיך זה עובד.",
  alternates: { canonical: "https://www.bayitbeseder.com/about" },
  openGraph: {
    title: "אודות | בית בסדר",
    description:
      "אודות בית בסדר — אפליקציה חינמית בעברית לניהול משק הבית לזוגות, משפחות ושותפים.",
    url: "https://www.bayitbeseder.com/about",
    siteName: "בית בסדר",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "https://www.bayitbeseder.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "בית בסדר — אודות",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-background" dir="rtl" lang="he">
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          ← חזרה לדף הבית
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            אודות בית בסדר
          </h1>
          <p className="text-sm text-muted-foreground">
            ניהול הבית ביחד, בכיף — חינם לחלוטין
          </p>
        </header>

        <div className="space-y-10 text-foreground">
          <section>
            <h2 className="text-xl font-bold mb-3">מה זה בית בסדר?</h2>
            <p className="leading-relaxed text-sm text-muted-foreground">
              בית בסדר היא אפליקציה חינמית בעברית לניהול משק הבית — לזוגות,
              משפחות, שותפים לדירה וגם למי שגר לבד. חלוקת תורנויות חכמה, תכנון
              שבועי, רשימת קניות משותפת וגיימיפיקציה שהופכת את הניקיון למשחק.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">למה בנינו את זה?</h2>
            <p className="leading-relaxed text-sm text-muted-foreground">
              כי לנהל בית ביחד לא חייב להיות מלחמה. האפליקציה נולדה מתוך צורך
              אמיתי של זוג אחד (אלעד וענבל) לחלק את עבודות הבית בלי ויכוחים —
              והפכה לפרויקט קוד פתוח שכל אחד יכול להשתמש בו ולתרום לו.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">קוד פתוח</h2>
            <p className="leading-relaxed text-sm text-muted-foreground">
              הפרויקט פתוח לקהילה ב-
              <a
                href="https://github.com/eladjak/bayit-beseder"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>
              . נתקלתם בבאג או יש לכם רעיון? נשמח לשמוע דרך{" "}
              <Link href="/contact" className="text-primary hover:underline">
                עמוד יצירת הקשר
              </Link>{" "}
              או במייל{" "}
              <a
                href="mailto:contact@bayitbeseder.com"
                className="text-primary hover:underline"
              >
                contact@bayitbeseder.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">רוצים להתחיל?</h2>
            <p className="leading-relaxed text-sm text-muted-foreground mb-4">
              ההרשמה חינמית ולוקחת פחות מדקה. לא צריך להוריד כלום — עובד ישר
              מהדפדפן.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:shadow-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6, #D946EF)",
              }}
            >
              🏠 בואו נתחיל!
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
