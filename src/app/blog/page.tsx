import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "בלוג | בית בסדר — טיפים לניהול הבית",
  description:
    "טיפים, מדריכים ורעיונות לניהול בית משותף בצורה חכמה ויעילה. מניקיון ועד חלוקת משימות.",
  alternates: { canonical: "https://www.bayitbeseder.com/blog" },
};

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  icon: string;
  category: string;
  categoryColor: string;
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
    categoryColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    readTime: "3 דקות",
  },
  {
    id: "cleaning-hacks",
    title: "10 טריקים לניקוי שיחסכו לכם זמן",
    excerpt:
      "טריקים פשוטים שהופכים ניקוי ממשימה מעצבנת לדבר שנגמר מהר.",
    content: [
      "1. מגבות מיקרופייבר לחות — מסירות 99% מהחיידקים בלי ספריי. פשוט מים.",
      "2. חומץ + סודה לשתייה — מנקים ומחטאים משטחי מטבח בצורה נהדרת, בלי כימיקלים קשים.",
      "3. ניקוי 10 דקות — 10 דקות של ניקוי כל יום עדיפות על ניקוי גדול אחת לשבוע. תכוונו טיימר ותעצרו כשהוא מצלצל.",
      "4. ריצת ניקיון — כל בן בית לוקח 5 חפצים שלא במקומם ומחזיר אותם. 5 דקות, כל הבית מסודר.",
      "5. ג'ל אסלה לפני שינה — 5 דקות לפני השינה, למחרת האסלה זוהרת בלי שפשוף.",
      "6. ניקוי מלמעלה למטה — תמיד תתחילו מהראי והמדפים, אחר כך הכיור, ולבסוף הרצפה.",
      "7. ספוגית במיקרוגל — 30 שניות במיקרו הורגות את הבקטריות בספוגית.",
      "8. נעליים ליד הדלת — מדיניות 'בלי נעליים בבית' מפחיתה 60% מהלכלוך.",
      "9. ריסוס מקלחת אחרי שימוש — ספריי מונע אבנית אחרי כל מקלחת חוסך שעות של קרצוף.",
      "10. סל כביסה בכל חדר — ככל שקל יותר לזרוק בגדים מלוכלכים לסל, ככה פחות הם מגיעים לרצפה.",
    ],
    icon: "✨",
    category: "ניקיון",
    categoryColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
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
      "עקרון 3: שקיפות — כשהכל רשום ומתועד, אין מקום לוויכוחים על 'מי עשה מה'.",
      "עקרון 4: התאמה אישית — יש לכם העדפות? מישהו שונא לנקות שירותים אבל לא מפריע לו לשטוף כלים? תתאימו.",
      "עקרון 5: חגיגה — סיימתם שבוע מוצלח? חגגו! ארוחה טובה, סרט, או פשוט 'כל הכבוד לנו'. חיזוק חיובי עובד.",
    ],
    icon: "⚖️",
    category: "שיתוף פעולה",
    categoryColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    readTime: "3 דקות",
  },
  {
    id: "motivation",
    title: "איך לשמור על מוטיבציה לניקיון",
    excerpt:
      "הסוד הוא לא לאהוב לנקות — הסוד הוא לבנות הרגלים שעובדים גם בימים עייפים.",
    content: [
      "בוא נהיה כנים: אף אחד לא באמת אוהב לנקות. אבל כולם אוהבים בית נקי. הטריק הוא לגשר על הפער.",
      "הרגל 1: כלל ה-2 דקות — אם משימה לוקחת פחות מ-2 דקות, תעשו אותה עכשיו.",
      "הרגל 2: מוזיקה או פודקאסט — תשמעו משהו שאתם אוהבים רק בזמן ניקיון. ככה הניקיון הופך ל'זמן שלי'.",
      "הרגל 3: טיימר של 10 דקות — אין מוטיבציה? 'רק 10 דקות'. ברוב המקרים תמשיכו כי כבר התחלתם.",
      "הרגל 4: גמיפיקציה — נקודות, רצפים, הישגים. ב'בית בסדר' יש מערכת הישגים ואתגרים שבועיים.",
      "הרגל 5: לנקות לפני ולא אחרי — 5 דקות של תחזוקה יומית קלות יותר משעה של 'משבר ניקיון'.",
    ],
    icon: "💪",
    category: "מוטיבציה",
    categoryColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
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
      "דוגמה: ראשון — מטבח. שני — כביסה. שלישי — חדרי שינה. רביעי — סלון. חמישי — שירותים. שישי — קניות.",
      "למה זה עובד: כשיש לכם רק אזור אחד ליום, הראש פנוי. אתם יודעים בדיוק מה המטרה.",
      "ב'בית בסדר' אפשר להפעיל מצב אזורים בהגדרות, והמערכת מחלקת את המשימות אוטומטית.",
    ],
    icon: "🏠",
    category: "שיטות",
    categoryColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    readTime: "3 דקות",
  },
  {
    id: "quick-clean",
    title: "ניקוי מהיר לפני אורחים — 15 דקות",
    excerpt: "אורחים בדרך? הנה מה לעשות ב-15 דקות כדי שהבית ייראה מושלם.",
    content: [
      "פאניקה! מישהו הודיע שהוא בדרך ויגיע עוד 15 דקות. אל דאגה — הנה התוכנית:",
      "דקות 1-3: ריצת איסוף — תעברו על הסלון והמטבח ותאספו כל מה שלא במקומו.",
      "דקות 4-6: משטחי מטבח — נגבו את המשטחים, שימו כלים מלוכלכים במדיח.",
      "דקות 7-9: שירותי אורחים — נגבו כיור ומראה, תוודאו שיש נייר וסבון, מגבת נקייה.",
      "דקות 10-12: סלון — יישרו כריות, קפלו שמיכות, נגבו שולחן.",
      "דקות 13-15: ריח ואווירה — פתחו חלון, הדליקו נר ריחני, תאורה חמה, מוזיקת רקע.",
      "הסוד: אורחים שמים לב לריח, לתאורה, ולמשטחים. לא לארונות.",
    ],
    icon: "⏱️",
    category: "טיפים מהירים",
    categoryColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    readTime: "2 דקות",
  },
];

const CATEGORIES = [...new Set(BLOG_POSTS.map((p) => p.category))];

export default function BlogPage() {
  return (
    <div dir="rtl" lang="he" className="min-h-dvh bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #D946EF 70%, #EC4899 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24 text-center text-white">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-8"
          >
            ← חזרה לדף הבית
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
            {BLOG_POSTS.length} מאמרים
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            טיפים לניהול הבית
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
            מדריכים, שיטות ורעיונות שיעזרו לכם לנהל את הבית ביחד — בלי ויכוחים,
            בלי עומס
          </p>
        </div>
      </section>

      {/* Category pills */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={`#${BLOG_POSTS.find((p) => p.category === cat)?.id}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-border hover:border-primary/30 hover:text-primary transition-colors"
            >
              {cat}
            </a>
          ))}
        </div>
      </div>

      {/* Posts */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {BLOG_POSTS.map((post, index) => (
            <article
              key={post.id}
              id={post.id}
              className="card-elevated overflow-hidden scroll-mt-20"
            >
              {/* Card header with gradient accent */}
              <div className="h-1.5 w-full" style={{
                background: index % 2 === 0
                  ? "linear-gradient(90deg, #6366F1, #8B5CF6)"
                  : "linear-gradient(90deg, #8B5CF6, #EC4899)",
              }} />

              <div className="p-6 md:p-8">
                {/* Meta row */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{post.icon}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}
                    >
                      {post.category}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {post.readTime} קריאה
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {post.excerpt}
                </p>

                {/* Expandable content */}
                <details className="group">
                  <summary className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80 transition-opacity select-none list-none">
                    <span className="group-open:hidden flex items-center gap-1.5">
                      קראו את המאמר
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="hidden group-open:flex items-center gap-1.5">
                      סגירה
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </span>
                  </summary>

                  <div className="mt-5 pt-5 border-t border-border/50 space-y-4">
                    {post.content.map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-sm text-foreground/80 leading-7"
                      >
                        {paragraph}
                      </p>
                    ))}

                    {/* Inline CTA */}
                    <div className="mt-6 pt-4 border-t border-border/30 flex items-center gap-3 text-xs text-muted">
                      <span>נהנית מהמאמר?</span>
                      <Link
                        href="/login"
                        className="font-semibold text-primary hover:underline"
                      >
                        נסו את בית בסדר בחינם →
                      </Link>
                    </div>
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <section className="mt-16 relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
            }}
          />
          <div className="relative z-10 px-8 py-12 md:py-16 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
              מוכנים לנהל את הבית בצורה חכמה?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              &quot;בית בסדר&quot; עוזרת לכם לתכנן, לחלק ולעקוב אחרי משימות
              הבית — בחינם.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-primary font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                התחילו בחינם
              </Link>
              <a
                href="https://github.com/eladjak/bayit-beseder"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/15 backdrop-blur-sm text-white font-semibold text-sm border border-white/20 hover:bg-white/25 active:scale-95 transition-all"
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
        </section>

        {/* Footer nav */}
        <footer className="mt-12 pb-8 text-center text-xs text-muted space-y-3">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="hover:text-primary transition-colors">
              דף הבית
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-primary transition-colors"
            >
              דשבורד
            </Link>
            <Link
              href="/contact"
              className="hover:text-primary transition-colors"
            >
              צור קשר
            </Link>
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              פרטיות
            </Link>
          </div>
          <p className="text-muted/60">
            בית בסדר © 2026 — נבנה באהבה בישראל 🇮🇱
          </p>
        </footer>
      </main>
    </div>
  );
}
