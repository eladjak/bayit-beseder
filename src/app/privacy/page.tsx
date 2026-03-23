import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: "מדיניות הפרטיות של בית בסדר — איך אנחנו מגנים על המידע שלך",
};

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
            עודכן לאחרונה: מרץ 2026
          </p>
        </header>

        <div className="prose-he space-y-10 text-foreground">
          {/* Intro */}
          <section>
            <p className="text-base leading-relaxed text-muted-foreground">
              ב-<strong className="text-foreground">בית בסדר</strong> אנחנו מאמינים שהבית שלך הוא שלך — כולל המידע עליו.
              המדיניות הזו מסבירה בשפה פשוטה מה אנחנו אוספים, למה, ואיך אנחנו מגנים עליו.
              אם יש שאלה — אנחנו כאן.
            </p>
          </section>

          {/* 1 — What we collect */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              1. מה אנחנו אוספים
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">פרטי חשבון:</strong>{" "}
                כתובת אימייל ושם — כדי שנוכל לזהות אותך ולשלוח לך התראות רלוונטיות.
                אם נכנסת עם Google, גם תמונת פרופיל עוברת אלינו (ואפשר להסיר אותה בהגדרות).
              </p>
              <p>
                <strong className="text-foreground">נתוני הבית:</strong>{" "}
                משימות, רשימות קניות, תוצאות שבועיות, ונקודות שצברתם — כל מה שאתם מזינים כדי שהאפליקציה תעבוד.
              </p>
              <p>
                <strong className="text-foreground">Google Calendar (רשות):</strong>{" "}
                אם חיברתם את היומן של גוגל, אנחנו קוראים ויוצרים אירועים בשמכם.
                אנחנו לא שומרים את תוכן היומן — רק מה שנחוץ לסנכרון.
                ניתן לנתק בכל עת מדף ההגדרות.
              </p>
              <p>
                <strong className="text-foreground">WhatsApp (רשות):</strong>{" "}
                אם חיברתם מספר טלפון לקבלת תזכורות, אנחנו שומרים את המספר לצורך שליחת הודעות בלבד.
              </p>
              <p>
                <strong className="text-foreground">נתוני שימוש:</strong>{" "}
                מידע טכני בסיסי כמו שגיאות וביצועים — כדי שנוכל לתקן בעיות מהר.
                אנחנו לא עוקבים אחרי כל קליק שלכם.
              </p>
            </div>
          </section>

          {/* 2 — How we use it */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              2. למה אנחנו משתמשים במידע
            </h2>
            <ul className="space-y-2 text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2">
                <span>✓</span>
                <span>להפעיל את האפליקציה ולשמור על הנתונים שלכם</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>לשלוח תזכורות ועדכונים שביקשתם</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>לשפר את הממשק ולתקן באגים</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>לאפשר שיתוף בין חברי הבית</span>
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">מה שאנחנו לא עושים:</strong>{" "}
              לא מוכרים מידע לצדדים שלישיים. לא משתמשים בנתוני הבית שלכם לפרסום ממוקד.
              לא שולחים ספאם.
            </p>
          </section>

          {/* 3 — Supabase */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              3. Supabase — מי מאחסן את הנתונים
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              האפליקציה בנויה על גבי{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Supabase
              </a>
              , פלטפורמת בסיס-נתונים אמינה ומאובטחת.
              הנתונים מאוחסנים בשרתים של AWS באזור EU (פרנקפורט).
              Supabase פועלת בהתאם ל-GDPR ומחילה הצפנה על נתונים במנוחה ובתעבורה.
              Supabase היא מעבד נתונים (Data Processor) שלנו — אנחנו נשארים האחראיים.
            </p>
          </section>

          {/* 4 — Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              4. עוגיות ו-localStorage
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              אנחנו משתמשים ב-localStorage של הדפדפן לשמירת העדפות כמו ערכת צבעים (בהיר/כהה),
              מצב פסח, ופרטי session.
              אין לנו עוגיות של פרסום או מעקב אנליטיקה מצד שלישי.
              עוגיות האימות מגיעות מ-Supabase ונחוצות להתחברות בלבד.
            </p>
          </section>

          {/* 5 — Your rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              5. הזכויות שלכם
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">גישה:</strong>{" "}
                כל הנתונים שלכם גלויים לכם בתוך האפליקציה.
              </p>
              <p>
                <strong className="text-foreground">תיקון:</strong>{" "}
                ניתן לערוך פרטים אישיים מדף ההגדרות בכל עת.
              </p>
              <p>
                <strong className="text-foreground">מחיקה:</strong>{" "}
                ניתן למחוק את החשבון מדף ההגדרות ← &quot;אזור מסוכן&quot;.
                כל הנתונים יימחקו תוך 30 יום.
              </p>
              <p>
                <strong className="text-foreground">ייצוא:</strong>{" "}
                רוצים עותק של הנתונים שלכם? פנו אלינו ונשלח קובץ JSON.
              </p>
              <p>
                <strong className="text-foreground">ניתוק שירותים:</strong>{" "}
                ניתן לנתק Google Calendar ו-WhatsApp בכל עת מההגדרות — בלי תוצאות לוואי.
              </p>
            </div>
          </section>

          {/* 6 — Data retention */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              6. כמה זמן שומרים על הנתונים
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              כל עוד החשבון פעיל — הנתונים שמורים.
              חשבון שלא נכנסים אליו 24 חודשים עלול להימחק לאחר הודעה מוקדמת במייל.
              לאחר מחיקת חשבון, גיבויים טכניים נמחקים תוך 30 יום נוספים.
            </p>
          </section>

          {/* 7 — Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              7. יצירת קשר בנושאי פרטיות
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              שאלה? בקשה? נשמח לשמוע.
              <br />
              <a
                href="mailto:privacy@bayitbeseder.com"
                className="text-primary underline underline-offset-2"
              >
                privacy@bayitbeseder.com
              </a>
            </p>
            <p className="mt-3 text-muted-foreground text-sm">
              אנחנו מחויבים לענות תוך 14 ימי עסקים.
            </p>
          </section>

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
