# New UI switch

The switch is infrastructure only until C-06 adds the script to the root layout and screens use the hook. It does not enable the redesign by itself.

In Vercel, set `NEXT_PUBLIC_NEW_UI=true` for the desired preview environment and redeploy. Public variables are fixed at build time. To turn it off, remove the variable or change it to `false` and redeploy; rollback takes the time needed for a new deployment, not an instant switch. Production can be enabled the same way only after the owner decides to do so.

On a preview, after the layout integration is in place, add `?ui=v2` to the address to try the new UI on that browser. It is remembered in local storage. Use `?ui=v1` to clear that preference. If the build flag itself is on, clearing the preference does not turn it off. These overrides are disabled in production.

Keep Vercel's **Automatically expose System Environment Variables** enabled so `NEXT_PUBLIC_VERCEL_ENV` is available. If it is missing in a production build, overrides are disabled safely, but testers cannot use the query switch. A local development build also allows overrides.

## איך מדליקים את העיצוב החדש למשפחה מסוימת

1. מנהל המסד פותח את פרויקט Supabase הנכון ובודק שיש גיבוי. לאחר סקירת השינוי, מריצים פעם אחת את `029_ui_v2_households.sql` דרך SQL Editor. אין להריץ אותו לפני שמיגרציות 026–028 הוחלו.
2. ב־Table Editor פותחים את `households` ומאתרים את המשפחה לפי שמה. מעתיקים את ערך `id` שלה ומוודאים שזו המשפחה הנכונה.
3. פותחים את הטבלה `ui_v2_households`, בוחרים Insert row, מדביקים את המזהה בשדה `household_id`, ואפשר לרשום את שם המבצע בשדה `added_by`. את `added_at` משאירים לערך האוטומטי. שומרים.
4. בני המשפחה צריכים להיכנס מחדש כדי לקבל תוצאה מעודכנת באותה הפעלה. להסרה, מוחקים את השורה של המשפחה מתוך `ui_v2_households` ובני המשפחה נכנסים מחדש. אין למחוק את המשפחה עצמה.

הקוד מפעיל את בדיקת המשפחה רק במקומות שבהם `useNewUi` מחובר. נדרש חיבור ברמת האפליקציה לפני שאפשר להבטיח שהשינוי יופיע בכל המסכים; המיגרציה והוספת שורה לבדן אינן משלימות זאת.

מגבלה נוספת לבדיקה לפני הפעלה: אם לאדם יש חברות ביותר ממשפחה אחת, הבדיקה הנוכחית מזהה כל משפחה מורשית שלו, ולא בהכרח את המשפחה הפעילה בפרופיל. במקרה כזה אין להסתמך עליה עד שההתנהגות תתוקן ותיבדק.
