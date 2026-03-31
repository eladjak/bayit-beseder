"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageToggle } from "@/components/language-toggle";
import type { SanityPost } from "@/lib/sanity/client";

interface BlogPost {
  id: string;
  he: {
    title: string;
    excerpt: string;
    content: string[];
    category: string;
    readTime: string;
    ctaText: string;
  };
  en: {
    title: string;
    excerpt: string;
    content: string[];
    category: string;
    readTime: string;
    ctaText: string;
  };
  icon: string;
  /** Tailwind classes for the category badge */
  categoryColor: string;
  /** CSS gradient string for the illustration area (fallback) */
  illustrationGradient: string;
  /** Accent bar gradient (top of card) */
  accentGradient: string;
  /** Optional real image path */
  imagePath?: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "weekly-planning",
    icon: "📋",
    categoryColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    illustrationGradient:
      "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)",
    accentGradient: "linear-gradient(90deg, #3B82F6, #6366F1)",
    imagePath: "/images/blog/weekly-planning.png",
    he: {
      category: "תכנון",
      readTime: "3 דקות",
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
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Planning",
      readTime: "3 min",
      title: "How to Plan a Week of Cleaning in 10 Minutes",
      excerpt:
        "A weekly plan saves hours of arguments and ensures everything gets done. Here's the method that works.",
      content: [
        "The most common mistake in shared home management is waiting for 'someone to do it'. Weekly planning solves this problem at the root.",
        "Step 1: Master list — Write down every recurring household task. Kitchen cleaning, mopping floors, laundry, groceries, trash, bathroom cleaning. Don't forget things that tend to 'disappear' like fridge cleaning or changing bed sheets.",
        "Step 2: Spread across days — Instead of cleaning everything on Friday, distribute tasks throughout the week. Sunday: kitchen. Tuesday: bedrooms. Thursday: living room and bathrooms.",
        "Step 3: Fair division — Divide by time, not quantity. Washing dishes takes 15 minutes, but cleaning the bathroom takes 30. Make sure everyone invests roughly the same time.",
        "Bonus tip: In the BayitBeSeder app you can activate zone mode — and the app automatically divides tasks by rooms and days.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
  {
    id: "cleaning-hacks",
    icon: "✨",
    categoryColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    illustrationGradient:
      "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%)",
    accentGradient: "linear-gradient(90deg, #10B981, #34D399)",
    imagePath: "/images/blog/cleaning-hacks.png",
    he: {
      category: "ניקיון",
      readTime: "4 דקות",
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
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Cleaning",
      readTime: "4 min",
      title: "10 Cleaning Hacks That Will Save You Time",
      excerpt:
        "Simple tricks that turn cleaning from an annoying chore into something that gets done fast.",
      content: [
        "1. Damp microfiber cloths — remove 99% of bacteria without spray. Just water.",
        "2. Vinegar + baking soda — cleans and disinfects kitchen surfaces wonderfully, without harsh chemicals.",
        "3. 10-minute cleaning — 10 minutes of cleaning every day beats one big clean per week. Set a timer and stop when it rings.",
        "4. Pickup run — each household member picks up 5 items that are out of place and returns them. 5 minutes, whole house tidy.",
        "5. Toilet gel before bed — 5 minutes before sleep, by morning the toilet shines without scrubbing.",
        "6. Clean top to bottom — always start with mirrors and shelves, then the sink, then the floor.",
        "7. Sponge in the microwave — 30 seconds in the microwave kills bacteria in the sponge.",
        "8. Shoes at the door — a 'no shoes in the house' policy reduces 60% of dirt.",
        "9. Shower spray after each use — an anti-limescale spray after every shower saves hours of scrubbing.",
        "10. Laundry basket in every room — the easier it is to toss dirty clothes in the basket, the less they end up on the floor.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
  {
    id: "fair-division",
    icon: "⚖️",
    categoryColor:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    illustrationGradient:
      "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)",
    accentGradient: "linear-gradient(90deg, #8B5CF6, #A855F7)",
    imagePath: "/images/blog/fair-division.png",
    he: {
      category: "שיתוף פעולה",
      readTime: "3 דקות",
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
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Collaboration",
      readTime: "3 min",
      title: "Fair Task Division — Without Arguments",
      excerpt:
        "The method that prevents 'I always do everything' and keeps the peace at home.",
      content: [
        "The number one reason for cleaning arguments is a feeling of unfairness. It's not enough that tasks are divided — it needs to feel fair.",
        "Principle 1: Divide by time, not quantity — three easy tasks don't equal one heavy task. Measure in minutes, not items.",
        "Principle 2: Flexibility — sometimes someone is busier. The golden rule: if one person does 60% this week, the other does 60% next week.",
        "Principle 3: Transparency — when everything is written and documented, there's no room for arguments about 'who did what'.",
        "Principle 4: Personalization — do you have preferences? Someone who hates cleaning the bathroom but doesn't mind washing dishes? Adapt accordingly.",
        "Principle 5: Celebration — finished a successful week? Celebrate! A nice meal, a movie, or just 'well done us'. Positive reinforcement works.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
  {
    id: "motivation",
    icon: "💪",
    categoryColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    illustrationGradient:
      "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
    accentGradient: "linear-gradient(90deg, #F59E0B, #F97316)",
    imagePath: "/images/blog/motivation.png",
    he: {
      category: "מוטיבציה",
      readTime: "3 דקות",
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
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Motivation",
      readTime: "3 min",
      title: "How to Stay Motivated to Clean",
      excerpt:
        "The secret isn't loving to clean — the secret is building habits that work even on tired days.",
      content: [
        "Let's be honest: nobody really loves cleaning. But everyone loves a clean home. The trick is bridging that gap.",
        "Habit 1: The 2-minute rule — if a task takes less than 2 minutes, do it now.",
        "Habit 2: Music or podcast — listen to something you love only while cleaning. This turns cleaning into 'my time'.",
        "Habit 3: 10-minute timer — no motivation? 'Just 10 minutes'. Most of the time you'll continue because you've already started.",
        "Habit 4: Gamification — points, streaks, achievements. BayitBeSeder has an achievement system and weekly challenges.",
        "Habit 5: Clean before not after — 5 minutes of daily maintenance is easier than an hour of 'cleaning crisis'.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
  {
    id: "zones",
    icon: "🏠",
    categoryColor:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    illustrationGradient:
      "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)",
    accentGradient: "linear-gradient(90deg, #6366F1, #8B5CF6)",
    imagePath: "/images/blog/zones.png",
    he: {
      category: "שיטות",
      readTime: "3 דקות",
      title: "שיטת האזורים: לנקות חכם, לא קשה",
      excerpt:
        "במקום לחשוב על משימות בודדות, חשבו על אזורים. יום ראשון = מטבח, יום שלישי = סלון.",
      content: [
        "שיטת האזורים היא אחת השיטות הכי פופולריות לניהול בית, ולסיבה טובה — היא פשוטה ועובדת.",
        "הרעיון: במקום רשימת משימות ארוכה, מחלקים את הבית לאזורים. כל יום מתרכזים באזור אחד.",
        "דוגמה לשבוע: ראשון — מטבח. שני — כביסה. שלישי — חדרי שינה. רביעי — סלון. חמישי — שירותים. שישי — קניות.",
        "למה זה עובד: כשיש לכם רק אזור אחד ליום, הראש פנוי. אתם יודעים בדיוק מה המטרה ואין בלבול של 'מה עכשיו'.",
        "ב'בית בסדר' אפשר להפעיל מצב אזורים בהגדרות, והמערכת מחלקת את המשימות אוטומטית לפי אזורים וימים.",
      ],
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Methods",
      readTime: "3 min",
      title: "The Zone Method: Clean Smart, Not Hard",
      excerpt:
        "Instead of thinking about individual tasks, think about zones. Sunday = kitchen, Tuesday = living room.",
      content: [
        "The zone method is one of the most popular home management methods, and for good reason — it's simple and it works.",
        "The idea: instead of a long task list, divide the home into zones. Each day you focus on one zone.",
        "Weekly example: Sunday — kitchen. Monday — laundry. Tuesday — bedrooms. Wednesday — living room. Thursday — bathrooms. Friday — groceries.",
        "Why it works: when you only have one zone per day, your head is clear. You know exactly what the goal is and there's no confusion about 'what's next'.",
        "In BayitBeSeder you can activate zone mode in settings, and the system automatically distributes tasks by zones and days.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
  {
    id: "quick-clean",
    icon: "⏱️",
    categoryColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    illustrationGradient:
      "linear-gradient(135deg, #FFE4E6 0%, #FECDD3 50%, #FDA4AF 100%)",
    accentGradient: "linear-gradient(90deg, #F43F5E, #EC4899)",
    imagePath: "/images/blog/quick-clean.png",
    he: {
      category: "טיפים מהירים",
      readTime: "2 דקות",
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
      ctaText: "נסו את בית בסדר בחינם →",
    },
    en: {
      category: "Quick Tips",
      readTime: "2 min",
      title: "Quick Clean Before Guests — 15 Minutes",
      excerpt:
        "Guests on the way? Here's what to do in 15 minutes to make your home look perfect.",
      content: [
        "Panic! Someone announced they're on the way and will arrive in 15 minutes. Don't worry — here's the plan:",
        "Minutes 1-3: Pickup run — go through the living room and kitchen and collect everything that's out of place.",
        "Minutes 4-6: Kitchen surfaces — wipe down surfaces, put dirty dishes in the dishwasher.",
        "Minutes 7-9: Guest bathroom — wipe sink and mirror, make sure there's paper and soap, a clean towel.",
        "Minutes 10-12: Living room — straighten cushions, fold blankets, wipe the table.",
        "Minutes 13-15: Scent and ambiance — open a window, light a scented candle, warm lighting, background music.",
        "The secret: guests notice smell, lighting, and surfaces. Not cabinets.",
      ],
      ctaText: "Try BayitBeSeder free →",
    },
  },
];

interface BlogContentProps {
  sanityPosts?: SanityPost[];
}

export function BlogContent({ sanityPosts = [] }: BlogContentProps) {
  const { locale } = useTranslation();
  const isRtl = locale === "he";
  const dir = isRtl ? "rtl" : "ltr";
  const lang = isRtl ? "he" : "en";

  // Filter Sanity posts by locale
  const dynamicPosts = sanityPosts.filter(
    (p) => p.language === locale || p.language === lang
  );

  const totalCount = dynamicPosts.length + BLOG_POSTS.length;

  const heroTitle = isRtl ? "טיפים לניהול הבית" : "Home Management Tips";
  const heroSubtitle = isRtl
    ? "מדריכים, שיטות ורעיונות שיעזרו לכם לנהל את הבית ביחד — בלי ויכוחים, בלי עומס"
    : "Guides, methods and ideas to help you manage your home together — without arguments, without overload";
  const backLabel = isRtl ? "← חזרה לדף הבית" : "← Back to home";
  const articleCountLabel = isRtl
    ? `${totalCount} מאמרים`
    : `${totalCount} articles`;
  const readLabel = isRtl ? "קריאה" : "read";
  const expandLabel = isRtl ? "קראו את המאמר" : "Read article";
  const collapseLabel = isRtl ? "סגירה" : "Close";
  const enjoyLabel = isRtl ? "נהנית מהמאמר?" : "Enjoyed the article?";
  const ctaHeadline = isRtl
    ? "מוכנים לנהל את הבית בצורה חכמה?"
    : "Ready to manage your home smarter?";
  const ctaBody = isRtl
    ? '"בית בסדר" עוזרת לכם לתכנן, לחלק ולעקוב אחרי משימות הבית — בחינם.'
    : '"BayitBeSeder" helps you plan, divide and track household tasks — for free.';
  const startFreeLabel = isRtl ? "התחילו בחינם" : "Start free";
  const footerLinks = isRtl
    ? { home: "דף הבית", dashboard: "דשבורד", contact: "צור קשר", privacy: "פרטיות" }
    : { home: "Home", dashboard: "Dashboard", contact: "Contact", privacy: "Privacy" };
  const copyright = isRtl
    ? "בית בסדר © 2026 — נבנה באהבה בישראל 🇮🇱"
    : "BayitBeSeder © 2026 — Built with love in Israel 🇮🇱";

  const categories = [...new Set(BLOG_POSTS.map((p) => p[locale].category))];

  return (
    <div dir={dir} lang={lang} className="min-h-dvh bg-background">
      {/* Language toggle (always visible, fixed) */}
      <LanguageToggle />

      {/* Top navbar */}
      <nav className="fixed top-0 inset-x-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-base font-bold text-foreground hover:text-primary transition-colors"
          >
            {isRtl ? "בית בסדר" : "BayitBeSeder"}
          </Link>
          <Link
            href="/"
            className="text-xs text-muted hover:text-foreground transition-colors hidden sm:block"
          >
            {backLabel}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
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
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-8 sm:hidden"
          >
            {backLabel}
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
            {articleCountLabel}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            {heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Sticky category pills */}
      <div className="sticky top-14 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const post = BLOG_POSTS.find((p) => p[locale].category === cat);
            return (
              <a
                key={cat}
                href={`#${post?.id ?? ""}`}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-border hover:border-primary/30 hover:text-primary transition-colors"
              >
                {cat}
              </a>
            );
          })}
        </div>
      </div>

      {/* Posts */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {/* Dynamic Sanity CMS posts */}
          {dynamicPosts.map((post) => (
            <article
              key={post._id}
              id={post.slug.current}
              className="card-elevated overflow-hidden scroll-mt-28"
            >
              {/* Accent bar */}
              <div
                className="h-1.5 w-full"
                style={{ background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }}
              />

              {/* Image or gradient fallback */}
              {post.mainImageUrl ? (
                <div className="relative w-full" style={{ height: 180 }}>
                  <Image
                    src={post.mainImageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                </div>
              ) : (
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: 120,
                    background: "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)",
                  }}
                >
                  <span className="text-5xl select-none" aria-hidden="true">
                    {"\u270D\uFE0F"}
                  </span>
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {post.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.publishedAt && (
                    <span className="text-[11px] text-muted">
                      {new Date(post.publishedAt).toLocaleDateString(
                        isRtl ? "he-IL" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-white bg-primary rounded-full px-2 py-0.5">
                    {isRtl ? "חדש" : "New"}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug">
                  {post.title}
                </h2>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    {post.excerpt}
                  </p>
                )}

                {/* Body */}
                {post.bodyText && (
                  <details className="group">
                    <summary className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80 transition-opacity select-none list-none">
                      <span className="group-open:hidden">
                        {isRtl ? "קראו את המאמר" : "Read article"} ↓
                      </span>
                      <span className="hidden group-open:inline">
                        {isRtl ? "סגירה" : "Close"} ↑
                      </span>
                    </summary>
                    <div className="mt-5 pt-5 border-t border-border/50 space-y-4">
                      {post.bodyText.split("\n\n").map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm text-foreground/80 leading-7"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </article>
          ))}

          {/* Static fallback posts */}
          {BLOG_POSTS.map((post, index) => {
            const copy = post[locale];
            return (
              <article
                key={post.id}
                id={post.id}
                className="card-elevated overflow-hidden scroll-mt-28"
              >
                {/* Gradient accent bar */}
                <div
                  className="h-1.5 w-full"
                  style={{ background: post.accentGradient }}
                />

                {/* Illustration area — real image or gradient fallback */}
                {post.imagePath ? (
                  <div className="relative w-full" style={{ height: 160 }}>
                    <Image
                      src={post.imagePath}
                      alt={copy.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                    />
                    <span
                      className="absolute bottom-3 text-[10px] font-bold tracking-widest opacity-40 uppercase"
                      style={{ [isRtl ? "right" : "left"]: "1rem" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      height: 120,
                      background: post.illustrationGradient,
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.6) 0%, transparent 60%)",
                      }}
                    />
                    <span
                      className="relative z-10 select-none"
                      style={{ fontSize: 64, lineHeight: 1 }}
                      aria-hidden="true"
                    >
                      {post.icon}
                    </span>
                    <span
                      className="absolute bottom-3 text-[10px] font-bold tracking-widest opacity-40 uppercase"
                      style={{ [isRtl ? "right" : "left"]: "1rem" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <div className="p-6 md:p-8">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}
                    >
                      {copy.category}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {copy.readTime} {readLabel}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug">
                    {copy.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    {copy.excerpt}
                  </p>

                  {/* Expandable content */}
                  <details className="group">
                    <summary className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80 transition-opacity select-none list-none">
                      <span className="group-open:hidden flex items-center gap-1.5">
                        {expandLabel}
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                      <span className="hidden group-open:flex items-center gap-1.5">
                        {collapseLabel}
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </span>
                    </summary>

                    <div className="mt-5 pt-5 border-t border-border/50 space-y-4">
                      {copy.content.map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm text-foreground/80 leading-7"
                        >
                          {paragraph}
                        </p>
                      ))}

                      {/* Inline CTA */}
                      <div className="mt-6 pt-4 border-t border-border/30 flex items-center gap-3 text-xs text-muted">
                        <span>{enjoyLabel}</span>
                        <Link
                          href="/login"
                          className="font-semibold text-primary hover:underline"
                        >
                          {copy.ctaText}
                        </Link>
                      </div>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>

        {/* Blog notification subscription */}
        <BlogSubscribe isRtl={isRtl} />

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
              {ctaHeadline}
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">{ctaBody}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-primary font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {startFreeLabel}
              </Link>
              <a
                href="https://github.com/eladjak/bayit-beseder"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#24292f] dark:bg-white text-white dark:text-[#24292f] font-semibold text-sm border border-white/20 hover:opacity-90 active:scale-95 transition-all"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Star on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-muted space-y-3">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="hover:text-primary transition-colors">
              {footerLinks.home}
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-primary transition-colors"
            >
              {footerLinks.dashboard}
            </Link>
            <Link
              href="/contact"
              className="hover:text-primary transition-colors"
            >
              {footerLinks.contact}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              {footerLinks.privacy}
            </Link>
          </div>
          <p className="text-muted/60">{copyright}</p>
        </footer>
      </main>
    </div>
  );
}

// ============================================
// Blog subscription component
// ============================================
function BlogSubscribe({ isRtl }: { isRtl: boolean }) {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Store subscription locally (future: send to Sanity/API)
    const subs = JSON.parse(localStorage.getItem("bayit-blog-subscribers") ?? "[]") as string[];
    if (!subs.includes(email)) {
      subs.push(email);
      localStorage.setItem("bayit-blog-subscribers", JSON.stringify(subs));
    }
    setSubscribed(true);
  };

  if (subscribed) {
    return (
      <section className="mt-12 card-elevated p-8 text-center">
        <div className="text-4xl mb-3">{"🎉"}</div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {isRtl ? "נרשמתם בהצלחה!" : "You're subscribed!"}
        </h3>
        <p className="text-sm text-muted">
          {isRtl
            ? "נעדכן אתכם כשיהיה תוכן חדש. הבית מודה לכם."
            : "We'll let you know when new content drops. Your house thanks you."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12 card-elevated p-8">
      <div className="text-center mb-6">
        <div className="text-3xl mb-2">{"📬"}</div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {isRtl ? "רוצים לדעת כשיש מאמר חדש?" : "Want to know when new articles drop?"}
        </h3>
        <p className="text-sm text-muted">
          {isRtl
            ? "נשלח לכם עדכון פעם בשבוע-שבועיים. בלי ספאם, מבטיחים (הבית שלנו מסודר מדי בשביל ספאם)."
            : "We'll send updates every 1-2 weeks. No spam, we promise (our house is too tidy for spam)."}
        </p>
      </div>
      <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isRtl ? "הכניסו אימייל" : "Enter your email"}
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          dir="ltr"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
        >
          {isRtl ? "הרשמה" : "Subscribe"}
        </button>
      </form>
    </section>
  );
}
