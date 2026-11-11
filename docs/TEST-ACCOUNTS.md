# חשבונות בדיקה ובדיקת מסלול ראשי / Test accounts and main-flow smoke check

## עברית

חשבון בדיקה הוא משתמש שנועד לבדיקה בלבד. יש להקים סביבת Supabase נפרדת (פרויקט או ענף), כדי שהבדיקה לא תיגע בנתונים של משפחות אמיתיות. הבדיקה המקומית משתמשת בשרת מדומה ובחשבונות דמה קבועים בלבד. היא אינה מאמתת חיבור לשירות אמיתי.

הכנה על ידי בעל המערכת:

1. ליצור פרויקט Supabase נפרד או ענף נפרד, ולהחיל בו את המיגרציות של המאגר. לא להשתמש במסד הנתונים של הייצור.
2. ליצור שני משתמשי בדיקה, חבר ושותף, ולצרף אותם לאותו בית. להשלים הסכמה עדכנית לכל אחד מהם.
3. להגדיר את `SMOKE_MEMBER_EMAIL`, `SMOKE_MEMBER_PASSWORD`, `SMOKE_PARTNER_EMAIL`, `SMOKE_PARTNER_PASSWORD` ב-GitHub repository secrets ובסביבת Preview של Vercel. אין לשמור ערכים בקוד או בפלט.
4. להגדיר `SMOKE_BASE_URL` לכתובת סביבת התצוגה הנפרדת. להוסיף את שלב ה-CI הבא לאחר שמורשית עריכת workflow.

לפני ואחרי פריסת סביבת הבדיקה: להריץ את הבנייה ואז את הבדיקה. בכתובת ייצור הבדיקה נחסמת; עם `SMOKE_ALLOW_PRODUCTION_READONLY=1` היא מוגבלת לכניסה, צפייה ויציאה בלבד. אין להריץ מול ייצור ללא אישור מפורש.

## English

A test account exists only for testing. Create a separate Supabase project or branch so checks cannot touch real households. The local target uses a fake service and fixed fake users; it does not verify real authentication or database behavior.

Owner setup:

1. Create a separate Supabase project or branch and apply this repository's migrations there, never on the production database for this exercise.
2. Create member and partner test users in the same household, with current consent for each.
3. Put `SMOKE_MEMBER_EMAIL`, `SMOKE_MEMBER_PASSWORD`, `SMOKE_PARTNER_EMAIL`, and `SMOKE_PARTNER_PASSWORD` in GitHub repository secrets and the Vercel Preview environment. Never commit their values.
4. Set `SMOKE_BASE_URL` to that isolated preview. Add the CI step below once workflow permissions are available.

Run before and after a preview deployment. Production hostnames are blocked unless `SMOKE_ALLOW_PRODUCTION_READONLY=1`; that mode only signs in, views the app and signs out. Do not run against production without explicit permission.

Local, after installing the lockfile dependencies (Node 22.23 or newer):

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-mock bun run build
node --experimental-strip-types scripts/smoke/run.mjs
```

Remote: export the five variables described above in the process environment, then run `node --experimental-strip-types scripts/smoke/run.mjs`. The preview must have been built against the isolated Supabase environment. Full checks create a task and shopping item there.

Suggested CI snippet (documentation only; no workflow has been changed):

```yaml
- run: bun install --frozen-lockfile
- run: bunx playwright install --with-deps chromium
- run: bun run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54329
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local-mock
- run: node --experimental-strip-types scripts/smoke/run.mjs
```
