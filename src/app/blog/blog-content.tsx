"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageToggle } from "@/components/language-toggle";
import type { SanityPost } from "@/lib/sanity/client";

// ============================================
// Rich content block types
// ============================================
type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "bold-point"; label: string; text: string }
  | { type: "highlight"; text: string }
  | { type: "pull-quote"; text: string; attribution?: string }
  | { type: "callout"; icon: string; title: string; text: string; color: "blue" | "green" | "amber" | "purple" | "rose" | "indigo" }
  | { type: "stat"; value: string; label: string }
  | { type: "tip-list"; items: string[] };

interface ArticleCTA {
  text: string;
  href: string;
  /** CSS gradient from-color (hex) */
  from: string;
  /** CSS gradient to-color (hex) */
  to: string;
}

interface BlogPost {
  id: string;
  he: {
    title: string;
    excerpt: string;
    blocks: ContentBlock[];
    category: string;
    readTime: string;
    cta: ArticleCTA;
    relatedIds: string[];
  };
  en: {
    title: string;
    excerpt: string;
    blocks: ContentBlock[];
    category: string;
    readTime: string;
    cta: ArticleCTA;
    relatedIds: string[];
  };
  icon: string;
  categoryColor: string;
  illustrationGradient: string;
  accentGradient: string;
  imagePath?: string;
}

// ============================================
// Blog post data — rich content
// ============================================
const BLOG_POSTS: BlogPost[] = [
  {
    id: "weekly-planning",
    icon: "📋",
    categoryColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    illustrationGradient: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)",
    accentGradient: "linear-gradient(90deg, #3B82F6, #6366F1)",
    imagePath: "/images/blog/weekly-planning.png",
    he: {
      category: "תכנון",
      readTime: "3 דקות",
      title: "איך לתכנן שבוע של ניקיון ב-10 דקות",
      excerpt: "תכנון שבועי חוסך שעות של ויכוחים ומבטיח שהכל ייעשה. הנה השיטה שעובדת.",
      relatedIds: ["fair-division", "zones"],
      cta: {
        text: "צרו מערך שבועי עכשיו!",
        href: "/weekly",
        from: "#3B82F6",
        to: "#4F46E5",
      },
      blocks: [
        {
          type: "paragraph",
          text: "הטעות הנפוצה ביותר בניהול בית משותף היא לחכות ש\"מישהו יעשה את זה\". תכנון שבועי פותר את הבעיה הזו מהשורש — ולוקח פחות מ-10 דקות להכין.",
        },
        {
          type: "pull-quote",
          text: "\"בית מסודר לא נולד ממוטיבציה — הוא נולד ממערכת.\"",
        },
        {
          type: "heading",
          text: "3 שלבים לתכנון שבועי מושלם",
        },
        {
          type: "bold-point",
          label: "שלב 1: רשימת מאסטר",
          text: "רשמו את כל המשימות הקבועות בבית — ניקוי מטבח, שטיפת רצפות, כביסה, קניות, פינוי זבל, ניקוי שירותים. אל תשכחו דברים שנוטים \"להיעלם\" כמו ניקוי מקרר או החלפת מצעים.",
        },
        {
          type: "bold-point",
          label: "שלב 2: פיזור על פני השבוע",
          text: "במקום לנקות הכל ביום שישי, פזרו את המשימות על פני השבוע. יום ראשון: מטבח. יום שלישי: חדרי שינה. יום חמישי: סלון ושירותים. הבית תמיד נקי ואף יום לא כבד מדי.",
        },
        {
          type: "bold-point",
          label: "שלב 3: חלוקה לפי זמן",
          text: "חלקו לפי זמן — לא לפי כמות. שטיפת כלים לוקחת 15 דקות, אבל ניקוי אמבטיה לוקח 30. ודאו שכל אחד משקיע בערך אותו זמן שבועי.",
        },
        {
          type: "callout",
          icon: "💡",
          title: "טיפ: מצב אזורים",
          text: "באפליקציית \"בית בסדר\" אפשר להפעיל מצב אזורים — והאפליקציה מחלקת אוטומטית לפי חדרים וימים, כולל איזון בין בני הבית.",
          color: "blue",
        },
        {
          type: "stat",
          value: "73%",
          label: "מהמשתמשים שלנו מדווחים שהם מתווכחים פחות על ניקיון אחרי שהתחילו לתכנן שבועי",
        },
        {
          type: "highlight",
          text: "המפתח הוא עקביות — לא שלמות. תכנון בינוני שנעשה בפועל שווה יותר מתכנון מושלם על הנייר.",
        },
      ],
    },
    en: {
      category: "Planning",
      readTime: "3 min",
      title: "How to Plan a Week of Cleaning in 10 Minutes",
      excerpt: "A weekly plan saves hours of arguments and ensures everything gets done. Here's the method that works.",
      relatedIds: ["fair-division", "zones"],
      cta: {
        text: "Create your weekly plan now!",
        href: "/weekly",
        from: "#3B82F6",
        to: "#4F46E5",
      },
      blocks: [
        {
          type: "paragraph",
          text: "The most common mistake in shared home management is waiting for \"someone to do it\". Weekly planning solves this problem at the root — and takes less than 10 minutes to set up.",
        },
        {
          type: "pull-quote",
          text: "\"A tidy home isn't born from motivation — it's born from a system.\"",
        },
        {
          type: "heading",
          text: "3 Steps to a Perfect Weekly Plan",
        },
        {
          type: "bold-point",
          label: "Step 1: Master list",
          text: "Write down every recurring household task — kitchen cleaning, mopping, laundry, groceries, trash, bathrooms. Don't forget things that tend to disappear like fridge cleaning or changing bed sheets.",
        },
        {
          type: "bold-point",
          label: "Step 2: Spread across the week",
          text: "Instead of cleaning everything on Friday, distribute tasks throughout the week. Sunday: kitchen. Tuesday: bedrooms. Thursday: living room and bathrooms. The house stays clean and no single day is too heavy.",
        },
        {
          type: "bold-point",
          label: "Step 3: Divide by time",
          text: "Divide by time — not quantity. Washing dishes takes 15 minutes, but cleaning the bathroom takes 30. Make sure everyone invests roughly the same weekly time.",
        },
        {
          type: "callout",
          icon: "💡",
          title: "Tip: Zone mode",
          text: "In the BayitBeSeder app you can activate zone mode — and the app automatically divides tasks by rooms and days, including load balancing between household members.",
          color: "blue",
        },
        {
          type: "stat",
          value: "73%",
          label: "of our users report arguing less about cleaning after they started weekly planning",
        },
        {
          type: "highlight",
          text: "The key is consistency — not perfection. A mediocre plan that actually gets done is worth more than a perfect plan on paper.",
        },
      ],
    },
  },
  {
    id: "cleaning-hacks",
    icon: "✨",
    categoryColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    illustrationGradient: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%)",
    accentGradient: "linear-gradient(90deg, #10B981, #34D399)",
    imagePath: "/images/blog/cleaning-hacks.png",
    he: {
      category: "ניקיון",
      readTime: "4 דקות",
      title: "10 טריקים לניקוי שיחסכו לכם זמן",
      excerpt: "טריקים פשוטים שהופכים ניקוי ממשימה מעצבנת לדבר שנגמר מהר.",
      relatedIds: ["motivation", "quick-clean"],
      cta: {
        text: "הוסיפו משימות ניקיון לאפליקציה!",
        href: "/tasks",
        from: "#10B981",
        to: "#0D9488",
      },
      blocks: [
        {
          type: "paragraph",
          text: "הסוד לניקוי יעיל הוא לא לעבוד קשה יותר — אלא לעבוד חכם יותר. הטריקים הבאים נאספו מאנשים שמנהלים בית בצורה יעילה, ויחסכו לכם שעות בשבוע.",
        },
        {
          type: "heading",
          text: "10 טריקים שעובדים",
        },
        {
          type: "bold-point",
          label: "1. מגבות מיקרופייבר לחות",
          text: "מסירות 99% מהחיידקים בלי ספריי. פשוט מים. חוסכות כסף על חומרי ניקוי ובריאות יותר לאוויר הבית.",
        },
        {
          type: "bold-point",
          label: "2. חומץ + סודה לשתייה",
          text: "מנקים ומחטאים משטחי מטבח בצורה נהדרת, בלי כימיקלים קשים. מערבבים 1:1, מרססים, מחכים 5 דקות ומנגבים.",
        },
        {
          type: "highlight",
          text: "ניקוי 10 דקות ביום עדיף על ניקוי גדול אחת לשבוע — הבית תמיד נקי ואף יום לא מכריע.",
        },
        {
          type: "bold-point",
          label: "3. ריצת ניקיון",
          text: "כל בן בית לוקח 5 חפצים שלא במקומם ומחזיר אותם. 5 דקות, כל הבית מסודר. עושים את זה ביחד לפני ארוחת הערב.",
        },
        {
          type: "bold-point",
          label: "4. ג'ל אסלה לפני שינה",
          text: "5 דקות לפני השינה, למחרת האסלה זוהרת בלי שפשוף. עובד בזמן שישנים — הניקיון הכי יעיל שיש.",
        },
        {
          type: "bold-point",
          label: "5. ניקוי מלמעלה למטה",
          text: "תמיד תתחילו מהראי והמדפים, אחר כך הכיור, ולבסוף הרצפה. כך האבק נופל פעם אחת ואתם לא מנקים פעמיים.",
        },
        {
          type: "callout",
          icon: "🧪",
          title: "מדע הניקוי",
          text: "ספוגית במיקרוגל — 30 שניות מרטיבים ושמים במיקרו. הורגות 99.9% מהבקטריות. עושים את זה כל שלושה ימים.",
          color: "green",
        },
        {
          type: "bold-point",
          label: "6. נעליים ליד הדלת",
          text: "מדיניות \"בלי נעליים בבית\" מפחיתה כ-60% מהלכלוך שנכנס. זה ההשפעה הגדולה ביותר בהשקעה הכי קטנה.",
        },
        {
          type: "bold-point",
          label: "7. ריסוס מקלחת אחרי שימוש",
          text: "ספריי מונע אבנית אחרי כל מקלחת חוסך שעות של קרצוף. 10 שניות ביום = ניקוי מקלחת אחת לחודש.",
        },
        {
          type: "bold-point",
          label: "8. סל כביסה בכל חדר",
          text: "ככל שקל יותר לזרוק בגדים מלוכלכים לסל, ככה פחות הם מגיעים לרצפה. השקעה של 50 שקל, חוסכת עצבים אין ספור.",
        },
        {
          type: "tip-list",
          items: [
            "שמרו ספריי ניקוי בכל חדר — פחות מאמץ = יותר סיכוי שתשתמשו בו",
            "תייגו קופסאות אחסון — 2 דקות השקעה = 20 דקות חיסכון בחיפוש",
            "צינור ניקוי ורטיב = שילוב שמנקה כמעט הכל ללא שפשוף",
            "ניקוי בזמן בישול — נגבו משטחים בזמן שמחכים לסיר לרתוח",
          ],
        },
        {
          type: "stat",
          value: "4.5 שעות",
          label: "שבועיות בממוצע שמשפחה חוסכת בניקיון כשמיישמים לפחות 5 מהטריקים האלה",
        },
      ],
    },
    en: {
      category: "Cleaning",
      readTime: "4 min",
      title: "10 Cleaning Hacks That Will Save You Time",
      excerpt: "Simple tricks that turn cleaning from an annoying chore into something that gets done fast.",
      relatedIds: ["motivation", "quick-clean"],
      cta: {
        text: "Add cleaning tasks to the app!",
        href: "/tasks",
        from: "#10B981",
        to: "#0D9488",
      },
      blocks: [
        {
          type: "paragraph",
          text: "The secret to efficient cleaning isn't working harder — it's working smarter. These tricks are collected from people who manage their homes effectively, and will save you hours per week.",
        },
        {
          type: "heading",
          text: "10 Tricks That Work",
        },
        {
          type: "bold-point",
          label: "1. Damp microfiber cloths",
          text: "Remove 99% of bacteria without spray. Just water. Saves money on cleaning products and healthier for indoor air.",
        },
        {
          type: "bold-point",
          label: "2. Vinegar + baking soda",
          text: "Cleans and disinfects kitchen surfaces wonderfully, without harsh chemicals. Mix 1:1, spray, wait 5 minutes and wipe.",
        },
        {
          type: "highlight",
          text: "10 minutes of cleaning per day beats one big clean per week — the house stays clean and no day is overwhelming.",
        },
        {
          type: "bold-point",
          label: "3. Pickup run",
          text: "Each household member picks up 5 items that are out of place and returns them. 5 minutes, whole house tidy. Do it together before dinner.",
        },
        {
          type: "bold-point",
          label: "4. Toilet gel before bed",
          text: "5 minutes before sleep, by morning the toilet shines without scrubbing. Works while you sleep — the most efficient cleaning there is.",
        },
        {
          type: "bold-point",
          label: "5. Clean top to bottom",
          text: "Always start with mirrors and shelves, then the sink, then the floor. This way dust falls once and you don't clean twice.",
        },
        {
          type: "callout",
          icon: "🧪",
          title: "The science of cleaning",
          text: "Sponge in the microwave — wet it and microwave for 30 seconds. Kills 99.9% of bacteria. Do this every three days.",
          color: "green",
        },
        {
          type: "bold-point",
          label: "6. Shoes at the door",
          text: "A 'no shoes in the house' policy reduces about 60% of dirt coming in. This is the biggest impact for the smallest effort.",
        },
        {
          type: "bold-point",
          label: "7. Shower spray after each use",
          text: "An anti-limescale spray after every shower saves hours of scrubbing. 10 seconds per day = cleaning the shower once a month.",
        },
        {
          type: "bold-point",
          label: "8. Laundry basket in every room",
          text: "The easier it is to toss dirty clothes in the basket, the less they end up on the floor. A 15-dollar investment saves countless headaches.",
        },
        {
          type: "tip-list",
          items: [
            "Keep cleaning spray in every room — less effort = more likely you'll use it",
            "Label storage boxes — 2 minutes of investment = 20 minutes saved searching",
            "Wet and dry squeegee = combo that cleans almost anything without scrubbing",
            "Clean while cooking — wipe surfaces while waiting for the pot to boil",
          ],
        },
        {
          type: "stat",
          value: "4.5 hours",
          label: "per week on average that a household saves on cleaning when they implement at least 5 of these tricks",
        },
      ],
    },
  },
  {
    id: "fair-division",
    icon: "⚖️",
    categoryColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    illustrationGradient: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)",
    accentGradient: "linear-gradient(90deg, #8B5CF6, #A855F7)",
    imagePath: "/images/blog/fair-division.png",
    he: {
      category: "שיתוף פעולה",
      readTime: "3 דקות",
      title: "חלוקת משימות הוגנת — בלי ויכוחים",
      excerpt: "השיטה שמונעת את ה\"אני תמיד עושה הכל\" ושומרת על שלום בית.",
      relatedIds: ["weekly-planning", "motivation"],
      cta: {
        text: "ראו איך חולקים משימות בבית בסדר!",
        href: "/tasks",
        from: "#8B5CF6",
        to: "#7C3AED",
      },
      blocks: [
        {
          type: "paragraph",
          text: "הסיבה מספר 1 לוויכוחים על ניקיון היא תחושת חוסר הוגנות. לא מספיק שהמשימות מחולקות — צריך שזה ירגיש הוגן לכולם.",
        },
        {
          type: "pull-quote",
          text: "\"לא מה שנעשה חשוב — אלא מה שנראה שנעשה. שקיפות היא הבסיס של שלום בית.\"",
        },
        {
          type: "heading",
          text: "5 עקרונות לחלוקה שעובדת",
        },
        {
          type: "bold-point",
          label: "עקרון 1: לפי זמן, לא כמות",
          text: "שלוש משימות קלות לא שוות משימה אחת כבדה. מדדו לפי דקות, לא לפי פריטים. שטיפת כלים (15 דקות) = חצי ניקוי שירותים (30 דקות).",
        },
        {
          type: "callout",
          icon: "⚡",
          title: "הכלל הפשוט",
          text: "כל בן בית משקיע בין 45 ל-75 דקות בשבוע על ניקיון. זה הטווח שמרגיש הוגן לרוב האנשים.",
          color: "purple",
        },
        {
          type: "bold-point",
          label: "עקרון 2: גמישות מוסכמת",
          text: "לפעמים מישהו עסוק יותר. כלל הזהב: אם אחד עושה 60% השבוע, השני עושה 60% בשבוע הבא. שמרו על זה כהסכמה מפורשת, לא ציפייה.",
        },
        {
          type: "bold-point",
          label: "עקרון 3: שקיפות מלאה",
          text: "כשהכל רשום ומתועד, אין מקום לוויכוחים על \"מי עשה מה\". אפליקציה עם היסטוריה ברורה מחסלת 90% מהטיעונים.",
        },
        {
          type: "bold-point",
          label: "עקרון 4: העדפות אישיות",
          text: "יש לכם העדפות? מישהו שונא לנקות שירותים אבל לא מפריע לו לשטוף כלים? תתאימו. משימה שתואמת להעדפות נעשית בשמחה.",
        },
        {
          type: "highlight",
          text: "מחקרים מראים: זוגות שחולקים משימות בית בשוויון מדווחים על רמת שביעות רצון גבוהה יותר מהקשר — לא רק מהבית.",
        },
        {
          type: "bold-point",
          label: "עקרון 5: חגיגה שבועית",
          text: "סיימתם שבוע מוצלח? חגגו! ארוחה טובה, סרט, או פשוט \"כל הכבוד לנו\". חיזוק חיובי הוא הדלק שמניע עקביות.",
        },
        {
          type: "stat",
          value: "68%",
          label: "מהויכוחים על \"מי עושה יותר\" נפתרים כאשר יש מערכת תיעוד משותפת",
        },
      ],
    },
    en: {
      category: "Collaboration",
      readTime: "3 min",
      title: "Fair Task Division — Without Arguments",
      excerpt: "The method that prevents \"I always do everything\" and keeps the peace at home.",
      relatedIds: ["weekly-planning", "motivation"],
      cta: {
        text: "See how tasks are divided in BayitBeSeder!",
        href: "/tasks",
        from: "#8B5CF6",
        to: "#7C3AED",
      },
      blocks: [
        {
          type: "paragraph",
          text: "The number one reason for cleaning arguments is a feeling of unfairness. It's not enough that tasks are divided — it needs to feel fair to everyone.",
        },
        {
          type: "pull-quote",
          text: "\"It's not what gets done that matters — it's what appears to get done. Transparency is the foundation of household peace.\"",
        },
        {
          type: "heading",
          text: "5 Principles for a Division That Works",
        },
        {
          type: "bold-point",
          label: "Principle 1: By time, not quantity",
          text: "Three easy tasks don't equal one heavy task. Measure in minutes, not items. Washing dishes (15 min) = half of bathroom cleaning (30 min).",
        },
        {
          type: "callout",
          icon: "⚡",
          title: "The simple rule",
          text: "Each household member invests between 45 and 75 minutes per week on cleaning. That's the range most people feel is fair.",
          color: "purple",
        },
        {
          type: "bold-point",
          label: "Principle 2: Agreed flexibility",
          text: "Sometimes someone is busier. The golden rule: if one person does 60% this week, the other does 60% next week. Keep this as an explicit agreement, not an expectation.",
        },
        {
          type: "bold-point",
          label: "Principle 3: Full transparency",
          text: "When everything is written and documented, there's no room for arguments about who did what. An app with clear history eliminates 90% of arguments.",
        },
        {
          type: "bold-point",
          label: "Principle 4: Personal preferences",
          text: "Have preferences? Someone who hates cleaning bathrooms but doesn't mind washing dishes? Adapt. A task that matches preferences gets done happily.",
        },
        {
          type: "highlight",
          text: "Research shows: couples who share household tasks equally report higher satisfaction with their relationship — not just their home.",
        },
        {
          type: "bold-point",
          label: "Principle 5: Weekly celebration",
          text: "Finished a successful week? Celebrate! A nice meal, a movie, or just \"well done us\". Positive reinforcement is the fuel that drives consistency.",
        },
        {
          type: "stat",
          value: "68%",
          label: "of arguments about \"who does more\" are resolved when there is a shared documentation system",
        },
      ],
    },
  },
  {
    id: "motivation",
    icon: "💪",
    categoryColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    illustrationGradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
    accentGradient: "linear-gradient(90deg, #F59E0B, #F97316)",
    imagePath: "/images/blog/motivation.png",
    he: {
      category: "מוטיבציה",
      readTime: "3 דקות",
      title: "איך לשמור על מוטיבציה לניקיון",
      excerpt: "הסוד הוא לא לאהוב לנקות — הסוד הוא לבנות הרגלים שעובדים גם בימים עייפים.",
      relatedIds: ["cleaning-hacks", "fair-division"],
      cta: {
        text: "גלו את מערכת ההישגים שלנו!",
        href: "/tasks",
        from: "#F59E0B",
        to: "#EA580C",
      },
      blocks: [
        {
          type: "paragraph",
          text: "בוא נהיה כנים: אף אחד לא באמת אוהב לנקות. אבל כולם אוהבים בית נקי. הטריק הוא לגשר על הפער — ולהפוך את הניקיון להרגל שפשוט קורה, בלי קרב פנימי.",
        },
        {
          type: "pull-quote",
          text: "\"לא צריך להרגיש בא לי — צריך רק לסדר את הסביבה שהמוח שלי לא יצטרך לקבל החלטות.\"",
          attribution: "מבוסס על עקרונות של ג'יימס קליר, Atomic Habits",
        },
        {
          type: "heading",
          text: "5 הרגלים שמנצחים את העייפות",
        },
        {
          type: "bold-point",
          label: "הרגל 1: כלל ה-2 דקות",
          text: "אם משימה לוקחת פחות מ-2 דקות — עשו אותה עכשיו. לא \"מיד\", לא \"אחר כך\". עכשיו. נגבתם כיור? ניגבו גם את הברז. עלה על הריצפה? הרימו.",
        },
        {
          type: "callout",
          icon: "🎵",
          title: "הפלייליסט של הניקיון",
          text: "האזינו למשהו שאתם אוהבים — פודקאסט, אלבום חדש, אפיזודת אודיו — אך ורק בזמן ניקיון. ככה הניקיון הופך ל\"זמן שלי\" שמחכים לו.",
          color: "amber",
        },
        {
          type: "bold-point",
          label: "הרגל 2: טיימר של 10 דקות",
          text: "אין מוטיבציה? אמרו לעצמכם \"רק 10 דקות\". ברוב המקרים תמשיכו — כי כבר התחלתם. העיכוב הוא תמיד הגרוע מכל, לא הניקיון עצמו.",
        },
        {
          type: "highlight",
          text: "מחקרים על יצירת הרגלים מראים: לוקח בממוצע 66 ימים ליצור הרגל חדש — לא 21. תהיו סבלניים עם עצמכם.",
        },
        {
          type: "bold-point",
          label: "הרגל 3: גמיפיקציה",
          text: "נקודות, רצפים, הישגים — אלה לא רק לילדים. מוח האדם מגיב לתגמולים, ומערכת גמיפיקציה טובה הופכת ניקיון לחוויה מספקת.",
        },
        {
          type: "bold-point",
          label: "הרגל 4: לנקות לפני, לא אחרי",
          text: "5 דקות של תחזוקה יומית קלות יותר משעה של \"משבר ניקיון\". הכלל: אחרי שימוש, שאירו מקום נקי ממנו מצאתם. לא יותר — רק אותו דבר.",
        },
        {
          type: "bold-point",
          label: "הרגל 5: שקיפות עצמית",
          text: "ראו את ההתקדמות שלכם. רצף של 7 ימים שבוצעו? רוצים לשמור עליו. זה אפקט \"אל תשברו את השרשרת\" — ועובד.",
        },
        {
          type: "stat",
          value: "21 יום",
          label: "הוא המיתוס — האמת היא שהרגל חדש נוצר בין 18 ל-254 יום. תמיד שווה להמשיך",
        },
      ],
    },
    en: {
      category: "Motivation",
      readTime: "3 min",
      title: "How to Stay Motivated to Clean",
      excerpt: "The secret isn't loving to clean — the secret is building habits that work even on tired days.",
      relatedIds: ["cleaning-hacks", "fair-division"],
      cta: {
        text: "Discover our achievement system!",
        href: "/tasks",
        from: "#F59E0B",
        to: "#EA580C",
      },
      blocks: [
        {
          type: "paragraph",
          text: "Let's be honest: nobody really loves cleaning. But everyone loves a clean home. The trick is bridging that gap — turning cleaning into a habit that just happens, without an internal battle.",
        },
        {
          type: "pull-quote",
          text: "\"You don't need to feel like it — you just need to arrange your environment so your brain doesn't need to make decisions.\"",
          attribution: "Based on principles from James Clear, Atomic Habits",
        },
        {
          type: "heading",
          text: "5 Habits That Defeat Tiredness",
        },
        {
          type: "bold-point",
          label: "Habit 1: The 2-minute rule",
          text: "If a task takes less than 2 minutes — do it now. Not \"soon\", not \"later\". Now. Wiped the sink? Wipe the faucet too. Something fell on the floor? Pick it up.",
        },
        {
          type: "callout",
          icon: "🎵",
          title: "The cleaning playlist",
          text: "Listen to something you love — a podcast, new album, audio episode — only while cleaning. This turns cleaning into \"my time\" that you look forward to.",
          color: "amber",
        },
        {
          type: "bold-point",
          label: "Habit 2: 10-minute timer",
          text: "No motivation? Tell yourself \"just 10 minutes\". Most of the time you'll continue — because you've already started. The delay is always the worst part, not the cleaning itself.",
        },
        {
          type: "highlight",
          text: "Research on habit formation shows: it takes an average of 66 days to form a new habit — not 21. Be patient with yourself.",
        },
        {
          type: "bold-point",
          label: "Habit 3: Gamification",
          text: "Points, streaks, achievements — not just for kids. The human brain responds to rewards, and a good gamification system turns cleaning into a satisfying experience.",
        },
        {
          type: "bold-point",
          label: "Habit 4: Clean before, not after",
          text: "5 minutes of daily maintenance is easier than an hour of \"cleaning crisis\". The rule: after using a space, leave it at least as clean as you found it. Not more — just the same.",
        },
        {
          type: "bold-point",
          label: "Habit 5: Self-transparency",
          text: "See your own progress. A 7-day streak you've completed? You want to keep it going. That's the \"don't break the chain\" effect — and it works.",
        },
        {
          type: "stat",
          value: "21 days",
          label: "is the myth — the truth is a new habit forms between 18 and 254 days. It's always worth continuing",
        },
      ],
    },
  },
  {
    id: "zones",
    icon: "🏠",
    categoryColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    illustrationGradient: "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)",
    accentGradient: "linear-gradient(90deg, #6366F1, #8B5CF6)",
    imagePath: "/images/blog/zones.png",
    he: {
      category: "שיטות",
      readTime: "3 דקות",
      title: "שיטת האזורים: לנקות חכם, לא קשה",
      excerpt: "במקום לחשוב על משימות בודדות, חשבו על אזורים. יום ראשון = מטבח, יום שלישי = סלון.",
      relatedIds: ["weekly-planning", "motivation"],
      cta: {
        text: "הפעילו מצב אזורים בהגדרות!",
        href: "/settings",
        from: "#6366F1",
        to: "#7C3AED",
      },
      blocks: [
        {
          type: "paragraph",
          text: "שיטת האזורים היא אחת השיטות הכי פופולריות לניהול בית, ולסיבה טובה — היא פשוטה, ויזואלית, ועובדת גם כשאין מוטיבציה.",
        },
        {
          type: "subheading",
          text: "מה זה אזורים?",
        },
        {
          type: "paragraph",
          text: "במקום רשימת משימות ארוכה ומעייפת, מחלקים את הבית לאזורים גיאוגרפיים. כל יום מתרכזים באזור אחד — ורק בו. זה יוצר בהירות מנטלית: אתם יודעים בדיוק מה המטרה ואין בלבול של \"מה עכשיו\".",
        },
        {
          type: "callout",
          icon: "🗓️",
          title: "דוגמה לשבוע אזורים",
          text: "ראשון — מטבח ופינת אוכל | שני — כביסה וארונות | שלישי — חדרי שינה | רביעי — סלון ומרפסת | חמישי — שירותים ואמבטיה | שישי — קניות ומלאי",
          color: "indigo",
        },
        {
          type: "heading",
          text: "למה שיטת האזורים עובדת?",
        },
        {
          type: "bold-point",
          label: "פחות החלטות = יותר אנרגיה",
          text: "כשאתם יודעים שהיום \"יום מטבח\", אין צורך לחשוב. פשוט פותחים את האפליקציה, רואים מה יש בתור ועושים. ה\"עייפות מהחלטות\" היא סיבה מרכזית לדחיינות בניקיון.",
        },
        {
          type: "bold-point",
          label: "תמיד יש חדר נקי",
          text: "עם שיטת האזורים, הבית לא כולו מלוכלך ולא כולו נקי — תמיד יש אזורים שסיימתם והם במצב טוב. זה מרגיש טוב יותר.",
        },
        {
          type: "highlight",
          text: "אפשר לדלג על אזור בלי לאבד את המסלול — פשוט מוסיפים אותו לשבוע הבא. שיטת האזורים ידידותית לימים עייפים.",
        },
        {
          type: "bold-point",
          label: "קל לחלק בין בני הבית",
          text: "\"את לוקחת מטבח ואני לוקח סלון\" — חלוקה פשוטה, ברורה, ומינימום ויכוחים. כל אחד אחראי על אזור שלם, לא על משימות פזורות.",
        },
        {
          type: "stat",
          value: "40%",
          label: "פחות זמן מבוזבז בתכנון ניקיון כאשר משתמשים בשיטת האזורים לפי מחקרים על פרודוקטיביות ביתית",
        },
        {
          type: "paragraph",
          text: "ב\"בית בסדר\" אפשר להפעיל מצב אזורים בהגדרות, והמערכת מחלקת את המשימות אוטומטית לפי אזורים וימים — כולל איזון עומסים בין בני הבית.",
        },
      ],
    },
    en: {
      category: "Methods",
      readTime: "3 min",
      title: "The Zone Method: Clean Smart, Not Hard",
      excerpt: "Instead of thinking about individual tasks, think about zones. Sunday = kitchen, Tuesday = living room.",
      relatedIds: ["weekly-planning", "motivation"],
      cta: {
        text: "Activate zone mode in settings!",
        href: "/settings",
        from: "#6366F1",
        to: "#7C3AED",
      },
      blocks: [
        {
          type: "paragraph",
          text: "The zone method is one of the most popular home management methods, and for good reason — it's simple, visual, and works even without motivation.",
        },
        {
          type: "subheading",
          text: "What are zones?",
        },
        {
          type: "paragraph",
          text: "Instead of a long, tiring task list, you divide the home into geographical zones. Each day you focus on one zone — and only that one. This creates mental clarity: you know exactly what the goal is and there's no confusion about what's next.",
        },
        {
          type: "callout",
          icon: "🗓️",
          title: "Sample zone week",
          text: "Sunday — kitchen & dining | Monday — laundry & closets | Tuesday — bedrooms | Wednesday — living room & balcony | Thursday — bathrooms | Friday — groceries & inventory",
          color: "indigo",
        },
        {
          type: "heading",
          text: "Why does the zone method work?",
        },
        {
          type: "bold-point",
          label: "Fewer decisions = more energy",
          text: "When you know today is \"kitchen day\", there's no need to think. Just open the app, see what's up and do it. \"Decision fatigue\" is a key reason for cleaning procrastination.",
        },
        {
          type: "bold-point",
          label: "There's always a clean room",
          text: "With the zone method, the house isn't all dirty or all clean — there are always zones you've finished that are in good shape. That feels better.",
        },
        {
          type: "highlight",
          text: "You can skip a zone without losing track — just add it to next week. The zone method is friendly to tired days.",
        },
        {
          type: "bold-point",
          label: "Easy to divide between household members",
          text: "\"You take the kitchen, I'll take the living room\" — simple, clear division, minimal arguments. Everyone is responsible for a whole zone, not scattered tasks.",
        },
        {
          type: "stat",
          value: "40%",
          label: "less time wasted on cleaning planning when using the zone method, according to home productivity research",
        },
        {
          type: "paragraph",
          text: "In BayitBeSeder you can activate zone mode in settings, and the system automatically distributes tasks by zones and days — including load balancing between household members.",
        },
      ],
    },
  },
  {
    id: "quick-clean",
    icon: "⏱️",
    categoryColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    illustrationGradient: "linear-gradient(135deg, #FFE4E6 0%, #FECDD3 50%, #FDA4AF 100%)",
    accentGradient: "linear-gradient(90deg, #F43F5E, #EC4899)",
    imagePath: "/images/blog/quick-clean.png",
    he: {
      category: "טיפים מהירים",
      readTime: "2 דקות",
      title: "ניקוי מהיר לפני אורחים — 15 דקות",
      excerpt: "אורחים בדרך? הנה מה לעשות ב-15 דקות כדי שהבית ייראה מושלם.",
      relatedIds: ["cleaning-hacks", "motivation"],
      cta: {
        text: "הוסיפו מוד \"לפני אורחים\" לרשימה!",
        href: "/tasks",
        from: "#F43F5E",
        to: "#DB2777",
      },
      blocks: [
        {
          type: "paragraph",
          text: "פאניקה! מישהו הודיע שהוא בדרך ויגיע עוד 15 דקות. נשמו עמוק — יש תוכנית, והיא עובדת.",
        },
        {
          type: "callout",
          icon: "🚨",
          title: "לפני שמתחילים",
          text: "סגרו דלתות חדרים שלא יראו. מרכזים את כל המאמץ על הסלון, המטבח ושירותי האורחים. זה 80% ממה שאורחים רואים.",
          color: "rose",
        },
        {
          type: "heading",
          text: "15 דקות, בדיוק",
        },
        {
          type: "bold-point",
          label: "דקות 1-3: ריצת איסוף",
          text: "תעברו על הסלון והמטבח ותאספו כל מה שלא במקומו — בגדים, כלים, צעצועים. זיקו לסל אחד ותסתירו אותו בחדר שינה.",
        },
        {
          type: "bold-point",
          label: "דקות 4-6: משטחי מטבח",
          text: "נגבו את המשטחים, שימו כלים מלוכלכים במדיח (או בסיר עם מכסה). כיור נקי + משטח נקי = מטבח שנראה מרשים.",
        },
        {
          type: "bold-point",
          label: "דקות 7-9: שירותי אורחים",
          text: "נגבו כיור ומראה, תוודאו שיש נייר וסבון, תלו מגבת נקייה. הנגבה הכי חשובה: המראה — זה מה שאנשים מביטים בו.",
        },
        {
          type: "bold-point",
          label: "דקות 10-12: סלון",
          text: "יישרו כריות, קפלו שמיכות, נגבו שולחן קפה. אם יש שולחן אוכל — הרחיקו ממנו כל חפצים.",
        },
        {
          type: "bold-point",
          label: "דקות 13-15: ריח ואווירה",
          text: "פתחו חלון 2 דקות לאוורור, הדליקו נר ריחני, תאורה חמה ולא ניאון. מוזיקה ברקע. ריח ותאורה הם 50% מהרושם.",
        },
        {
          type: "pull-quote",
          text: "\"אורחים שמים לב לריח, לתאורה ולמשטחים. לא לארונות.\"",
        },
        {
          type: "highlight",
          text: "הסוד הגדול: אם הסלון ושירותי האורחים נראים טוב — הרושם הכולל יהיה טוב. שאר הבית יכול לחכות.",
        },
        {
          type: "tip-list",
          items: [
            "נרות ריחניים ליד הכניסה יוצרים רושם ראשוני נהדר",
            "פרחים טריים על שולחן = 10 שקל שנראים כמו 100",
            "ספריי לרענון אוויר 30 שניות לפני שהם נכנסים",
            "דאגו לשתייה קרה מוכנה — זה מה שכולם מחפשים ראשון",
          ],
        },
      ],
    },
    en: {
      category: "Quick Tips",
      readTime: "2 min",
      title: "Quick Clean Before Guests — 15 Minutes",
      excerpt: "Guests on the way? Here's what to do in 15 minutes to make your home look perfect.",
      relatedIds: ["cleaning-hacks", "motivation"],
      cta: {
        text: "Add a \"before guests\" mode to your tasks!",
        href: "/tasks",
        from: "#F43F5E",
        to: "#DB2777",
      },
      blocks: [
        {
          type: "paragraph",
          text: "Panic! Someone announced they're on the way and will arrive in 15 minutes. Take a deep breath — there's a plan, and it works.",
        },
        {
          type: "callout",
          icon: "🚨",
          title: "Before you start",
          text: "Close doors to rooms they won't see. Focus all effort on the living room, kitchen and guest bathroom. That's 80% of what guests see.",
          color: "rose",
        },
        {
          type: "heading",
          text: "15 Minutes, Exactly",
        },
        {
          type: "bold-point",
          label: "Minutes 1-3: Pickup run",
          text: "Go through the living room and kitchen and collect everything out of place — clothes, dishes, toys. Toss it all in one basket and hide it in the bedroom.",
        },
        {
          type: "bold-point",
          label: "Minutes 4-6: Kitchen surfaces",
          text: "Wipe down surfaces, put dirty dishes in the dishwasher (or in a pot with a lid). Clean sink + clean surface = an impressive-looking kitchen.",
        },
        {
          type: "bold-point",
          label: "Minutes 7-9: Guest bathroom",
          text: "Wipe sink and mirror, make sure there's paper and soap, hang a clean towel. The most important wipe: the mirror — that's what people look at.",
        },
        {
          type: "bold-point",
          label: "Minutes 10-12: Living room",
          text: "Straighten cushions, fold blankets, wipe the coffee table. If there's a dining table — clear everything off it.",
        },
        {
          type: "bold-point",
          label: "Minutes 13-15: Scent and ambiance",
          text: "Open a window for 2 minutes to air out, light a scented candle, warm lighting not harsh fluorescents. Background music. Scent and lighting are 50% of the impression.",
        },
        {
          type: "pull-quote",
          text: "\"Guests notice smell, lighting and surfaces. Not cabinets.\"",
        },
        {
          type: "highlight",
          text: "The big secret: if the living room and guest bathroom look good — the overall impression will be good. The rest of the house can wait.",
        },
        {
          type: "tip-list",
          items: [
            "Scented candles by the entrance create a great first impression",
            "Fresh flowers on the table = small investment that looks expensive",
            "Air freshener spray 30 seconds before they come in",
            "Have cold drinks ready — that's what everyone looks for first",
          ],
        },
      ],
    },
  },
];

// ============================================
// Callout color map
// ============================================
const CALLOUT_COLORS: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-500",
    title: "text-blue-700 dark:text-blue-300",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-500",
    title: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-500",
    title: "text-amber-700 dark:text-amber-300",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    icon: "text-purple-500",
    title: "text-purple-700 dark:text-purple-300",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    icon: "text-rose-500",
    title: "text-rose-700 dark:text-rose-300",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
    icon: "text-indigo-500",
    title: "text-indigo-700 dark:text-indigo-300",
  },
};

// ============================================
// RichContent renderer
// ============================================
function RichContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i} className="text-sm text-foreground/80 leading-7">
                {block.text}
              </p>
            );

          case "heading":
            return (
              <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-1 flex items-center gap-2">
                <span
                  className="inline-block w-1 h-5 rounded-full flex-shrink-0"
                  style={{ background: "linear-gradient(180deg, #6366F1, #8B5CF6)" }}
                  aria-hidden="true"
                />
                {block.text}
              </h3>
            );

          case "subheading":
            return (
              <h4 key={i} className="text-sm font-semibold text-foreground/90 mt-4 mb-0.5 uppercase tracking-wide">
                {block.text}
              </h4>
            );

          case "bold-point":
            return (
              <div key={i} className="flex gap-3">
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-1"
                  style={{ background: "linear-gradient(180deg, #6366F1 0%, transparent 100%)", minHeight: "2.5rem" }}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-sm leading-7 text-foreground/80">
                    <strong className="font-semibold text-foreground">{block.label}</strong>
                    {" — "}
                    {block.text}
                  </p>
                </div>
              </div>
            );

          case "highlight":
            return (
              <div
                key={i}
                className="px-4 py-3 rounded-xl text-sm leading-6 font-medium"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))",
                  borderRight: "3px solid #6366F1",
                }}
              >
                {block.text}
              </div>
            );

          case "pull-quote":
            return (
              <blockquote
                key={i}
                className="relative my-6 px-5 py-4 rounded-2xl bg-surface border border-border/50"
              >
                <span
                  className="absolute top-2 right-3 text-4xl leading-none text-primary/20 select-none font-serif"
                  aria-hidden="true"
                >
                  ״
                </span>
                <p className="text-base font-semibold text-foreground/90 leading-relaxed italic pe-6">
                  {block.text}
                </p>
                {block.attribution && (
                  <cite className="mt-2 block text-xs text-muted not-italic">
                    — {block.attribution}
                  </cite>
                )}
              </blockquote>
            );

          case "callout": {
            const colors = CALLOUT_COLORS[block.color] ?? CALLOUT_COLORS.blue;
            return (
              <div
                key={i}
                className={`flex gap-3 p-4 rounded-xl border ${colors.bg} ${colors.border}`}
              >
                <span className={`text-xl flex-shrink-0 ${colors.icon}`} aria-hidden="true">
                  {block.icon}
                </span>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${colors.title}`}>
                    {block.title}
                  </p>
                  <p className="text-sm text-foreground/80 leading-6">{block.text}</p>
                </div>
              </div>
            );
          }

          case "stat":
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border/50"
              >
                <div
                  className="text-2xl font-extrabold text-transparent bg-clip-text flex-shrink-0"
                  style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
                >
                  {block.value}
                </div>
                <p className="text-xs text-muted leading-5">{block.label}</p>
              </div>
            );

          case "tip-list":
            return (
              <ul key={i} className="space-y-2">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground/80 leading-6">
                    <span className="text-primary mt-0.5 flex-shrink-0" aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ============================================
// Article CTA banner
// ============================================
function ArticleCTABanner({
  cta,
  isRtl,
}: {
  cta: ArticleCTA;
  isRtl: boolean;
}) {
  const gradientStyle = {
    background: `linear-gradient(135deg, ${cta.from} 0%, ${cta.to} 100%)`,
  };
  const buttonTextStyle = {
    backgroundImage: `linear-gradient(135deg, ${cta.from} 0%, ${cta.to} 100%)`,
  };

  return (
    <div
      className="mt-7 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-lg"
      style={gradientStyle}
    >
      <div className="flex-1 text-center sm:text-start">
        <p className="text-white/80 text-xs mb-0.5">
          {isRtl ? "מוכנים לנסות?" : "Ready to try it?"}
        </p>
        <p className="text-white font-bold text-sm leading-snug">{cta.text}</p>
      </div>
      <Link
        href={cta.href}
        className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white font-bold text-sm shadow hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all"
      >
        <span
          className="bg-clip-text text-transparent font-extrabold"
          style={buttonTextStyle}
        >
          {isRtl ? "לחצו כאן" : "Go now"}
        </span>
      </Link>
    </div>
  );
}

// ============================================
// Related articles strip
// ============================================
function RelatedArticles({
  currentId,
  relatedIds,
  locale,
  isRtl,
}: {
  currentId: string;
  relatedIds: string[];
  locale: "he" | "en";
  isRtl: boolean;
}) {
  const related = BLOG_POSTS.filter((p) => relatedIds.includes(p.id) && p.id !== currentId);
  if (related.length === 0) return null;

  return (
    <div className="mt-7 pt-5 border-t border-border/30">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-3">
        {isRtl ? "מאמרים קשורים" : "Related articles"}
      </p>
      <div className="flex flex-col gap-2">
        {related.map((post) => {
          const copy = post[locale];
          return (
            <a
              key={post.id}
              href={`#${post.id}`}
              className="group flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">{post.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {copy.title}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{copy.readTime} {isRtl ? "קריאה" : "read"}</p>
              </div>
              <span className="text-muted group-hover:text-primary transition-colors text-sm" aria-hidden="true">
                {isRtl ? "←" : "→"}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Main component
// ============================================
interface BlogContentProps {
  sanityPosts?: SanityPost[];
}

export function BlogContent({ sanityPosts = [] }: BlogContentProps) {
  const { locale } = useTranslation();
  const isRtl = locale === "he";
  const dir = isRtl ? "rtl" : "ltr";
  const lang = isRtl ? "he" : "en";

  const dynamicPosts = sanityPosts.filter(
    (p) => p.language === locale || p.language === lang
  );

  const totalCount = dynamicPosts.length + BLOG_POSTS.length;

  const heroTitle = isRtl ? "טיפים לניהול הבית" : "Home Management Tips";
  const heroSubtitle = isRtl
    ? "מדריכים, שיטות ורעיונות שיעזרו לכם לנהל את הבית ביחד — בלי ויכוחים, בלי עומס"
    : "Guides, methods and ideas to help you manage your home together — without arguments, without overload";
  const backLabel = isRtl ? "← חזרה לדף הבית" : "← Back to home";
  const articleCountLabel = isRtl ? `${totalCount} מאמרים` : `${totalCount} articles`;
  const expandLabel = isRtl ? "קראו את המאמר" : "Read article";
  const collapseLabel = isRtl ? "סגירה" : "Close";
  const ctaHeadline = isRtl ? "מוכנים לנהל את הבית בצורה חכמה?" : "Ready to manage your home smarter?";
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
  const readLabel = isRtl ? "קריאה" : "read";

  const categories = [...new Set(BLOG_POSTS.map((p) => p[locale].category))];

  return (
    <div dir={dir} lang={lang} className="min-h-dvh bg-background">
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
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #D946EF 70%, #EC4899 100%)",
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
              <div
                className="h-1.5 w-full"
                style={{ background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }}
              />

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
                    ✍️
                  </span>
                </div>
              )}

              <div className="p-6 md:p-8">
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
                      {new Date(post.publishedAt).toLocaleDateString(isRtl ? "he-IL" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-white bg-primary rounded-full px-2 py-0.5">
                    {isRtl ? "חדש" : "New"}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="text-sm text-muted leading-relaxed mb-5">{post.excerpt}</p>
                )}

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
                        <p key={i} className="text-sm text-foreground/80 leading-7">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </article>
          ))}

          {/* Static posts — rich content */}
          {BLOG_POSTS.map((post, index) => {
            const copy = post[locale];
            return (
              <article
                key={post.id}
                id={post.id}
                className="card-elevated overflow-hidden scroll-mt-28"
              >
                {/* Gradient accent bar */}
                <div className="h-1.5 w-full" style={{ background: post.accentGradient }} />

                {/* Illustration */}
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
                    style={{ height: 120, background: post.illustrationGradient }}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.6) 0%, transparent 60%)",
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
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${post.categoryColor}`}>
                      {copy.category}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {copy.readTime} {readLabel}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug">
                    {copy.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-muted leading-relaxed mb-5">{copy.excerpt}</p>

                  {/* Expandable rich content */}
                  <details className="group">
                    <summary className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80 transition-opacity select-none list-none">
                      <span className="group-open:hidden flex items-center gap-1.5">
                        {expandLabel}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                      <span className="hidden group-open:flex items-center gap-1.5">
                        {collapseLabel}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </span>
                    </summary>

                    <div className="mt-5 pt-5 border-t border-border/50">
                      <RichContent blocks={copy.blocks} />

                      {/* Per-article CTA */}
                      <ArticleCTABanner cta={copy.cta} isRtl={isRtl} />

                      {/* Related articles */}
                      <RelatedArticles
                        currentId={post.id}
                        relatedIds={copy.relatedIds}
                        locale={locale as "he" | "en"}
                        isRtl={isRtl}
                      />
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
            style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)" }}
          />
          <div className="relative z-10 px-8 py-12 md:py-16 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{ctaHeadline}</h2>
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
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
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
            <Link href="/" className="hover:text-primary transition-colors">{footerLinks.home}</Link>
            <Link href="/dashboard" className="hover:text-primary transition-colors">{footerLinks.dashboard}</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">{footerLinks.contact}</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">{footerLinks.privacy}</Link>
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

    const subs = JSON.parse(
      localStorage.getItem("bayit-blog-subscribers") ?? "[]"
    ) as string[];
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
