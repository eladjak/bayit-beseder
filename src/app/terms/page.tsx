import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Terms of use - rewritten 1.10.2026 after Elad's five legal decisions
 * (see docs/TERMS-OF-USE-DRAFT.md, decision log).
 * NOT reviewed by a lawyer. Every price / billing claim here must match
 * src/app/api/sumit/* and src/app/upgrade/page.tsx.
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

const CONTACT_EMAIL = "hello@bayitbeseder.com";
const PRIVACY_EMAIL = "privacy@bayitbeseder.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

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
            עודכן לאחרונה: אוקטובר 2026
          </p>
        </header>

        <div className="space-y-10 text-foreground">
          {/* Intro */}
          <section>
            <p className="text-base leading-relaxed text-muted-foreground">
              ברוכים הבאים ל-<strong className="text-foreground">בית בסדר</strong> 🏠
              <br />
              השימוש באפליקציה מהווה הסכמה לתנאים הבאים. כתבנו אותם בשפה אנושית — אבל הם עדיין מחייבים.
              הם נקראים יחד עם{" "}
              <Link href="/privacy" className="text-primary underline underline-offset-2">מדיניות הפרטיות</Link>.
            </p>
          </section>

          <Section title="1. מהי האפליקציה ומי מפעיל אותה">
            <p>
              בית בסדר היא אפליקציה לניהול משק בית: משימות, רשימות קניות, תכנון ארוחות ותזכורות, לזוגות,
              למשפחות ולשותפים. היא מופעלת על ידי אלעד יעקובוביץ&apos;, עוסק פטור (&quot;אנחנו&quot;).
              יצירת קשר:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. מי יכול להשתמש">
            <p>מי שפותח בית באפליקציה או משלם על Plus חייב להיות בן 18 לפחות.</p>
            <p>
              חבר בית מתחת לגיל 18 מצטרף רק בהזמנה של הורה או אפוטרופוס שהוא חבר באותו בית, והאחריות על
              השימוש שלו היא של ההורה. ילדים צעירים אינם פותחים חשבון; ההורה מוסיף אותם לבית ומנהל את
              הפרטים שלהם.
            </p>
          </Section>

          <Section title="3. חשבון ומשק בית">
            <p>
              כדי להשתמש צריך חשבון עם אימייל אמיתי. אתם אחראים לשמור על פרטי ההתחברות בסוד.
              כל מי שהוזמן לבית רואה ועורך את המידע המשותף של אותו בית.
            </p>
            <p>
              <strong className="text-foreground">הוצאת חבר מהבית:</strong>{" "}
              הוא מאבד גישה למידע של הבית. מה שהזין לרשומות המשותפות (למשל משימות) עשוי להישאר בבית, אלא אם ביקש
              למחוק את המידע האישי שלו.
            </p>
            <p>
              <strong className="text-foreground">פרידה:</strong>{" "}
              כל אחד מבני הזוג יכול לפנות אלינו באימייל ולבקש להפריד את החשבונות. נעזור לכל צד לקבל עותק של המידע
              שלו. כרגע זה נעשה ידנית, לא אוטומטית.
            </p>
          </Section>

          <Section title="4. חינם ו-Plus — מחיר, תשלום וביטול">
            <p>
              <strong className="text-foreground">הגרסה החינמית</strong> נשארת חינמית, בלי הגבלת זמן.
            </p>
            <p>
              <strong className="text-foreground">Plus</strong> עולה 19 ₪ לחודש למשק בית. זה המחיר הסופי:
              אנחנו עוסק פטור, ולכן אין תוספת מע&quot;מ. התכולה המדויקת של כל מסלול מוצגת ב
              <Link href="/upgrade" className="text-primary underline underline-offset-2">עמוד השדרוג</Link>{" "}
              לפני התשלום.
            </p>
            <p>
              התשלום מתבצע בעמוד מאובטח של חברת הסליקה סאמיט (Sumit), ובסופו נשלחת קבלה לאימייל.
              כל תשלום מעניק Plus לכל חברי הבית ל-31 יום. אם התשלום הוגדר כחיוב חודשי, הוא מתחדש כל חודש
              עד שתבטלו, ולפני כל שינוי מחיר נודיע לכם לפחות 30 יום מראש.
            </p>
            <p>
              <strong className="text-foreground">ביטול:</strong>{" "}
              אפשר לבטל בכל עת, מדף ההגדרות או באימייל אלינו. החיוב הבא ייעצר תוך 3 ימי עסקים לכל המאוחר,
              ו-Plus יישאר פעיל עד סוף התקופה ששולמה.
            </p>
            <p>
              <strong className="text-foreground">החזר כספי:</strong>{" "}
              ביקשתם לבטל תוך 14 יום מהתשלום הראשון — תקבלו החזר מלא. ביטול מאוחר יותר — לבקשתכם נחזיר את החלק
              היחסי של החודש שעוד לא נוצל. ההחזר יינתן לאותו אמצעי תשלום.
            </p>
            <p>אם נפסיק את Plus או נסגור את השירות, נודיע מראש ונחזיר את החלק היחסי שלא נוצל.</p>
          </Section>

          <Section title="5. שימוש מקובל">
            <p>אתם מתחייבים:</p>
            <ul className="space-y-2 list-none">
              <li className="flex gap-2"><span className="text-green-500">✓</span><span>להשתמש באפליקציה לניהול הבית שלכם</span></li>
              <li className="flex gap-2"><span className="text-green-500">✓</span><span>להזין מידע על אחרים (למשל בן משפחה שאינו בבית) רק בהסכמתם</span></li>
              <li className="flex gap-2"><span className="text-green-500">✓</span><span>לא להעביר פרטי התחברות או קוד גישה של עוזר דיגיטלי לאנשים מחוץ לבית</span></li>
            </ul>
            <p>ואתם מתחייבים שלא:</p>
            <ul className="space-y-2 list-none">
              <li className="flex gap-2"><span className="text-red-500">✗</span><span>לנסות לגשת למידע של בית אחר, לפרוץ או לעקוף הגנות</span></li>
              <li className="flex gap-2"><span className="text-red-500">✗</span><span>להשתמש בממשק לסוכנים מעבר להרשאה שניתנה, או להעמיס על השירות</span></li>
              <li className="flex gap-2"><span className="text-red-500">✗</span><span>להשתמש בשירות לפעילות בלתי חוקית, להטרדה או לתוכן פוגעני</span></li>
            </ul>
          </Section>

          <Section title="6. קניין רוחני">
            <p>
              הקוד, העיצוב והתוכן של האפליקציה שייכים לנו. הנתונים שאתם מזינים שייכים לכם, ואנחנו לא טוענים
              לבעלות עליהם.
            </p>
          </Section>

          <Section title="7. העוזר החכם">
            <p>
              הצעות העוזר החכם (למשל תפריט שבועי) הן הצעות בלבד. בנושא אלרגיות ורגישויות מזון — בדקו בעצמכם
              שהמידע שהזנתם נכון ושהמנה מתאימה. ההחלטה מה מגישים נשארת שלכם.
            </p>
          </Section>

          <Section title="8. זמינות והגבלת אחריות">
            <p>אנחנו שואפים שהאפליקציה תהיה זמינה תמיד, אבל ייתכנו תקלות ועבודות תחזוקה. השירות ניתן כפי שהוא.</p>
            <p>
              בכפוף לחוק, איננו אחראים לנזק עקיף, והאחריות שלנו מוגבלת לסכום ששילמתם לנו ב-12 החודשים האחרונים.
              ההגבלה הזו אינה חלה על נזק שנגרם בזדון או ברשלנות חמורה שלנו, ואינה גורעת מזכויות שהחוק נותן לכם
              כצרכנים.
            </p>
          </Section>

          <Section title="9. סיום שימוש">
            <p>
              <strong className="text-foreground">מצדכם:</strong>{" "}
              אפשר להפסיק בכל עת ולבקש למחוק את החשבון באימייל ל-
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary underline underline-offset-2">
                {PRIVACY_EMAIL}
              </a>
              . המחיקה מתבצעת כמתואר במדיניות הפרטיות.
            </p>
            <p>
              <strong className="text-foreground">מצדנו:</strong>{" "}
              נוכל להשעות חשבון שמפר את התנאים. ברוב המקרים נזהיר קודם; רק במקרה חמור (למשל ניסיון לגשת למידע
              של בית אחר) נשעה מיד, ונודיע לכם למה.
            </p>
          </Section>

          <Section title="10. שינויים בתנאים">
            <p>
              שינוי מהותי יגיע אליכם באימייל או בתוך האפליקציה לפחות 30 יום לפני שייכנס לתוקף, והתאריך בראש
              הדף יתעדכן. לא מסכימים? אפשר לבטל ולמחוק את החשבון, ומי ששילם יקבל החזר יחסי.
            </p>
          </Section>

          <Section title="11. הדין וסמכות השיפוט">
            <p>
              על התנאים חל הדין הישראלי. סכסוך יידון בבית המשפט המוסמך בישראל לפי החוק — כך שאפשר לתבוע
              גם בבית המשפט הקרוב למקום מגוריכם.
            </p>
          </Section>

          <Section title="12. יצירת קשר">
            <p>
              שאלות, משוב, או סתם להגיד שלום:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          {/* Divider */}
          <hr className="border-border" />

          {/* Footer note */}
          <p className="text-sm text-muted-foreground">
            תנאי שימוש אלו כתובים בעברית ומחייבים בגרסתם העברית.
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
