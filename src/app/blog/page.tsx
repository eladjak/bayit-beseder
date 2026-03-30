import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "בלוג | בית בסדר — טיפים לניהול הבית",
  description:
    "טיפים, מדריכים ורעיונות לניהול בית משותף בצורה חכמה ויעילה. מניקיון ועד חלוקת משימות.",
};

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  icon: string;
  category: string;
  readTime: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "weekly-planning",
    title: "איך לתכנן שבוע של ניקיון ב-10 דקות",
    excerpt:
      "תכנון שבועי חוסך שעות של ויכוחים ומבטיח שהכל ייעשה. הנה השיטה שעובדת.",
    content: [
      "הטעות הנפוצה ביותר בניהול בית משותף היא לחכות ש'מישהו יעשה את זה'. תכנון שבועי פותר את הבעיה הזו מהשורש.",
      "שלב 1: רשימה מאסטר — רשמו את כל המשימות הקבועות בבית. ניקוי מטבח, שטיפת רצפות, כביסה, קניות, פינוי זבל, ניקוי שירותים. אל תשכחו דברים שנוטים 'להיעלם' כמו ניקוי מקרר או החלפת מצעים.",
      "שלב 2: חלוקה לפי ימים — במקום לנקות הכל ביום שישי, פזרו את המשימות על פני השבוע. יום ראשון: מטבח. יום שלישי: חדרי שינה. יום חמישי: סלון ושירותים.",
      "שלב 3: חלוקה הוגנת — חלקו לפי זמן, לא לפי כמות. שטיפת כלים לוקחת 15 דקות, אבל ניקוי אמבטיה לוקח 30. תוודאו שכל אחד משקיע בערך אותו זמן.",
      "טיפ בונוס: באפליקציית 'בית בסדר' אפשר להפעיל מצב אזורים — והאפליקציה מחלקת אוטומטית לפי חדרים וימים.",
    ],
    icon: "📋",
    category: "תכנון",
    readTime: "3 דקות",
  },
  {
    id: "cleaning-hacks",
    title: "10 טריקים לניקוי שיחסכו לכם זמן",
    excerpt:
      "טריקים פשוטים שהופכים ניקוי ממשימה מעצבנת לדבר שנגמר מהר.",
    content: [
      "1. מגבות מיקרופייבר לחות — מסירות 99% מהחיידקים בלי ספריי. פשוט מים.",
      "2. חומץ + סודה לשתייה — מנקים ומחטאים משטחי מטבח בצורה נהדרת, בלי כימיקלים קשים. חצי כוס חומץ + כפית סודה.",
      "3. ניקוי 10 דקות — 10 דקות של ניקוי כל יום עדיפות על ניקוי גדול אחת לשבוע. תכוונו טיימר ותעצרו כשהוא מצלצל.",
      "4. ריצת ניקיון — כל בן בית לוקח 5 חפצים שלא במקומם ומחזיר אותם. 5 דקות, כל הבית מסודר.",
      "5. ג'ל אסלה לפני שינה — 5 דקות לפני השינה, למחרת האסלה זוהרת בלי שפשוף.",
      "6. ניקוי מלמעלה למטה — תמיד תתחילו מהראי והמדפים, אחר כך הכיור, ולבסוף הרצפה. ככה האבק נופל למטה ולא מלכלך מה שכבר ניקיתם.",
      "7. ספוגית במיקרוגל — 30 שניות במיקרו הורגות את הבקטריות בספוגית. עושים את זה כל יומיים.",
      "8. נעליים ליד הדלת — מדיניות 'בלי נעליים בבית' מפחיתה 60% מהלכלוך. שימו מתקן נעליים ליד הכניסה.",
      "9. ריסוס מקלחת אחרי שימוש — ספריי מונע אבנית אחרי כל מקלחת חוסך שעות של קרצוף.",
      "10. סל כביסה בכל חדר — ככל שקל יותר לזרוק בגדים מלוכלכים לסל, ככה פחות הם מגיעים לרצפה.",
    ],
    icon: "✨",
    category: "ניקיון",
    readTime: "4 דקות",
  },
  {
    id: "fair-division",
    title: "חלוקת משימות הוגנת — בלי ויכוחים",
    excerpt:
      "השיטה שמונעת את ה'אני תמיד עושה הכל' ושומרת על שלום בית.",
    content: [
      "הסיבה מספר 1 לוויכוחים על ניקיון היא תחושת חוסר הוגנות. לא מספיק שהמשימות מחולקות — צריך שזה ירגיש הוגן.",
      "עקרון 1: חלוקה לפי זמן, לא כמות — שלוש משימות קלות לא שוות משימה אחת כבדה. מדדו לפי דקות, לא לפי פריטים.",
      "עקרון 2: גמישות — לפעמים מישהו עסוק יותר. כלל הזהב: אם אחד עושה 60% השבוע, השני עושה 60% בשבוע הבא.",
      "עקרון 3: שקיפות — כשהכל רשום ומתועד, אין מקום לוויכוחים על 'מי עשה מה'. אפליקציה כמו 'בית בסדר' עוזרת בדיוק בזה.",
      "עקרון 4: התאמה אישית — יש לכם העדפות? מישהו שונא לנקות שירותים אבל לא מפריע לו לשטוף כלים? תתאימו את החלוקה לאנשים.",
      "עקרון 5: חגיגה — סיימתם שבוע מוצלח? חגגו! זה יכול להיות ארוחה טובה, סרט, או פשוט 'כל הכבוד לנו'. חיזוק חיובי עובד.",
    ],
    icon: "⚖️",
    category: "שיתוף פעולה",
    readTime: "3 דקות",
  },
  {
    id: "motivation",
    title: "איך לשמור על מוטיבציה לניקיון (גם כשלא בא לכם)",
    excerpt:
      "הסוד הוא לא לאהוב לנקות — הסוד הוא לבנות הרגלים שעובדים גם בימים עייפים.",
    content: [
      "בוא נהיה כנים: אף אחד לא באמת אוהב לנקות. אבל כולם אוהבים בית נקי. הטריק הוא לגשר על הפער.",
      "הרגל 1: כלל ה-2 דקות — אם משימה לוקחת פחות מ-2 דקות, תעשו אותה עכשיו. שטיפת צלחת. קיפול מגבת. פינוי פח. ברגע שמתחילים, קל להמשיך.",
      "הרגל 2: מוזיקה או פודקאסט — תשמעו משהו שאתם אוהבים רק בזמן ניקיון. ככה הניקיון הופך ל'זמן שלי' ולא למשימה.",
      "הרגל 3: טיימר של 10 דקות — אין מוטיבציה? תגידו לעצמכם 'רק 10 דקות'. ברוב המקרים, אחרי 10 דקות תמשיכו כי כבר התחלתם.",
      "הרגל 4: גמיפיקציה — נקודות, רצפים, הישגים. זה עובד במשחקים, וזה עובד גם בניקוי. ב'בית בסדר' יש מערכת הישגים ואתגרים שבועיים שהופכים את הניקוי למשחק.",
      "הרגל 5: לנקות לפני ולא אחרי — תנקו לפני שהבית מלוכלך. 5 דקות של תחזוקה יומית קלות יותר משעה של 'משבר ניקיון'.",
    ],
    icon: "💪",
    category: "מוטיבציה",
    readTime: "3 דקות",
  },
  {
    id: "zones",
    title: "שיטת האזורים: לנקות חכם, לא קשה",
    excerpt:
      "במקום לחשוב על משימות בודדות, חשבו על אזורים. יום ראשון = מטבח, יום שלישי = סלון.",
    content: [
      "שיטת האזורים היא אחת השיטות הכי פופולריות לניהול בית, ולסיבה טובה — היא פשוטה ועובדת.",
      "הרעיון: במקום רשימת משימות ארוכה, מחלקים את הבית לאזורים. כל יום מתרכזים באזור אחד.",
      "דוגמה לחלוקה שבועית: ראשון — מטבח (משטחים, כיריים, רצפה). שני — כביסה + קיפול. שלישי — חדרי שינה (מצעים, אבק, רצפה). רביעי — סלון (ספות, שולחנות, רצפה). חמישי — שירותים + אמבטיה. שישי — קניות + הכנה לשבת.",
      "למה זה עובד: כשיש לכם רק אזור אחד ליום, הראש פנוי. אתם לא חושבים 'מה עוד צריך לעשות' — אתם יודעים בדיוק מה המטרה.",
      "ב'בית בסדר' אפשר להפעיל מצב אזורים בהגדרות, והמערכת מחלקת את המשימות אוטומטית לפי חדרים וימים.",
    ],
    icon: "🏠",
    category: "שיטות",
    readTime: "3 דקות",
  },
  {
    id: "quick-clean",
    title: "ניקוי מהיר לפני אורחים — 15 דקות",
    excerpt: "אורחים בדרך? הנה מה לעשות ב-15 דקות כדי שהבית ייראה מושלם.",
    content: [
      "פאניקה! מישהו הודיע שהוא בדרך ויגיע עוד 15 דקות. אל דאגה — הנה התוכנית:",
      "דקות 1-3: ריצת איסוף — תעברו על הסלון והמטבח ותאספו כל מה שלא במקומו. שימו הכל בסל או בחדר שאורחים לא ייכנסו אליו.",
      "דקות 4-6: משטחי מטבח — נגבו את המשטחים, שימו כלים מלוכלכים במדיח או בכיור עם מים.",
      "דקות 7-9: שירותי אורחים — נגבו את הכיור והמראה, תוודאו שיש נייר טואלט וסבון ידיים, שימו מגבת נקייה.",
      "דקות 10-12: סלון — יישרו כריות ספה, קפלו שמיכות, נגבו שולחן סלון.",
      "דקות 13-15: ריח ואווירה — פתחו חלון, הדליקו נר ריחני או שימו מפזר ריח. הדליקו תאורה חמה. מוזיקת רקע.",
      "הסוד: אורחים שמים לב לריח, לתאורה, ולמשטחים. לא לארונות.",
    ],
    icon: "⏱️",
    category: "טיפים מהירים",
    readTime: "2 דקות",
  },
];

export default function BlogPage() {
  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary/10 to-transparent py-12 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
          >
            ← חזרה לדף הבית
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            🏠 בלוג בית בסדר
          </h1>
          <p className="text-muted text-lg">
            טיפים, מדריכים ורעיונות לניהול בית משותף בצורה חכמה
          </p>
        </div>
      </header>

      {/* Posts Grid */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.id}
              id={post.id}
              className="bg-surface border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{post.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {post.category}
                    </span>
                    <span className="text-[10px] text-muted">
                      {post.readTime} קריאה
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">
                    {post.title}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-muted mb-4 font-medium">
                {post.excerpt}
              </p>

              <details className="group">
                <summary className="text-sm font-semibold text-primary cursor-pointer hover:underline list-none">
                  <span className="group-open:hidden">קראו עוד ←</span>
                  <span className="hidden group-open:inline">סגור ↑</span>
                </summary>
                <div className="mt-4 space-y-3">
                  {post.content.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm text-foreground/80 leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-primary/5 border border-primary/10 rounded-2xl p-8">
          <p className="text-lg font-bold text-foreground mb-2">
            רוצים לנהל את הבית בצורה חכמה?
          </p>
          <p className="text-sm text-muted mb-5">
            &quot;בית בסדר&quot; עוזרת לכם לתכנן, לחלק ולעקוב אחרי משימות
            הבית — בחינם.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl gradient-primary text-white font-semibold text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
            >
              התחילו בחינם
            </Link>
            <a
              href="https://github.com/eladjak/bayit-beseder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#24292f] dark:bg-white text-white dark:text-[#24292f] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 text-center text-xs text-muted space-y-2">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="text-primary hover:underline">
              דף הבית
            </Link>
            <Link href="/dashboard" className="text-primary hover:underline">
              דשבורד
            </Link>
            <Link href="/contact" className="text-primary hover:underline">
              צור קשר
            </Link>
            <Link href="/privacy" className="text-primary hover:underline">
              פרטיות
            </Link>
          </div>
          <p>בית בסדר © 2026</p>
        </div>
      </main>
    </div>
  );
}
