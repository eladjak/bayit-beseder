<div dir="rtl" align="center">

# בית בסדר

**ניהול הבית המשותף — כיפי, הוגן, ובעברית**

[English](README.md) | [עברית](README.he.md)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live](https://img.shields.io/badge/Live-bayitbeseder.com-brightgreen)](https://www.bayitbeseder.com)

אפליקציית PWA בעברית לניהול משותף של משימות הבית — עם גיימיפיקציה, תכנון חכם וסנכרון בזמן אמת.

**אתר:** [bayitbeseder.com](https://www.bayitbeseder.com)

---

אם הפרויקט שימושי עבורכם, תנו כוכב לריפו — זה עוזר לאחרים לגלות אותו!

[![Star](https://img.shields.io/github/stars/eladjak/bayit-beseder?style=social)](https://github.com/eladjak/bayit-beseder)

</div>

<div dir="rtl">

---

## תכונות

### ניהול משימות
- 8+ קטגוריות מאוירות עם נקודות, רצפים והישגים
- גרירה ושחרור לסידור מחדש
- הודעות אימון מותאמות על בסיס דפוסי ביצוע

### רשימת קניות
- סנכרון בזמן אמת עם בן/בת הזוג
- 22 קטגוריות מקובצות עם מקטעים מתקפלים

### מתכנן שבועי
- תזמון אוטומטי עם איזון עומסים
- תכנון לפי אזורים בבית (מטבח, חדר אמבטיה, סלון) — פחות קפיצות בין הקשרים
- מודעות לשבת — התזמון מכבד את גבולות השבת אוטומטית

### תזמון חכם
- מצב עונתי — תבניות לפסח/חגים עם 37 משימות ב-4 שלבים + 25 פריטי קניות
- סנכרון עם Google Calendar דרך OAuth2

### לוח סטטיסטיקות
- מגמות ביצוע וגרפי איזון זוגי
- שיאים אישיים ומעקב התקדמות

### גיימיפיקציה
- רצפים ונקודות XP לכל משימה
- הישגים ותגמולים זוגיים
- אנימציות חגיגה (canvas-confetti)

### התראות ואינטגרציות
- **סיכום יומי בוואטסאפ** — סיכום בוקר דרך Green API
- **התראות פוש** — תזכורות משימות והשלמות של בן/בת הזוג
- **סנכרון בזמן אמת** — Supabase Realtime שומר על שני השותפים מעודכנים

### חוויית משתמש
- עברית RTL עם פונט Heebo, נגיש לחלוטין
- PWA — התקנה מהדפדפן, עובד אופליין
- מצב כהה
- עיצוב Mobile-first
- תהליך הזמנת שותף/ה וניהול משק בית

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| פריימוורק | Next.js 16 (App Router) |
| שפה | TypeScript (strict) |
| עיצוב | Tailwind CSS 4 + פונט Heebo |
| בקאנד | Supabase (PostgreSQL + Realtime + Auth) |
| אנימציות | Framer Motion |
| גרפים | Recharts |
| גרירה ושחרור | dnd-kit |
| חגיגות | canvas-confetti |
| ניטור | Sentry |
| הגבלת קצב | Upstash (Redis) |

---

## התחלה מהירה

### דרישות מוקדמות
- [Bun](https://bun.sh/) (מומלץ) או Node.js 18+
- פרויקט [Supabase](https://supabase.com/)

### התקנה

</div>

```bash
git clone https://github.com/eladjak/bayit-beseder.git
cd bayit-beseder
bun install
```

<div dir="rtl">

### משתני סביבה

</div>

```bash
cp .env.example .env.local
```

<div dir="rtl">

מלאו את הערכים הנדרשים:

</div>

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

<div dir="rtl">

ראו `.env.example` לכל המשתנים האופציונליים (וואטסאפ, Google Calendar, התראות פוש).

### הגדרת מסד נתונים

הריצו את `supabase/migration.sql` ב-SQL Editor של Supabase ליצירת כל הטבלאות ומדיניות RLS.

### הפעלה

</div>

```bash
bun run dev
```

<div dir="rtl">

פתחו [http://localhost:3000](http://localhost:3000).

---

## בדיקות

</div>

```bash
bun run test          # בדיקות יחידה (Vitest)
bun run test:e2e      # בדיקות E2E (Playwright)
```

<div dir="rtl">

---

## פריסה

פריסה אוטומטית ל-Vercel מענף `master`.

דומיין: [bayitbeseder.com](https://www.bayitbeseder.com)

---

## רישיון

[MIT](LICENSE)

---

</div>

<div dir="rtl" align="center">

אם בית בסדר שימושי עבורכם, שקלו לתת כוכב!

[![Star](https://img.shields.io/github/stars/eladjak/bayit-beseder?style=for-the-badge&logo=github)](https://github.com/eladjak/bayit-beseder)

</div>
