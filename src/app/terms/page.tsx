import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "תנאי שימוש",
  description: "תנאי השימוש של בית בסדר — מה מותר, מה אסור, ומה אנחנו מבטיחים",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-background" dir="rtl" lang="he">
      <div className="max-w-3xl mx-auto px-4 py-10">
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
            תנאי שימוש
          </h1>
          <p className="text-sm text-muted-foreground">
            עודכן לאחרונה: מרץ 2026
          </p>
        </header>

        <div className="space-y-10 text-foreground">
          {/* Intro */}
          <section>
            <p className="text-base leading-relaxed text-muted-foreground">
              ברוכים הבאים ל-<strong className="text-foreground">בית בסדר</strong> 🏠
              <br />
              השימוש באפליקציה מהווה הסכמה לתנאים הבאים. כתבנו אותם בשפה אנושית
              ולא ב-legalese מפחיד — אבל הם עדיין מחייבים. קחו רגע לקרוא.
            </p>
          </section>

          {/* 1 — About the service */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              1. מהי האפליקציה
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              בית בסדר היא אפליקציית ניהול בית שנועדה לעזור לזוגות ומשפחות לחלק משימות,
              לנהל רשימות קניות, לתכנן את השבוע ולהנות מהדרך.
              האפליקציה ניתנת לשימוש חינמי, ואנחנו שומרים לעצמנו את הזכות להוסיף בעתיד
              תכונות בתשלום — אבל תמיד נודיע מראש ובבירור.
            </p>
          </section>

          {/* 2 — Account */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              2. חשבון ורישום
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                כדי להשתמש באפליקציה צריך ליצור חשבון עם אימייל אמיתי.
                אתם אחראים לשמור על פרטי ההתחברות שלכם בסוד.
              </p>
              <p>
                חשבון אחד = משק בית אחד.
                ניתן להזמין שותפ/ת בית לאותו חשבון — כך הנתונים משותפים ביניכם.
              </p>
              <p>
                אתם חייבים להיות בני 13 לפחות כדי להשתמש בשירות.
              </p>
            </div>
          </section>

          {/* 3 — User responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              3. אחריות המשתמש
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              אתם מתחייבים:
            </p>
            <ul className="space-y-2 text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>להזין מידע אמיתי ועדכני</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>להשתמש באפליקציה למטרתה — ניהול בית</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>לא להעביר פרטי התחברות לאנשים שאינם חלק מהבית שלכם</span>
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground leading-relaxed mb-3">
              ואתם מתחייבים שלא:
            </p>
            <ul className="space-y-2 text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2">
                <span className="text-red-500">✗</span>
                <span>לנסות לפרוץ, לשבש, או לפגוע בשירות</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500">✗</span>
                <span>להשתמש בבוטים, scrapers, או אמצעים אוטומטיים ללא אישורנו</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500">✗</span>
                <span>לנצל את הכלים שלנו לפעילות בלתי חוקית</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500">✗</span>
                <span>ליצור חשבונות מזויפים או מרובים לאותו בית</span>
              </li>
            </ul>
          </section>

          {/* 4 — IP */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              4. קניין רוחני
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              הקוד, העיצוב, הלוגו והתוכן של האפליקציה (מלבד הנתונים שלכם) הם קניינו של בית בסדר.
              אסור להעתיק, לשכפל, או לשנות אותם ללא אישור בכתב.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              הנתונים שאתם מזינים — המשימות, הרשימות, ועוד — הם שלכם לחלוטין.
              אנחנו לא טוענים לבעלות עליהם.
            </p>
          </section>

          {/* 5 — Service availability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              5. זמינות השירות
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              אנחנו שואפים להחזיק את האפליקציה זמינה 24/7, אבל החיים קורים —
              עלולים להיות גיבויים, עדכונים, ולפעמים ירידת שרתים.
              נעשה כמיטב יכולתנו להודיע מראש על תחזוקות מתוכננות.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong className="text-foreground">השירות ניתן &quot;כפי שהוא&quot; (as-is)</strong> ללא אחריות לזמינות רציפה מוחלטת.
              אנחנו לא נושאים באחריות לנזק שנגרם כתוצאה מהפסקת שירות.
            </p>
          </section>

          {/* 6 — Limitation of liability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              6. הגבלת אחריות
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              בית בסדר לא תהיה אחראית לנזקים עקיפים, מקריים, או תוצאתיים הנובעים
              מהשימוש (או הפסקת השימוש) באפליקציה.
              האחריות המקסימלית שלנו כלפיכם לא תעלה על הסכום ששילמתם לנו ב-12 החודשים האחרונים
              (שכנראה הוא אפס, כי זה חינמי).
            </p>
          </section>

          {/* 7 — Account termination */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              7. סיום חשבון
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">מצדכם:</strong>{" "}
                ניתן למחוק את החשבון בכל עת מהגדרות ← &quot;אזור מסוכן&quot;. ללא שאלות מיותרות.
              </p>
              <p>
                <strong className="text-foreground">מצדנו:</strong>{" "}
                שמורה לנו הזכות להשעות או לסגור חשבון שמפר את תנאי השימוש.
                במקרים חמורים — ללא הודעה מוקדמת.
                במקרים פחות חמורים — נשלח אזהרה תחילה.
              </p>
            </div>
          </section>

          {/* 8 — Changes to terms */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              8. שינויים בתנאים
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              מדי פעם נצטרך לעדכן את התנאים. כשנעשה זאת —
              נודיע לכם באימייל ונעדכן את התאריך בראש הדף.
              המשך השימוש לאחר ההודעה נחשב כהסכמה לתנאים המעודכנים.
              אם לא מסכימים — אפשר למחוק את החשבון (וזה בסדר גמור).
            </p>
          </section>

          {/* 9 — Governing law */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              9. הדין החל וסמכות שיפוט
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              תנאי שימוש אלו כפופים לדין הישראלי.
              כל סכסוך שיתעורר ידון בבתי המשפט המוסמכים במחוז תל אביב.
            </p>
          </section>

          {/* 10 — Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              10. יצירת קשר
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              שאלות, הצעות, או פשוט רצון להגיד שלום — אנחנו כאן:
              <br />
              <a
                href="mailto:hello@bayitbeseder.com"
                className="text-primary underline underline-offset-2"
              >
                hello@bayitbeseder.com
              </a>
            </p>
          </section>

          {/* Divider */}
          <hr className="border-border" />

          {/* Footer note */}
          <p className="text-sm text-muted-foreground">
            תנאי שימוש אלו כתובים בעברית ומחייבים בגרסתם העברית בלבד.
            שימוש באפליקציה מהווה הסכמה מלאה לכל הסעיפים לעיל.
          </p>
        </div>

        {/* Bottom nav */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            דף הבית
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            מדיניות פרטיות
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            כניסה
          </Link>
        </div>
      </div>
    </div>
  );
}
