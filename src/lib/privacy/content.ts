/**
 * Privacy policy + terms text, Hebrew and English, as data.
 *
 * Rules for editing this file:
 *  - State only what the code does. Every processor below was found by reading
 *    the code (see "Where in the code" comments). If you add a service, add it here.
 *  - Plain language, short sentences, no jargon, no em dashes.
 *  - NOT reviewed by a lawyer (not a legal opinion). Hebrew is the binding version.
 *  - Changing meaning? Bump POLICY_VERSION in ./policy.ts so people confirm again.
 */

export type L = { he: string; en: string };

export type Block =
  | { p: L }
  | { list: L[] }
  | { facts: { label: L; text: L }[] };

export interface Section {
  id: string;
  title: L;
  blocks: Block[];
}

export interface Processor {
  name: string;
  /** What this service receives. */
  gets: L;
  /** Why we use it. */
  why: L;
}

/** Placeholders replaced when rendering: {privacyEmail} {contactEmail} */
export const PROCESSORS: Processor[] = [
  {
    // src/lib/supabase/*, every API route
    name: "Supabase",
    gets: {
      he: "כל נתוני החשבון והבית, וההתחברות",
      en: "All account and household data, and sign-in",
    },
    why: {
      he: "מסד הנתונים וההרשמה. מעבד את המידע בשמנו בלבד.",
      en: "Our database and sign-up. Processes the data on our behalf only.",
    },
  },
  {
    // hosting
    name: "Vercel",
    gets: {
      he: "בקשות לאתר: כתובת IP וסוג הדפדפן",
      en: "Website requests: IP address and browser type",
    },
    why: { he: "מריץ את האתר והשרת.", en: "Hosts the website and the server." },
  },
  {
    // src/app/api/ai/chat/route.ts, src/app/api/ai/coaching-tip/route.ts
    name: "Google Gemini",
    gets: {
      he: "מה שכתבתם לעוזר החכם והשיחה האחרונה (עד 10 הודעות). בשאלות על מחירים, גם נתוני השוואת המחירים של רשימת הקניות. בטיפ היומי: רק כמה משימות הושלמו מתוך כמה",
      en: "What you write to the smart assistant and the recent conversation (up to 10 messages). For price questions, also the price comparison of your shopping list. For the daily tip: only how many tasks were done out of how many",
    },
    why: {
      he: "כדי שהעוזר יענה וייתן טיפים. אל תכתבו לעוזר מידע שאתם לא רוצים שגוגל תקבל.",
      en: "So the assistant can answer and give tips. Do not write anything to the assistant that you do not want Google to receive.",
    },
  },
  {
    // src/app/api/auth/callback/google-calendar, src/lib/google-calendar.ts, signInWithGoogle
    name: "Google (התחברות ויומן / sign-in and calendar)",
    gets: {
      he: "שם, אימייל ותמונת פרופיל. אם חיברתם יומן: האירועים שאנחנו יוצרים ומסנכרנים, ומפתח גישה שנשמר אצלנו עד שתנתקו",
      en: "Name, email and profile photo. If you connect a calendar: the events we create and sync, and an access key we keep until you disconnect",
    },
    why: {
      he: "כניסה בלי סיסמה נוספת, וסנכרון יומן למי שבחר בכך.",
      en: "Sign-in without another password, and calendar sync for those who choose it.",
    },
  },
  {
    // src/lib/whatsapp.ts
    name: "Green API (WhatsApp)",
    gets: {
      he: "מספר הטלפון ותוכן ההודעה",
      en: "Phone number and message text",
    },
    why: {
      he: "רק למי שחיבר וואטסאפ: שליחת תזכורות וקבלת עדכונים.",
      en: "Only for those who connected WhatsApp: sending reminders and receiving updates.",
    },
  },
  {
    // src/app/api/sumit/*
    name: "Sumit (סאמיט)",
    gets: {
      he: "שם, אימייל ופרטי התשלום שמזינים בעמוד התשלום שלהם",
      en: "Name, email and the payment details you enter on their payment page",
    },
    why: {
      he: "סליקה והפקת קבלה. פרטי האשראי נשארים אצל סאמיט ואינם מגיעים אלינו.",
      en: "Payment and receipts. Card details stay with Sumit and never reach us.",
    },
  },
  {
    // src/lib/prices/*
    name: "שרת השוואת המחירים שלנו (Contabo, גרמניה) / our price comparison server (Contabo, Germany)",
    gets: {
      he: "הפריטים ברשימת הקניות הפתוחה, נקודת מיקום (היישוב שבחרתם או המיקום שאישרתם בדפדפן), מזהה פנימי של הבית ובחירות המוצרים שלכם. בלי שם, אימייל או טלפון",
      en: "The items on your open shopping list, a location point (the town you chose, or the location you allowed in the browser), an internal household ID and your product choices. No name, email or phone",
    },
    why: {
      he: "רק למי שפותח את השוואת המחירים: חישוב ההשוואה. המידע לא מועבר לרשתות השיווק.",
      en: "Only for those who open price comparison: to calculate it. The data is not passed to the supermarket chains.",
    },
  },
  {
    // src/lib/rate-limit.ts
    name: "Upstash",
    gets: {
      he: "כתובת ה-IP שלכם, לזמן קצר",
      en: "Your IP address, for a short time",
    },
    why: {
      he: "הגבלת מספר הבקשות, כדי שאף אחד לא יעמיס על השירות או ינסה לנחש קודים.",
      en: "Limits how many requests can be made, so nobody can overload the service or guess codes.",
    },
  },
  {
    // sentry.*.config.ts
    name: "Sentry",
    gets: {
      he: "דוחות שגיאה טכניים",
      en: "Technical error reports",
    },
    why: { he: "כדי לגלות ולתקן תקלות מהר.", en: "To find and fix problems quickly." },
  },
  {
    // src/app/layout.tsx (production only), src/lib/analytics.ts
    name: "Plausible",
    gets: {
      he: "סטטיסטיקת ביקורים כללית. בלי עוגיות ובלי פרופיל אישי",
      en: "General visit statistics. No cookies and no personal profile",
    },
    why: { he: "כדי לדעת אילו עמודים שימושיים.", en: "To know which pages are useful." },
  },
  {
    // src/hooks/usePushNotifications.ts, src/app/api/push/*, src/lib/push.ts
    name: "שירות ההתראות של הדפדפן / your browser's push service (Google, Apple, Mozilla)",
    gets: {
      he: "כתובת טכנית של המכשיר שלכם ותוכן ההתראה",
      en: "A technical address of your device and the notification text",
    },
    why: {
      he: "רק למי שאישר התראות: כדי שההתראה תגיע למכשיר.",
      en: "Only for those who allowed notifications: so the notification reaches your device.",
    },
  },
  {
    // src/lib/sanity/client.ts, blog
    name: "Sanity",
    gets: {
      he: "בקשה לתוכן הבלוג. לא מקבל מידע על החשבון או הבית שלכם",
      en: "A request for blog content. Receives nothing about your account or household",
    },
    why: { he: "אחסון מאמרי הבלוג.", en: "Hosts the blog articles." },
  },
];

const PRIVACY_INTRO: L = {
  he: "בית בסדר היא אפליקציה לניהול הבית. הבית שלכם הוא שלכם, וגם המידע עליו. בעמוד הזה כתבנו בפשטות מה אנחנו שומרים, למה, מי עוד מקבל את זה, ומה אתם יכולים לעשות.",
  en: "Bayit BeSeder is an app for running your home. Your home is yours, and so is the information about it. This page explains in plain words what we keep, why, who else receives it, and what you can do.",
};

export const PRIVACY_PAGE = {
  title: { he: "מדיניות פרטיות", en: "Privacy policy" } as L,
  intro: PRIVACY_INTRO,
};

export const PRIVACY_SECTIONS: Section[] = [
  {
    id: "who",
    title: { he: "1. מי אחראי על המידע", en: "1. Who is responsible for your data" },
    blocks: [
      {
        p: {
          he: "בית בסדר מופעלת על ידי אלעד יעקובוביץ', עוסק פטור (\"אנחנו\"). אנחנו אחראים על המידע. לכל שאלה על פרטיות: {privacyEmail}",
          en: "Bayit BeSeder is run by Elad Yakobovich, a sole proprietor (\"we\"). We are responsible for the data. For any privacy question: {privacyEmail}",
        },
      },
    ],
  },
  {
    id: "collect",
    title: { he: "2. מה אנחנו שומרים", en: "2. What we keep" },
    blocks: [
      {
        facts: [
          {
            label: { he: "פרטי חשבון", en: "Account" },
            text: {
              he: "שם וכתובת אימייל. אם נכנסתם עם Google, גם תמונת פרופיל.",
              en: "Name and email address. If you sign in with Google, also your profile photo.",
            },
          },
          {
            label: { he: "נתוני הבית", en: "Household data" },
            text: {
              he: "משימות, מי עשה מה ומתי (כולל הערה או תמונה שצירפתם), רשימות קניות, נקודות והישגים. כל מה שאתם מזינים כדי שהאפליקציה תעבוד.",
              en: "Tasks, who did what and when (including a note or photo you attach), shopping lists, points and achievements. Everything you enter so the app can work.",
            },
          },
          {
            label: { he: "ארוחות, אלרגיות וכשרות", en: "Meals, allergies and kosher" },
            text: {
              he: "רק אם הזנתם. מידע על אלרגיות הוא מידע רגיש, ולכן הזינו רק מה שנחוץ לתכנון הארוחות.",
              en: "Only if you enter it. Allergy information is sensitive, so enter only what meal planning needs.",
            },
          },
          {
            label: { he: "ילדים", en: "Children" },
            text: {
              he: "שם, גיל, העדפות ומשימות של ילדים שההורים הוסיפו לבית. ראו סעיף 7.",
              en: "Name, age, preferences and chores of children a parent added to the household. See section 7.",
            },
          },
          {
            label: { he: "וואטסאפ (רשות)", en: "WhatsApp (optional)" },
            text: {
              he: "מספר הטלפון של מי שבחר לקבל תזכורות בוואטסאפ.",
              en: "The phone number of anyone who chose WhatsApp reminders.",
            },
          },
          {
            label: { he: "יומן Google (רשות)", en: "Google Calendar (optional)" },
            text: {
              he: "אם חיברתם יומן, אנחנו שומרים מפתח גישה ויוצרים ומסנכרנים אירועים בשמכם. אפשר לנתק בכל עת בהגדרות.",
              en: "If you connect a calendar, we keep an access key and create and sync events for you. You can disconnect any time in Settings.",
            },
          },
          {
            label: { he: "התראות (רשות)", en: "Notifications (optional)" },
            text: {
              he: "כתובת טכנית של המכשיר, רק אם אישרתם התראות.",
              en: "A technical address of your device, only if you allowed notifications.",
            },
          },
          {
            label: { he: "משוב ותשלום", en: "Feedback and payment" },
            text: {
              he: "דירוג והודעה ששלחתם לנו. אם שדרגתם ל-Plus: סטטוס המנוי ומזהי התשלום. פרטי כרטיס האשראי נשארים אצל סאמיט.",
              en: "Ratings and messages you send us. If you upgraded to Plus: subscription status and payment IDs. Card details stay with Sumit.",
            },
          },
          {
            label: { he: "נתונים טכניים", en: "Technical data" },
            text: {
              he: "שגיאות וביצועים, וסטטיסטיקת ביקורים כללית. אנחנו לא עוקבים אחרי כל קליק.",
              en: "Errors and performance, and general visit statistics. We do not track every click.",
            },
          },
        ],
      },
      {
        p: {
          he: "אין חובה חוקית למסור לנו מידע. אבל בלי שם ואימייל אי אפשר לפתוח חשבון, ובלי נתוני הבית האפליקציה לא יכולה לעבוד. מידע שהוא רשות (וואטסאפ, יומן, התראות, אלרגיות) אפשר פשוט לא למסור.",
          en: "You are not legally required to give us data. But without a name and email an account cannot be opened, and without household data the app cannot work. Optional data (WhatsApp, calendar, notifications, allergies) you can simply leave out.",
        },
      },
    ],
  },
  {
    id: "why",
    title: { he: "3. למה אנחנו משתמשים במידע", en: "3. Why we use it" },
    blocks: [
      {
        list: [
          { he: "להפעיל את האפליקציה ולשתף את המידע בין חברי הבית", en: "To run the app and share information between household members" },
          { he: "לשלוח תזכורות ועדכונים שביקשתם", en: "To send reminders and updates you asked for" },
          { he: "להפעיל את העוזר החכם ואת תכנון הארוחות", en: "To run the smart assistant and meal planning" },
          { he: "לגבות תשלום על Plus ולהפיק קבלה", en: "To charge for Plus and issue a receipt" },
          { he: "לתקן תקלות ולשפר את האפליקציה", en: "To fix problems and improve the app" },
        ],
      },
      {
        p: {
          he: "מה שאנחנו לא עושים: לא מוכרים מידע, לא משתמשים בנתוני הבית לפרסום ממוקד, ולא שולחים ספאם.",
          en: "What we do not do: we do not sell data, we do not use household data for targeted ads, and we do not send spam.",
        },
      },
    ],
  },
  {
    id: "who-sees",
    title: { he: "4. מי רואה את המידע", en: "4. Who sees your data" },
    blocks: [
      {
        p: {
          he: "המידע של בית גלוי רק לחברי אותו בית. ההגבלה נאכפת בשרת ובמסד הנתונים ולא רק במסך: גם בקשה ישירה למידע של בית אחר נדחית. כל מי שהוזמן לבית רואה ועורך את המידע המשותף של הבית.",
          en: "A household's data is visible only to that household's members. This is enforced on the server and in the database, not only on screen: a direct request for another household's data is refused. Anyone invited to a household sees and edits that household's shared data.",
        },
      },
      {
        p: {
          he: "עוזרים דיגיטליים שחיברתם (דרך קוד גישה מההגדרות) מוגבלים לבית שלכם ולהרשאות שנתתם להם. אפשר לבטל קוד גישה בכל עת.",
          en: "Digital assistants you connect (through an access code from Settings) are limited to your household and to the permissions you gave them. You can revoke an access code any time.",
        },
      },
    ],
  },
  {
    id: "processors",
    title: { he: "5. מי עוד מקבל מידע", en: "5. Who else receives data" },
    blocks: [
      {
        p: {
          he: "אנחנו משתמשים בשירותים חיצוניים כדי להפעיל את האפליקציה. כל אחד מקבל רק מה שהוא צריך לתפקיד שלו:",
          en: "We use outside services to run the app. Each receives only what it needs for its job:",
        },
      },
      // The list itself is rendered from PROCESSORS by the page component.
      {
        p: {
          he: "חלק מהשירותים שומרים מידע בשרתים מחוץ לישראל, באירופה או בארצות הברית. אנחנו לא מוכרים את המידע לאף אחד מהם.",
          en: "Some of these services store data on servers outside Israel, in Europe or the United States. We do not sell your data to any of them.",
        },
      },
    ],
  },
  {
    id: "voice",
    title: { he: "6. הקלדה בקול", en: "6. Voice input" },
    blocks: [
      {
        p: {
          he: "כשאתם לוחצים על המיקרופון ומדברים, הדפדפן שלכם שולח את ההקלטה לשירות זיהוי הדיבור של יצרן הדפדפן (ב-Chrome ו-Edge זה בדרך כלל גוגל, ב-Safari זה אפל). אנחנו לא מקבלים את ההקלטה ולא שומרים אותה. אנחנו מקבלים רק את הטקסט שמופיע בשדה. המיקרופון נפתח רק כשאתם לוחצים עליו.",
          en: "When you press the microphone and speak, your browser sends the recording to the speech recognition service of the browser maker (in Chrome and Edge this is usually Google, in Safari it is Apple). We do not receive or keep the recording. We only receive the text that appears in the field. The microphone opens only when you press it.",
        },
      },
    ],
  },
  {
    id: "children",
    title: { he: "7. מידע על ילדים", en: "7. Children" },
    blocks: [
      {
        p: {
          he: "ילדים אינם פותחים חשבון בעצמם. הורה או אפוטרופוס מוסיף אותם לבית, מנהל את הפרטים שלהם, ויכול לתקן או למחוק אותם בכל עת. חבר בית מתחת לגיל 18 מצטרף רק בהזמנה של הורה שהוא חבר בבית. האפליקציה אינה פונה לילדים בפרסום ואינה אוספת מהם מידע בלי מעורבות הורה. פתיחת חשבון מחייבת אישור שאתם בני 18 ומעלה.",
          en: "Children do not open accounts themselves. A parent or guardian adds them to the household, manages their details, and can correct or delete them any time. A household member under 18 joins only by invitation from a parent who is a member. The app is not advertised to children and does not collect data from them without a parent. Opening an account requires confirming that you are 18 or older.",
        },
      },
    ],
  },
  {
    id: "cookies",
    title: { he: "8. עוגיות ואחסון בדפדפן", en: "8. Cookies and browser storage" },
    blocks: [
      {
        p: {
          he: "אנחנו שומרים בדפדפן העדפות כמו ערכת צבעים ושפה, וגם את ההתחברות שלכם. אלה נחוצים כדי שהאפליקציה תעבוד. אין עוגיות פרסום, וסטטיסטיקת הביקורים אינה משתמשת בעוגיות.",
          en: "We keep preferences in your browser, such as color theme and language, and your sign-in. These are needed for the app to work. There are no advertising cookies, and the visit statistics do not use cookies.",
        },
      },
    ],
  },
  {
    id: "retention",
    title: { he: "9. כמה זמן שומרים, ואיך מוחקים", en: "9. How long we keep it, and how to delete" },
    blocks: [
      {
        p: {
          he: "אנחנו שומרים את המידע כל עוד החשבון קיים. אפשר למחוק את החשבון בעצמכם: הגדרות, \"מחיקת החשבון\". המחיקה מתבצעת מיד.",
          en: "We keep your data as long as your account exists. You can delete your account yourself: Settings, \"Delete my account\". The deletion happens immediately.",
        },
      },
      {
        list: [
          {
            he: "אם אתם החבר האחרון בבית, הבית וכל המידע שלו נמחקים.",
            en: "If you are the last member of a household, the household and all its data are deleted.",
          },
          {
            he: "אם יש בבית חברים אחרים, אתם יוצאים מהבית. המשימות והרשימות המשותפות נשארות לחברים שנשארו, בלי השם שלכם. אם הייתם הבעלים, מי שהצטרף ראשון אחריכם הופך לבעלים.",
            en: "If other members remain, you leave the household. Shared tasks and lists stay with the remaining members, without your name. If you were the owner, the member who joined next becomes the owner.",
          },
          {
            he: "הפרטים האישיים שלכם נמחקים: חשבון, פרופיל, היסטוריית המשימות שביצעתם (כולל תמונות שצירפתם), נקודות, משוב, מפתח היומן, כתובת ההתראות והמספר של וואטסאפ. קודי גישה לעוזרים שיצרתם מתבטלים.",
            en: "Your personal details are deleted: account, profile, the history of tasks you completed (including photos you attached), points, feedback, calendar key, notification address and WhatsApp number. Access codes you created for assistants stop working.",
          },
          {
            he: "מנוי Plus פעיל צריך לבטל לפני המחיקה, כדי שלא תחויבו על חשבון שלא קיים. קבלות ומסמכי חשבונאות נשמרים אצל סאמיט כפי שהחוק מחייב.",
            en: "An active Plus subscription must be cancelled first, so you are not charged for an account that no longer exists. Receipts and accounting documents are kept by Sumit as the law requires.",
          },
          {
            he: "אירועים שכבר נוצרו ביומן Google שלכם נשארים שם. אפשר למחוק אותם מהיומן.",
            en: "Events already created in your Google calendar stay there. You can delete them from the calendar.",
          },
          {
            he: "עותקי גיבוי של מסד הנתונים מתחלפים אצל הספק, ולכן עותק ישן עשוי להכיל מידע עד שיוחלף.",
            en: "Database backups are rotated by the provider, so an old copy may still contain data until it is replaced.",
          },
        ],
      },
    ],
  },
  {
    id: "rights",
    title: { he: "10. הזכויות שלכם", en: "10. Your rights" },
    blocks: [
      {
        facts: [
          {
            label: { he: "עיון", en: "Access" },
            text: {
              he: "כל הנתונים שלכם גלויים לכם באפליקציה. אפשר לבקש מאיתנו עותק מלא.",
              en: "All your data is visible to you in the app. You can ask us for a full copy.",
            },
          },
          {
            label: { he: "תיקון", en: "Correction" },
            text: {
              he: "אפשר לערוך פרטים בהגדרות, או לבקש מאיתנו לתקן.",
              en: "You can edit details in Settings, or ask us to correct them.",
            },
          },
          {
            label: { he: "ייצוא", en: "Export" },
            text: {
              he: "אפשר להוריד את המשימות וההיסטוריה כקובץ מההגדרות, ולבקש עותק מלא.",
              en: "You can download your tasks and history as a file from Settings, and ask for a full copy.",
            },
          },
          {
            label: { he: "מחיקה", en: "Deletion" },
            text: {
              he: "בהגדרות, \"מחיקת החשבון\". או בבקשה אלינו.",
              en: "In Settings, \"Delete my account\". Or by asking us.",
            },
          },
          {
            label: { he: "ביטול הסכמה", en: "Withdraw consent" },
            text: {
              he: "אפשר לנתק וואטסאפ ויומן בכל עת בהגדרות, ולכבות התראות בדפדפן.",
              en: "You can disconnect WhatsApp and calendar any time in Settings, and turn off notifications in your browser.",
            },
          },
          {
            label: { he: "תלונה", en: "Complaint" },
            text: {
              he: "אם לדעתכם לא כיבדנו את הזכויות שלכם, פנו אלינו, וגם לרשות להגנת הפרטיות במשרד המשפטים.",
              en: "If you think we did not respect your rights, contact us, and also the Privacy Protection Authority at Israel's Ministry of Justice.",
            },
          },
        ],
      },
      {
        p: {
          he: "נענה לכל בקשה תוך 14 ימי עסקים, ונבצע אותה לכל המאוחר תוך 30 יום. פניות: {privacyEmail}",
          en: "We answer every request within 14 business days and carry it out within 30 days at most. Requests: {privacyEmail}",
        },
      },
    ],
  },
  {
    id: "changes",
    title: { he: "11. שינויים במדיניות", en: "11. Changes to this policy" },
    blocks: [
      {
        p: {
          he: "כשמשהו מהותי משתנה, נעדכן את התאריך והגרסה בראש העמוד, ובכניסה הבאה לאפליקציה תתבקשו לאשר שוב לפני שתמשיכו.",
          en: "When something important changes, we update the date and version at the top of this page, and the next time you open the app you will be asked to confirm again before you continue.",
        },
      },
    ],
  },
];

export const TERMS_PAGE = {
  title: { he: "תנאי שימוש", en: "Terms of use" } as L,
  intro: {
    he: "ברוכים הבאים לבית בסדר. השימוש באפליקציה הוא הסכמה לתנאים האלה. כתבנו אותם בשפה פשוטה, אבל הם מחייבים. קראו אותם יחד עם מדיניות הפרטיות.",
    en: "Welcome to Bayit BeSeder. Using the app means you agree to these terms. We wrote them in plain language, but they are binding. Read them together with the privacy policy.",
  } as L,
  footer: {
    he: "תנאי השימוש כתובים בעברית ומחייבים בגרסתם העברית. התרגום לאנגלית נועד לנוחות בלבד.",
    en: "The terms are written in Hebrew and the Hebrew version is the binding one. This English translation is for convenience only.",
  } as L,
};

export const TERMS_SECTIONS: Section[] = [
  {
    id: "what",
    title: { he: "1. מהי האפליקציה ומי מפעיל אותה", en: "1. What the app is and who runs it" },
    blocks: [
      {
        p: {
          he: "בית בסדר היא אפליקציה לניהול משק בית: משימות, רשימות קניות, תכנון ארוחות ותזכורות, לזוגות, למשפחות ולשותפים. היא מופעלת על ידי אלעד יעקובוביץ', עוסק פטור (\"אנחנו\"). יצירת קשר: {contactEmail}",
          en: "Bayit BeSeder is an app for running a household: tasks, shopping lists, meal planning and reminders, for couples, families and housemates. It is run by Elad Yakobovich, a sole proprietor (\"we\"). Contact: {contactEmail}",
        },
      },
    ],
  },
  {
    id: "who",
    title: { he: "2. מי יכול להשתמש", en: "2. Who can use it" },
    blocks: [
      {
        p: {
          he: "פתיחת חשבון מחייבת להיות בן 18 לפחות, ואתם מאשרים זאת בהרשמה.",
          en: "You must be at least 18 to open an account, and you confirm this when you sign up.",
        },
      },
      {
        p: {
          he: "חבר בית מתחת לגיל 18 מצטרף רק בהזמנה של הורה או אפוטרופוס שהוא חבר באותו בית, והאחריות על השימוש שלו היא של ההורה. ילדים צעירים אינם פותחים חשבון: ההורה מוסיף אותם לבית ומנהל את הפרטים שלהם.",
          en: "A household member under 18 joins only by invitation from a parent or guardian who is a member of that household, and the parent is responsible for that use. Young children do not open accounts: the parent adds them to the household and manages their details.",
        },
      },
    ],
  },
  {
    id: "account",
    title: { he: "3. חשבון ומשק בית", en: "3. Account and household" },
    blocks: [
      {
        p: {
          he: "כדי להשתמש צריך חשבון עם אימייל אמיתי. אתם אחראים לשמור על פרטי ההתחברות בסוד. כל מי שהוזמן לבית רואה ועורך את המידע המשותף של אותו בית.",
          en: "You need an account with a real email. You are responsible for keeping your sign-in details secret. Everyone invited to a household sees and edits that household's shared information.",
        },
      },
      {
        p: {
          he: "יציאה מהבית או מחיקת חשבון: מי שעוזב מאבד גישה למידע של הבית. הרשומות המשותפות (למשל משימות ורשימות) נשארות לחברים שנשארו, בלי השם של מי שעזב. כל אחד יכול למחוק את החשבון שלו בעצמו בהגדרות.",
          en: "Leaving a household or deleting an account: whoever leaves loses access to the household's data. Shared records (such as tasks and lists) stay with the remaining members, without the name of the person who left. Anyone can delete their own account in Settings.",
        },
      },
      {
        p: {
          he: "פרידה: כל אחד מבני הזוג יכול לפנות אלינו באימייל ולבקש להפריד את החשבונות. נעזור לכל צד לקבל עותק של המידע שלו. כרגע זה נעשה ידנית.",
          en: "Separation: either partner can email us and ask to separate the accounts. We will help each side get a copy of their data. For now this is done manually.",
        },
      },
    ],
  },
  {
    id: "plus",
    title: { he: "4. חינם ו-Plus: מחיר, תשלום וביטול", en: "4. Free and Plus: price, payment and cancellation" },
    blocks: [
      {
        p: {
          he: "הגרסה החינמית נשארת חינמית, בלי הגבלת זמן.",
          en: "The free version stays free, with no time limit.",
        },
      },
      {
        p: {
          he: "Plus עולה 19 ₪ לחודש למשק בית. זה המחיר הסופי: אנחנו עוסק פטור, ולכן אין תוספת מע\"מ. התכולה המדויקת מוצגת בעמוד השדרוג לפני התשלום.",
          en: "Plus costs 19 NIS per month per household. This is the final price: we are an exempt dealer, so there is no VAT on top. The exact contents are shown on the upgrade page before you pay.",
        },
      },
      {
        p: {
          he: "התשלום מתבצע בעמוד מאובטח של חברת הסליקה סאמיט, ובסופו נשלחת קבלה לאימייל. כל תשלום מעניק Plus לכל חברי הבית ל-31 יום. אם התשלום הוגדר כחיוב חודשי, הוא מתחדש כל חודש עד שתבטלו, ולפני כל שינוי מחיר נודיע לפחות 30 יום מראש.",
          en: "Payment is made on a secure page of the payment company Sumit, and a receipt is emailed at the end. Each payment gives Plus to all household members for 31 days. If you set up monthly billing, it renews every month until you cancel, and we will tell you at least 30 days before any price change.",
        },
      },
      {
        p: {
          he: "ביטול: אפשר לבטל בכל עת, מההגדרות או באימייל. החיוב הבא ייעצר תוך 3 ימי עסקים לכל היותר, ו-Plus נשאר פעיל עד סוף התקופה ששולמה.",
          en: "Cancellation: you can cancel any time, in Settings or by email. The next charge stops within 3 business days at most, and Plus stays active until the end of the paid period.",
        },
      },
      {
        p: {
          he: "החזר כספי: ביקשתם לבטל תוך 14 יום מהתשלום הראשון, תקבלו החזר מלא. ביטול מאוחר יותר: לבקשתכם נחזיר את החלק היחסי של החודש שלא נוצל, לאותו אמצעי תשלום.",
          en: "Refunds: if you ask to cancel within 14 days of the first payment, you get a full refund. Later cancellation: on request we refund the unused part of the month, to the same payment method.",
        },
      },
    ],
  },
  {
    id: "use",
    title: { he: "5. שימוש מקובל", en: "5. Acceptable use" },
    blocks: [
      {
        list: [
          { he: "להשתמש באפליקציה לניהול הבית שלכם", en: "Use the app to run your own household" },
          { he: "להזין מידע על אחרים (למשל בן משפחה שאינו בבית) רק בהסכמתם", en: "Enter information about others (such as a relative who is not in the household) only with their consent" },
          { he: "לא להעביר פרטי התחברות או קוד גישה של עוזר דיגיטלי לאנשים מחוץ לבית", en: "Do not give sign-in details or an assistant access code to people outside the household" },
          { he: "לא לנסות לגשת למידע של בית אחר, לפרוץ או לעקוף הגנות", en: "Do not try to reach another household's data, break in or bypass protections" },
          { he: "לא להשתמש בממשק לסוכנים מעבר להרשאה שניתנה, ולא להעמיס על השירות", en: "Do not use the agent interface beyond the permission given, and do not overload the service" },
          { he: "לא להשתמש בשירות לפעילות בלתי חוקית, להטרדה או לתוכן פוגעני", en: "Do not use the service for illegal activity, harassment or offensive content" },
        ],
      },
    ],
  },
  {
    id: "ip",
    title: { he: "6. קניין רוחני", en: "6. Intellectual property" },
    blocks: [
      {
        p: {
          he: "הקוד, העיצוב והתוכן של האפליקציה שייכים לנו. הנתונים שאתם מזינים שייכים לכם, ואנחנו לא טוענים לבעלות עליהם.",
          en: "The code, design and content of the app belong to us. The data you enter belongs to you, and we do not claim ownership of it.",
        },
      },
    ],
  },
  {
    id: "assistant",
    title: { he: "7. העוזר החכם", en: "7. The smart assistant" },
    blocks: [
      {
        p: {
          he: "הצעות העוזר החכם (למשל תפריט שבועי) הן הצעות בלבד. בנושא אלרגיות ורגישויות מזון, בדקו בעצמכם שהמידע שהזנתם נכון ושהמנה מתאימה. ההחלטה מה מגישים נשארת שלכם. מה שאתם כותבים לעוזר נשלח לגוגל, כמתואר במדיניות הפרטיות.",
          en: "Suggestions from the smart assistant (such as a weekly menu) are suggestions only. For allergies and food sensitivities, check yourself that what you entered is correct and the dish is suitable. The decision what to serve stays yours. What you write to the assistant is sent to Google, as described in the privacy policy.",
        },
      },
    ],
  },
  {
    id: "liability",
    title: { he: "8. זמינות והגבלת אחריות", en: "8. Availability and limits of liability" },
    blocks: [
      {
        p: {
          he: "אנחנו שואפים שהאפליקציה תהיה זמינה תמיד, אבל ייתכנו תקלות ועבודות תחזוקה. השירות ניתן כפי שהוא.",
          en: "We aim for the app to be always available, but there may be faults and maintenance. The service is provided as is.",
        },
      },
      {
        p: {
          he: "השוואת המחירים מבוססת על הקבצים שרשתות השיווק מפרסמות לפי חוק שקיפות המחירים, ומוצגת עם תאריך העדכון. המחירים עשויים להשתנות, מבצעים ומחירי מועדון משתנים בין סניפים, והמחיר הקובע הוא המחיר בקופה. איננו קשורים לרשתות השיווק ואיננו פועלים מטעמן.",
          en: "Price comparison is based on files that supermarket chains publish under Israel's price transparency law, and is shown with its update date. Prices may change, sales and club prices differ between branches, and the price at the checkout is the one that counts. We are not affiliated with the chains and do not act for them.",
        },
      },
      {
        p: {
          he: "בכפוף לחוק, איננו אחראים לנזק עקיף, והאחריות שלנו מוגבלת לסכום ששילמתם לנו ב-12 החודשים האחרונים. ההגבלה אינה חלה על נזק שנגרם בזדון או ברשלנות חמורה שלנו, ואינה גורעת מזכויות שהחוק נותן לכם כצרכנים.",
          en: "As far as the law allows, we are not liable for indirect damage, and our liability is limited to the amount you paid us in the last 12 months. This limit does not apply to damage caused by our malice or gross negligence, and does not reduce your rights as a consumer under the law.",
        },
      },
    ],
  },
  {
    id: "ending",
    title: { he: "9. סיום שימוש", en: "9. Ending use" },
    blocks: [
      {
        p: {
          he: "מצדכם: אפשר להפסיק בכל עת ולמחוק את החשבון בעצמכם בהגדרות, או בבקשה ל-{privacyEmail}. המחיקה מתבצעת כמתואר במדיניות הפרטיות.",
          en: "From your side: you can stop any time and delete your account yourself in Settings, or by asking {privacyEmail}. Deletion works as described in the privacy policy.",
        },
      },
      {
        p: {
          he: "מצדנו: נוכל להשעות חשבון שמפר את התנאים. ברוב המקרים נזהיר קודם. רק במקרה חמור, למשל ניסיון לגשת למידע של בית אחר, נשעה מיד ונודיע לכם למה.",
          en: "From our side: we may suspend an account that breaks the terms. In most cases we warn first. Only in a serious case, such as trying to reach another household's data, we suspend at once and tell you why.",
        },
      },
    ],
  },
  {
    id: "changes",
    title: { he: "10. שינויים בתנאים", en: "10. Changes to the terms" },
    blocks: [
      {
        p: {
          he: "שינוי מהותי יגיע אליכם באימייל או בתוך האפליקציה לפחות 30 יום לפני שייכנס לתוקף, והתאריך והגרסה בראש הדף יתעדכנו. בכניסה הבאה לאפליקציה תתבקשו לאשר שוב. לא מסכימים? אפשר לבטל ולמחוק את החשבון, ומי ששילם יקבל החזר יחסי.",
          en: "A material change will reach you by email or inside the app at least 30 days before it takes effect, and the date and version at the top of the page will be updated. The next time you open the app you will be asked to confirm again. Do not agree? You can cancel and delete your account, and anyone who paid gets a pro rata refund.",
        },
      },
    ],
  },
  {
    id: "law",
    title: { he: "11. הדין וסמכות השיפוט", en: "11. Governing law" },
    blocks: [
      {
        p: {
          he: "על התנאים חל הדין הישראלי. סכסוך יידון בבית המשפט המוסמך בישראל לפי החוק, כך שאפשר לתבוע גם בבית המשפט הקרוב למקום מגוריכם.",
          en: "Israeli law applies to these terms. A dispute will be heard by the competent court in Israel under the law, so you can also sue in the court closest to where you live.",
        },
      },
    ],
  },
  {
    id: "contact",
    title: { he: "12. יצירת קשר", en: "12. Contact" },
    blocks: [
      {
        p: {
          he: "שאלות, משוב, או סתם להגיד שלום: {contactEmail}",
          en: "Questions, feedback, or just to say hello: {contactEmail}",
        },
      },
    ],
  },
];

/** The four short cards on the gate screen. Plain words, names of processors included. */
export const GATE_CARDS: { icon: "collect" | "why" | "who" | "rights"; title: L; text: L }[] = [
  {
    icon: "collect",
    title: { he: "מה אנחנו שומרים", en: "What we keep" },
    text: {
      he: "שם, אימייל, והמשימות, הקניות והארוחות של הבית שלכם. אם תבחרו: מספר וואטסאפ, יומן Google והתראות.",
      en: "Your name, email, and your household's tasks, shopping and meals. If you choose: WhatsApp number, Google Calendar and notifications.",
    },
  },
  {
    icon: "why",
    title: { he: "למה", en: "Why" },
    text: {
      he: "כדי שהאפליקציה תעבוד ותשתף את הבית בין כולם. לא מוכרים מידע ולא מפרסמים לפיו.",
      en: "So the app works and shares the home between everyone. We do not sell data or advertise with it.",
    },
  },
  {
    icon: "who",
    title: { he: "מי עוד מקבל", en: "Who else receives it" },
    text: {
      he: "Supabase (מסד נתונים), Vercel (אחסון), Google Gemini (העוזר החכם), Sumit (תשלום), Green API (וואטסאפ), Upstash, Sentry, Plausible (הגבלת עומס, שגיאות וסטטיסטיקה).",
      en: "Supabase (database), Vercel (hosting), Google Gemini (smart assistant), Sumit (payment), Green API (WhatsApp), Upstash, Sentry, Plausible (load limiting, errors and statistics).",
    },
  },
  {
    icon: "rights",
    title: { he: "הזכויות שלכם", en: "Your rights" },
    text: {
      he: "אפשר להוריד את המידע בהגדרות, ולמחוק את החשבון בלחיצה. הכל מוסבר במדיניות המלאה.",
      en: "You can download your data in Settings and delete your account in a click. Everything is explained in the full policy.",
    },
  },
];

/** Replace {privacyEmail} / {contactEmail} tokens. Returns plain string parts. */
export function splitTokens(text: string): { type: "text" | "privacyEmail" | "contactEmail"; value: string }[] {
  const out: { type: "text" | "privacyEmail" | "contactEmail"; value: string }[] = [];
  const re = /\{(privacyEmail|contactEmail)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: m[1] as "privacyEmail" | "contactEmail", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
