---
title: מיפוי אובדן וחומרי שמחה בממשק
date: "2026-11-08"
audience: אלעד וצוות השחזור
theme: elad-personal
---

:::summary
- נבדק כל טווח השינויים בין `8c90c57` ל־`71c48a4`; לא נבדקה סביבת הייצור. {{internal}}
- התמונות, קובצי הצליל, גיליונות העיצוב והטוקנים נשארו בקוד; עיקר האובדן הוא בהסרה או בצמצום של מקומות ההצגה. {{internal}}
- דף הבית המחובר איבד את אזור הפתיחה הממותג, שורת הנתונים, כמה כרטיסי הישגים, תובנת האימון, נגן המוזיקה והכוונת ביקור ראשון. {{internal}}
- מסכי המשימות והקניות איבדו כותרות גרדיאנט וחלק מהדגשים; המשוב על השלמת משימה עדיין כולל סימון, הודעה וצליל השלמה. {{internal}}
- אמצעי ניווט, פריטי רגש ואונבורדינג עדיין קיימים בחלקם; המסמך מציין אם רכיב הוסר, נשאר אך אינו מוצג, או רק צומצם. {{internal}}
- צילומי הבסיס הקיימים אינם מכסים מסכים מחוברים; ב־worktree בעת עדכון המסמך נמצא גם סקריפט צילום מקומי; הוא לא חלק מהטווח שנבדק. {{internal}}
:::

:::unverified
המצב בזמן ריצה, מראה התמונות והשמעת הצלילים לא נבדקו בדפדפן. קיום נכסים נקבע לפי קבצי Git בלבד, וייתכנו תנאים שמשנים את הצגתם. {{internal}}
:::

:::section
title: מה נעלם ומה נשאר
topic: decision
conclusion: "יש להחזיר את נקודות המגע שנעלמו, תוך שימוש חוזר באיורים ובמרכיבי העיצוב שכבר קיימים. {{internal}}"
---
ההשוואה נעשתה בין `8c90c57..71c48a4`, לפי `git diff` של קובצי הממשק, הרכיבים והנכסים. מקור הנתונים הוא הקוד המקומי בלבד. שורה ישנה מסומנת עם מזהה הבסיס ושורה נוכחית עם נתיב הקובץ ומספר השורה. {{internal}}

הסרה מהמסך אינה מעידה שהרכיב או הנכס נמחקו. רכיבים שקיימים בקוד אך לא נמצאה להם נקודת חיבור במסכים ששונו מסומנים כ״נשארו, אך לא מחוברים כאן״. {{internal}}
:::

:::section
title: נקודות הממשק שהשתנו
topic: tech
conclusion: "הצמצום החזותי העיקרי נמצא בדף הבית המחובר, בדף המשימות, בקניות ובדף הנחיתה; מסכים אחרים עברו שינויי פריסה או נגישות מצומצמים. {{internal}}"
---

### לוח הבית והמשימות {{internal}}

ב־`src/app/(app)/dashboard/page.tsx`, ה־imports הישנים ב־`8c90c57` שורות 8–63 כללו `DashboardHeader`, `QuickStatsBar`, `PlaylistCard`, `CoachingInsight`, `FeatureTooltip`, `GamificationRow` ורכיבי הישגים נוספים. בקובץ הנוכחי שורות 8–49 חסרים כמה רכיבים אלה. ה־header עצמו עדיין קיים ב־`src/components/dashboard/dashboard-header.tsx:26-34` ומשתמש באיור `mascot-home.jpg`, אך אינו מחובר מהדשבורד. {{internal}}

הדשבורד הנוכחי מציג משימה פתוחה אחת או הודעת טקסט פשוטה כשאין משימות, ב־`71c48a4`, `src/app/(app)/dashboard/page.tsx:268-271` לחישוב ובשורות 429–441 להצגה. הישן הציג רכיבי סיכום, gamification ותוכן מתקדם; הפניות מדויקות ל־mounts הישנים מופיעות ב־`8c90c57` שורות 569–770. רכיבי quick-stats, gamification-row, coaching-insight ו־playlist-card נשארו בקוד, אך אינם מחוברים בנקודות אלה. {{internal}}

הדשבורד הישן שמר משימות הדגמה מקומיות כשהמסד ריק; בלוק `MOCK_TASKS` והשימוש ב־localStorage הוסרו. הקוד הנוכחי משתמש במשימות מסד הנתונים בלבד (`71c48a4`, `src/app/(app)/dashboard/page.tsx:195-222`). זה שינוי אמינות ולא אובדן עיצוב, אך הוא משנה את מצב ההתחלה הריק. {{internal}}

### משימות {{internal}}

`src/app/(app)/tasks/page.tsx` הוא קובץ ממשק ששונה באופן נרחב (176 שורות נוספו ו־173 הוסרו לפי `git diff --numstat`). הכותרת שהייתה כותרת גרדיאנט מלאה (`8c90c57`, `src/app/(app)/tasks/page.tsx:700-725`) הוחלפה בכותרת/פעולות בתוך משטח ניטרלי, והכותרת הנוכחית בכרטיס ניטרלי ב־`71c48a4`, `src/app/(app)/tasks/page.tsx:685-728`. הוסרו/הוחלפו תוויות פעולה זעירות בכפתורים נגישים גדולים יותר, תפריטי פרטים מקופלים ותוויות ברורות. {{internal}}

סימון המשימה המצויר ב־`src/components/tasks/task-complete-mark.tsx` כבר היה קיים בבסיס `8c90c57` והוא לא שונה בטווח הזה; מימושו משתמש בסימן עדין ומכבד תנועה מופחתת. ההערה על השארת השורה בזמן הציור נמצאת ב־`71c48a4`, `src/app/(app)/tasks/page.tsx:308-323`. לכן זו יכולת שנשארה, לא יכולת שנוספה בשינוי הנבדק. {{internal}}

### קניות וארוחות {{internal}}

ב־`src/app/(app)/shopping/page.tsx`, כותרת הגרדיאנט הישנה הוסרה; היום הכותרת נמצאת בכרטיס משטח ניטרלי (`71c48a4`, `src/app/(app)/shopping/page.tsx:296-317`). רמז הביקור הראשון נשאר, אך בעיצוב תיבה רגועה (`71c48a4`, `src/app/(app)/shopping/page.tsx:320-321`). מצב הרשימה הריקה עדיין משתמש ב־`.bb-joy`, באנימציה ובאיור `empty-shopping.jpg` (`71c48a4`, `src/app/(app)/shopping/page.tsx:352-375`), וכפתור הוספת הפריט עדיין משתמש ב־`gradient-primary`. פעולות השיתוף/ניהול הועברו לתפריט אפשרויות. {{internal}}

`src/app/(app)/meals/page.tsx` שינה את מבנה הכותרת והכרטיסים, אך לא הוסר בו אזור איור חגיגי שהיה שם. המצב ללא תוכנית הוא תיבת טקסט ניטרלית (`71c48a4`, `src/app/(app)/meals/page.tsx:314`); נשארו תגית היום, צבעי primary, הודעות amber לאזהרות ואנימציות מעבר (`71c48a4`, `src/app/(app)/meals/page.tsx:27-98, 346-351`). נוספה גם תמיכה בתכנון השבוע הראשון בנתיב נפרד. {{internal}}

### סטטיסטיקה, שבועי ו״עוד״ {{internal}}

`src/app/(app)/stats/page.tsx` השתנה מעט: כותרת `gradient-hero mesh-overlay` נשארה (`71c48a4`, `src/app/(app)/stats/page.tsx:551-565`), מצב ריק מאויר נשאר עם `empty-stats.jpg` ו־`.bb-joy` (`71c48a4`, `src/app/(app)/stats/page.tsx:619-637`), והמספרים/המדדים עדיין מונפשים. לא זוהה כאן אובדן מרכזי של חום. {{internal}}

`src/app/(app)/weekly/page.tsx` עבר התאמות קטנות של הצגה/טקסט; `empty-weekly.jpg` נשאר נכס שנעשה בו שימוש בחלק המצב הריק. `src/app/(app)/more/page.tsx` נוסף כדי לרכז קישורים לכלים. זה שינוי ארכיטקטורת ניווט ולא הסרה של כלי הבית עצמם. קישורי המשנה מסומנים ב־`src/components/bottom-nav.tsx:19,24`. {{internal}}

### ניווט ופריטי רגש גלובליים {{internal}}

`src/components/bottom-nav.tsx` הסיר `framer-motion`, את מעבר ה־layout המונפש ואת קו הגרדיאנט מתחת לפריט הפעיל שהיו ב־`8c90c57` באזור שורות 1–45. הניווט הנוכחי הוא פשוט וקבוע (`bottom-nav.tsx:16-28`), עם סימון פריט פעיל בצבע primary. זהו אובדן מיקרו־אנימציה ממוקד. {{internal}}

ב־`src/app/(app)/layout.tsx` עדיין נטענים `QuickLoveButton`, `SurpriseBox`, `WeeklyWheel`, `ActivePetBadge`, `CelebrationToast` ו־`WelcomeGiftModal` (`layout.tsx:38-72`); הקובץ לא הסיר את מנגנוני השמחה הגלובליים. `src/components/quick-love-button.tsx`, `surprise-box.tsx`, `welcome-gift.tsx`, `celebration-toast.tsx`, `weekly-wheel.tsx`, `pets/active-pet-badge.tsx` ו־`pets/pet-selector.tsx` שונו בפרטים קטנים, לא הוסרו. אנימציית הניווט כן הוסרה כאמור. {{internal}}

### דף נחיתה, התחברות והזמנה {{internal}}

`src/app/page.tsx` השתנה מהותית (19 שורות נוספו ו־77 הוסרו): אזור hero גרדיאנט סגול/אינדיגו עם שכבות אור, תגי קהלים וטקסט לבן הוחלף ב־header בהיר (`71c48a4`, `src/app/page.tsx:216-237`, קישור `/first-week` בשורה 223). האיור הביתי נשאר/מוצג בתמונה, והעמוד עדיין משתמש במקטעים מונפשים וקריאות לפעולה שמגיעים מ־`landing-dynamics`. האיור `hero-illustration.jpg` נשאר בתצוגה, אבל איור המוקאפ `/illustrations/app-mockup.jpg` שהיה מוצג מתחתיו בבסיס (`8c90c57`, `src/app/page.tsx:285-293`) הוסר מנחיתת `71c48a4`; קובץ המקור נשאר זמין. כך אבדו גם מעטפת הגרפיקה וגם מוקאפ המוצר, לא כל התוכן השיווקי או כל האיורים. {{internal}}

`src/app/blog/blog-content.tsx` שינה את כרטיסי הבלוג/קישורים באופן מצומצם. `src/app/invite/[code]/invite-content.tsx` שינה פרט הצגה קטן; לא זוהה אובדן איור או צליל. `src/components/AuthGuard.tsx`, `LanguageProvider.tsx`, `language-toggle.tsx` ושפות המילון (`src/lib/i18n/dictionaries/{he,en}.json`) השתנו לתמיכה בזרימת השפה/גישה והם אינם מצביעים על הסרת מיתוג או אנימציה. {{internal}}

לא שונה `src/app/(auth)/login/page.tsx` בטווח זה (הקובץ קיים וזהה בשני הקומיטים; תוכנו ב־`71c48a4` כולל עדיין רקע `gradient-hero animate-gradient` וצורות צפות בשורות 141-149). לכן מסך ההתחברות עצמו אינו חלק מהשינויים שניתן לייחס ל־8c90c57..71c48a4, ורקע הגרדיאנט/הצורות הצפות בו נשארו. צילומי login שבמאגר אינם הוכחה להשוואת עיצוב לפני ואחרי. {{internal}}

### אונבורדינג ומצב התחלה {{internal}}

הכוונת הביקור הראשון בדשבורד (`FeatureTooltip` ו־`useFirstVisit("dashboard")`) הוסרה מנקודת החיבור הישנה; ראו imports ב־`8c90c57` שורות 42–63, לעומת imports נוכחיים שורות 32–49. `src/components/feature-tooltip.tsx` ו־`src/hooks/useFirstVisit.ts` עדיין קיימים אך לא מחוברים מהדשבורד. אשף ההקמה ושיחת האונבורדינג נשארו (`src/components/onboarding/onboarding-wizard.tsx`, `conversational-onboarding.tsx`), ושונו לתיקוני פריסה/טקסט. {{internal}}

נוסף `src/app/first-week/page.tsx`, מסלול חדש עם תמונת קטגוריית מטבח, בחירת ארוחות, מזווה, רשימת קניות והזמנה. הוא משתמש ברקע קרם, כרטיסים בהירים וצבע אינדיגו, ולא בגרדיאנט hero או בדמות הקמע (`71c48a4`, `src/app/first-week/page.tsx:85-112`). זהו מסלול onboarding שימושי חדש, אך אינו מחליף את הסיור הישן בדשבורד. {{internal}}

:::

:::section
title: צבע, איור, גרדיאנט ומיקרו־אינטראקציות
topic: tech
conclusion: "לא נמצא מחיקה של קובצי הנכסים או הטוקנים בטווח; נמצאו הסרות של כמה משטחי גרדיאנט ואנימציית ניווט אחת. {{internal}}"
---

### צבעים והדגשות {{internal}}

ההשוואה של שמות הקבצים לא מצאה שינוי בקובצי `public/illustrations/`, `public/sounds/`, `src/app/globals.css`, קובצי theme או קובצי טוקנים. ממצאים אלה מתייחסים לקבצים ששונו בגיט בלבד. `CLAUDE.md:47-48` מגדיר primary `#4F46E5` ורקע `#FAFAF9`; לוח הקטגוריות נשאר ב־`src/lib/categories.ts:53-60`. קובצי העיצוב הגלובליים לא השתנו בטווח הזה, ולכן אין ראיה לכך שהצבעים עצמם נמחקו. {{internal}}

נקודות עיצוב שהוסרו/הוחלפו: hero dashboard (הקומפוננטה לא מחוברת), hero הנחיתה הסגול, כותרות הגרדיאנט בקניות ובמשימות, וקו גרדיאנט/מעבר פריט פעיל בתחתית. נקודות שנשארו: `gradient-primary` בכפתורי הוספה, `gradient-hero` בסטטיסטיקה, כרטיסי `.bb-joy` ואיורי empty state. מיקומים מדויקים מפורטים בפרקים הקודמים. {{internal}}

### איורים וקמע {{internal}}

לא נמחק קובץ איור. מועמדים לשימוש חוזר: `mascot-home.jpg`, `couple-celebration.jpg`, `tasks-done.jpg`, `empty-tasks.jpg`, `empty-shopping.jpg`, `empty-weekly.jpg`, `empty-stats.jpg`, `welcome-home.jpg`, `household-couple.jpg`, `household-family.jpg`, `household-roommates.jpg`, `household-solo.jpg`, וקובצי קטגוריה. מיפוי איורי קטגוריה נמצא ב־`src/lib/categories.ts:102-108`. איור הקמע משויך ל־DashboardHeader שנותר בקוד, `dashboard-header.tsx:26-34`; לא נמצא קמע חדש ב־`first-week/page.tsx`. {{internal}}

### אנימציה ומשוב על הצלחה {{internal}}

הדשבורד הישן קרא ל־`setCelebration` עבור השלמת משימה, השלמת היום וחוק הזהב, וניגן `playComplete`, `playAchievement`, `playStreak` (ב־`8c90c57`, `src/app/(app)/dashboard/page.tsx:372-392`). הקוד הנוכחי (`71c48a4`, `src/app/(app)/dashboard/page.tsx:273-290`) מציג הודעת הצלחה, שומר אפשרות להוספת משוב, מנגן `playComplete` ואינו מזין את מצב `celebration`. ה־`CelebrationOverlay` עדיין מחובר ברינדור (`71c48a4`, `src/app/(app)/dashboard/page.tsx:555-561`) אך לא מצאנו במסלול ההשלמה הנוכחי קריאה שמציגה אותו. {{internal}}

האנימציה ב־`task-complete-mark.tsx` נשארה, וכך גם `framer-motion`, `canvas-confetti` ו־`use-sound` כתלויות. `src/hooks/useAppSound.ts` מגדיר את הצלילים complete, achievement, streak, partner, error ו־tap. בדשבורד הנוכחי נשלף `playComplete` בלבד (`71c48a4`, `src/app/(app)/dashboard/page.tsx:108`); אין להסיק שהצלילים האחרים הוסרו מהאפליקציה כולה. רכיבי `celebration-toast` לפתיחת חיית מחמד/רקע ו־welcome gift נשארו בפריסת האפליקציה. {{internal}}

:::

:::section
title: צילומים, סקריפטים ומה הם מוכיחים
topic: source
conclusion: "יש כלי צילום מקומי שמכסה מסכי מפתח, אך נדרשת השוואת בסיס זהה כדי לקבוע מראה בפועל. {{internal}}"
---
ב־`docs/release-r2/` שמורים `local-landing-375.png`, `local-first-week-375.png` ו־`local-login-375.png`. `docs/release-r2/README.md` אומר שהם צולמו ב־Chromium ברוחב 375 פיקסלים על commit `5729e6d`, עם ערכי Supabase מדומים, ללא מסכים לאחר התחברות וללא בדיקת השלמה/ביטול, ואינם תצוגת Vercel. {{internal}}

ב־worktree המשותף לאחר תחילת ההשוואה נוצר `scripts/joy-capture.cjs`. השימוש מתועד בראש הקובץ; שורות 6–9 מצלמות landing, login, dashboard, tasks, settings וגם מסך completion לאחר ניסיון לחיצה. הסקריפט אינו חלק מ־`71c48a4`, ולכן לא נחשב נכס שהיה קיים בבסיס. אפשר להשתמש בו לצילומי שני הקומיטים בתנאים זהים, לאחר אימות ערכי סביבת הבדיקה. {{internal}}

`package.json:31-32` מציג גם פקודות Playwright E2E; הן בדיקות, אינן תחליף לצילומי השוואה. אין במסמך זה תוצאת צילום חדשה. {{internal}}
:::

:::section
title: מיפוי מלא של קובצי הממשק ששונו
topic: tech
conclusion: "כל שינויי ממשק בקובצי המקור נסקרו; ממצאי השמחה הגדולים מתרכזים במסכים שסומנו, והיתר הם בעיקר תרגום, פריסה או נגישות. {{internal}}"
---
להלן קובצי UI ששונו לפי `git diff --name-only 8c90c57..71c48a4`. הקיבוץ מציין סוג השינוי שנמצא, ולא טוען שכל שינוי קטן הוא אובדן שמחה. קובצי בדיקות המצויים ברשימה שונו כדי להתאים להתנהגות/עיצוב החדשים. {{internal}}

- **דפי אפליקציה:** `src/app/(app)/dashboard/page.tsx` - אובדן mounts/חגיגה; `layout.tsx` - פריסה ורכיבי רגש גלובליים נשארו; `tasks/page.tsx` - כותרת, פעולות, סימון משימה; `shopping/page.tsx` - כותרת ופעולות, empty art נשמר; `meals/page.tsx` - כרטיסים ומצב ריק; `stats/page.tsx` - שינויים קטנים, hero/empty art נשארו; `weekly/page.tsx` - התאמות קטנות; `more/page.tsx` - עמוד ניווט חדש. {{internal}}
- **נחיתה ותוכן ציבורי:** `src/app/page.tsx` - hero גרדיאנט הוחלף במבנה בהיר; `src/app/first-week/page.tsx` - עמוד onboarding חדש; `src/app/blog/blog-content.tsx` - התאמות כרטיסי תוכן; `src/app/invite/[code]/invite-content.tsx` - התאמת הצגת הזמנה. מסך login עצמו לא השתנה. {{internal}}
- **רכיבים:** `src/components/bottom-nav.tsx` - הוסרה אנימציית active; `dashboard/quick-stats-bar.tsx` - פרטי הצגה; `dashboard/today-overview.tsx` - empty illustration ומבנה כרטיס נשארו; `feature-tooltip.tsx` - קופי/תצוגה, לא מחובר מהדשבורד; `celebration-toast.tsx` - prop קטן; `gamification/weekly-share-card.tsx`, `weekly-wheel.tsx` - התאמות קטנות; `onboarding/conversational-onboarding.tsx`, `onboarding/onboarding-wizard.tsx` - התאמות זרימה; `backgrounds/background-selector.tsx`, `pets/active-pet-badge.tsx`, `pets/pet-selector.tsx`, `prizes/prize-manager.tsx`, `quick-love-button.tsx`, `settings/members-section.tsx`, `setup-wizard/step-room-tasks.tsx`, `shopping/purchased-section.tsx`, `shopping/shopping-item.tsx`, `surprise-box.tsx`, `ux-preferences-panel.tsx`, `voice-input-button.tsx`, `welcome-gift.tsx` - התאמות נקודתיות, לא מחיקה של משפחות רכיבים. {{internal}}
- **גישה, שפה והעדפות:** `AuthGuard.tsx`, `LanguageProvider.tsx`, `language-toggle.tsx`, `offline-indicator.tsx`, `src/lib/i18n/dictionaries/he.json`, `en.json`, וכן hooks `useAssistantVisibility.ts`, `useFirstVisit.ts`, `useMealPlanner.ts`, `useOfflineQueue.ts`, `usePWAInstall.ts`, `usePetCollectionSync.ts`, `useReducedMotion.ts`, `useSeasonalMode.ts`, `useTasks.ts`, `useThemeColor.ts`, `useZoneConfig.ts` - שינויים תפעוליים/העדפה/תרגום; הסקירה לא מצאה בהם מחיקת איור או קובץ צליל. `useCompletions.ts` שונה מהותית מבחינת אמינות המשימה; אין להסיק מכך אובדן נכס חזותי. {{internal}}
- **בדיקות UI ששונו:** `src/components/__tests__/bottom-nav-redesign.test.tsx`, `src/components/dashboard/__tests__/today-overview-redesign.test.tsx`, `src/components/shopping/__tests__/shopping-item-icon.test.tsx`, ו־`src/hooks/__tests__/useCompletions.test.ts`. {{internal}}

## מה לא נבדק {{internal}}

לא הופעל דפדפן להשוואת המוצר, לא נבדקו פיקסלים של תמונות, לא נוגנו קובצי צליל, ולא נבדקה סביבת production. המיפוי משווה קוד ושמות קבצים ואינו הוכחת מצב בזמן ריצה. גם כשקומפוננטה נשארה בקוד, ייתכנו תנאים בזמן ריצה שמשפיעים על הצגתה. {{internal}}

הקביעות על מה מוצג בפועל אינן מאומתות בדפדפן במסגרת המסמך. צילומי login הקיימים אינם צילום של שני הקומיטים. הטענות על נכסים וטוקנים מתייחסות לכך שלא הופיעו בקבצים ששונו בגיט, ולא לבדיקת עיצוב חיה. {{internal}}
:::


:::sources
:::
