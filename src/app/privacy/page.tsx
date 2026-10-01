import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Privacy policy — rewritten 1.10.2026 after Elad's five legal decisions
 * (see docs/PRIVACY-POLICY-DRAFT.md "יומן החלטות").
 * NOT reviewed by a lawyer (לא נבדק ע"י עורך דין). Keep this page and the
 * draft doc in sync; every claim here must match what the code actually does.
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <strong className="text-foreground">{label}:</strong> {children}
    </p>
  );
}

const PRIVACY_EMAIL = "privacy@bayitbeseder.com";

const PROVIDERS: { name: string; gets: string; why: string }[] = [
  {
    name: "Supabase",
    gets: "כל נתוני האפליקציה וההתחברות",
    why: "מסד הנתונים וההרשמה. מעבד את המידע בשמנו בלבד.",
  },
  {
    name: "Vercel",
    gets: "בקשות לאתר (כתובת IP, סוג דפדפן)",
    why: "אחסון האתר והשרת שמריץ אותו.",
  },
  {
    name: "Google Gemini, במסלול בתשלום",
    gets: "מה שכותבים לעוזר החכם, והקשר רלוונטי מהבית (משימות, ארוחות, העדפות אוכל)",
    why: "כדי לענות בצ'אט ולהציע תפריט ותובנות. במסלול בתשלום גוגל אינה משתמשת בתוכן לאימון המודלים שלה.",
  },
  {
    name: "Green API (וואטסאפ)",
    gets: "מספר טלפון ותוכן התזכורות",
    why: "רק למי שבחר לחבר וואטסאפ: שליחת תזכורות וקבלת עדכונים.",
  },
  {
    name: "Google (התחברות ויומן)",
    gets: "שם, אימייל, תמונת פרופיל; ואם חיברתם יומן, האירועים שנוצרים ומסונכרנים",
    why: "התחברות בלי סיסמה נפרדת, וסנכרון יומן למי שבחר בכך.",
  },
  {
    name: "Sumit (סאמיט)",
    gets: "שם, אימייל ופרטי התשלום שאתם מזינים בעמוד התשלום שלהם",
    why: "סליקה והפקת קבלה. פרטי האשראי נשארים אצל סאמיט ואינם מגיעים אלינו.",
  },
  {
    name: "Sentry",
    gets: "דוחות שגיאה טכניים",
    why: "כדי לגלות ולתקן תקלות מהר.",
  },
  {
    name: "Plausible",
    gets: "סטטיסטיקת ביקורים כללית, בלי עוגיות ובלי זיהוי אישי",
    why: "כדי לדעת אילו עמודים שימושיים.",
  },
];

export default function PrivacyPage() {
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
            מדיניות פרטיות
          </h1>
          <p className="text-sm text-muted-foreground">
            עודכן לאחרונה: אוקטובר 2026
          </p>
        </header>

        <div className="prose-he space-y-10 text-foreground">
          {/* Intro */}
          <section>
            <p className="text-base leading-relaxed text-muted-foreground">
              ב-<strong className="text-foreground">בית בסדר</strong> אנחנו מאמינים שהבית שלך הוא שלך — כולל המידע עליו.
              המדיניות הזו מסבירה בשפה פשוטה מה אנחנו אוספים, למה, למי זה מועבר, ומה הזכויות שלכם.
            </p>
          </section>

          <Section title="1. מי אחראי על המידע">
            <p>
              בית בסדר מופעלת על ידי אלעד יעקובוביץ&apos;, עוסק פטור (&quot;אנחנו&quot;).
              הוא האחראי על המידע ואיש הקשר לכל נושא פרטיות:{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary underline underline-offset-2">
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. מה אנחנו אוספים">
            <Item label="פרטי חשבון">
              שם וכתובת אימייל. אם נכנסתם עם Google, גם תמונת פרופיל.
            </Item>
            <Item label="נתוני הבית">
              משימות, רשימות קניות, תוצאות שבועיות ונקודות — כל מה שאתם מזינים כדי שהאפליקציה תעבוד.
            </Item>
            <Item label="ארוחות, העדפות אוכל, אלרגיות וכשרות">
              רק אם הזנתם אותם, כדי להציע תפריט שמתאים לבית. מידע על אלרגיות הוא מידע רגיש, ולכן אנחנו מבקשים
              להזין רק את מה שנחוץ לתכנון הארוחות.
            </Item>
            <Item label="פרטי ילדים">
              שם, גיל, העדפות ומשימות של ילדים שההורים הוסיפו לבית. ראו סעיף 6.
            </Item>
            <Item label="WhatsApp (רשות)">
              מספר טלפון של מי שבחר לקבל תזכורות בוואטסאפ.
            </Item>
            <Item label="Google Calendar (רשות)">
              אם חיברתם יומן, אנחנו קוראים ויוצרים אירועים בשמכם, רק לצורך הסנכרון. אפשר לנתק בכל עת מההגדרות.
            </Item>
            <Item label="משוב">
              דירוג ותוכן שאתם שולחים לנו מתוך האפליקציה.
            </Item>
            <Item label="תשלום">
              אם שדרגתם ל-Plus: סטטוס המנוי ומזהי התשלום. פרטי כרטיס האשראי נשארים אצל סאמיט.
            </Item>
            <Item label="נתונים טכניים">
              שגיאות וביצועים, כדי לתקן תקלות. אנחנו לא עוקבים אחרי כל קליק.
            </Item>
            <p>
              <strong className="text-foreground">אין חובה חוקית למסור לנו מידע.</strong>{" "}
              אבל בלי שם ואימייל אי אפשר לפתוח חשבון, ובלי נתוני הבית האפליקציה לא יכולה לעבוד.
              מידע שהוא רשות (וואטסאפ, יומן, אלרגיות) אפשר פשוט לא למסור.
            </p>
          </Section>

          <Section title="3. למה אנחנו משתמשים במידע">
            <ul className="space-y-2 list-none">
              <li className="flex gap-2"><span>✓</span><span>להפעיל את האפליקציה ולשתף את המידע בין חברי הבית</span></li>
              <li className="flex gap-2"><span>✓</span><span>לשלוח תזכורות ועדכונים שביקשתם</span></li>
              <li className="flex gap-2"><span>✓</span><span>להפעיל את העוזר החכם ותכנון הארוחות</span></li>
              <li className="flex gap-2"><span>✓</span><span>לגבות תשלום על Plus ולהפיק קבלה</span></li>
              <li className="flex gap-2"><span>✓</span><span>לתקן תקלות ולשפר את האפליקציה</span></li>
            </ul>
            <p>
              <strong className="text-foreground">מה שאנחנו לא עושים:</strong>{" "}
              לא מוכרים מידע. לא משתמשים בנתוני הבית לפרסום ממוקד. לא שולחים ספאם.
            </p>
          </Section>

          <Section title="4. מי רואה את המידע">
            <p>
              המידע של בית גלוי רק לחברי אותו בית. ההגבלה נאכפת בשרת ולא רק במסך: גם בקשה ישירה למידע של בית אחר
              נדחית. עוזרים דיגיטליים שחיברתם (למשל דרך קוד גישה מההגדרות) מוגבלים לבית שלכם בלבד, ולהרשאות שנתתם להם.
            </p>
          </Section>

          <Section title="5. ספקים שמקבלים מידע">
            <p>כל ספק מקבל רק את מה שנחוץ לתפקיד שלו:</p>
            <ul className="space-y-3 list-none">
              {PROVIDERS.map((p) => (
                <li key={p.name}>
                  <strong className="text-foreground">{p.name}</strong> — {p.gets}. {p.why}
                </li>
              ))}
            </ul>
            <p>
              חלק מהספקים שומרים מידע בשרתים מחוץ לישראל (באירופה או בארצות הברית). אנחנו עובדים רק עם ספקים
              שמתחייבים להגן על המידע ולהשתמש בו רק כדי לתת לנו את השירות.
            </p>
          </Section>

          <Section title="6. מידע על ילדים">
            <p>
              ילדים אינם פותחים חשבון בעצמם. הורה או אפוטרופוס מוסיף אותם לבית, מנהל את הפרטים שלהם, ויכול
              לתקן או למחוק אותם בכל עת. חבר בית מתחת לגיל 18 מצטרף רק בהזמנה של הורה שהוא חבר בבית.
              האפליקציה אינה פונה לילדים בפרסום ואינה אוספת מהם מידע בלי מעורבות הורה.
            </p>
          </Section>

          <Section title="7. עוגיות ו-localStorage">
            <p>
              אנחנו שומרים בדפדפן העדפות כמו ערכת צבעים ופרטי התחברות. עוגיות ההתחברות נחוצות כדי שהאפליקציה
              תעבוד. אין עוגיות פרסום, וסטטיסטיקת הביקורים שלנו אינה משתמשת בעוגיות.
            </p>
          </Section>

          <Section title="8. הזכויות שלכם">
            <Item label="עיון">כל הנתונים שלכם גלויים לכם באפליקציה, ואפשר לבקש מאיתנו עותק מלא.</Item>
            <Item label="תיקון">אפשר לערוך פרטים מדף ההגדרות, או לבקש מאיתנו לתקן.</Item>
            <Item label="מחיקה">
              שלחו בקשה ל-
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary underline underline-offset-2">
                {PRIVACY_EMAIL}
              </a>{" "}
              מהאימייל של החשבון, ואנחנו נמחק את החשבון והמידע לפי סעיף 9.
            </Item>
            <Item label="ייצוא">
              אפשר להוריד את המשימות וההיסטוריה כקובץ מדף ההגדרות, ולבקש מאיתנו עותק מלא של כל המידע.
            </Item>
            <Item label="ביטול הסכמה">
              אפשר לנתק וואטסאפ ויומן בכל עת מההגדרות, ולהפסיק לקבל עדכונים.
            </Item>
            <Item label="תלונה">
              אם אתם חושבים שלא כיבדנו את הזכויות שלכם, אפשר לפנות אלינו, וגם לרשות להגנת הפרטיות במשרד המשפטים.
            </Item>
            <p>נענה לכל בקשה תוך 14 ימי עסקים, ונבצע אותה לכל המאוחר תוך 30 יום.</p>
          </Section>

          <Section title="9. כמה זמן שומרים, ואיך מוחקים">
            <ul className="space-y-2 list-none">
              <li>כל עוד החשבון פעיל — הנתונים שמורים.</li>
              <li>אחרי בקשת מחיקה — המידע נמחק מהמערכת הפעילה תוך 30 יום.</li>
              <li>גיבויים טכניים עשויים להכיל את המידע עד 90 יום נוספים, ואז הם מתחלפים ונמחקים.</li>
              <li>קבלות ומסמכי הנהלת חשבונות נשמרים 7 שנים, כפי שהחוק מחייב, גם אחרי מחיקה.</li>
              <li>חשבון שלא נכנסו אליו 24 חודשים עלול להימחק, אחרי הודעה מוקדמת באימייל.</li>
            </ul>
          </Section>

          <Section title="10. אבטחת מידע">
            <p>
              הגישה למידע מוגבלת בשרת לכל בית בנפרד, התקשורת מוצפנת, והמידע מוצפן אצל ספק האחסון.
              אם יקרה אירוע אבטחה חמור שנוגע למידע שלכם, נודיע לכם באימייל בלי עיכוב מיותר, ונדווח לרשות
              להגנת הפרטיות כשהחוק מחייב זאת.
            </p>
          </Section>

          <Section title="11. שינויים במדיניות">
            <p>
              אם נשנה משהו מהותי, נודיע באימייל או בתוך האפליקציה לפני שהשינוי ייכנס לתוקף, ונעדכן את התאריך בראש הדף.
            </p>
          </Section>

          {/* Divider */}
          <hr className="border-border" />

          {/* Footer note */}
          <p className="text-sm text-muted-foreground">
            המדיניות הזו כתובה בעברית. במקרה של סתירה בין גרסאות שפות שונות —
            הגרסה העברית הקובעת.
          </p>
        </div>

        {/* Bottom nav */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            דף הבית
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            תנאי שימוש
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            כניסה
          </Link>
        </div>
      </div>
    </div>
  );
}
