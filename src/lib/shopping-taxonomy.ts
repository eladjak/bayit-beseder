/**
 * Shopping taxonomy: categories in store-walk order + a Hebrew keyword
 * dictionary that classifies a free-text item and picks a product icon.
 *
 * Everything here is derived at render time from the item title. Nothing
 * needs to be written back to the database.
 */

export interface TaxonomyCategory {
  id: string;
  /** Canonical display name (used when the household has no row for it) */
  name: string;
  icon: string;
  color: string;
  /** Parent area of the store, used to group the category pickers */
  section: string;
  /** Names of the old default categories that map onto this one */
  aliases: string[];
}

/** Order of this array IS the store-walk order. */
export const TAXONOMY: TaxonomyCategory[] = [
  { id: "veg", name: "ירקות", icon: "🥬", color: "#22C55E", section: "טרי", aliases: [] },
  { id: "fruit", name: "פירות", icon: "🍎", color: "#F97316", section: "טרי", aliases: [] },
  { id: "herbs", name: "עשבי תיבול", icon: "🌿", color: "#84CC16", section: "טרי", aliases: [] },
  { id: "bakery", name: "לחם ומאפים", icon: "🍞", color: "#D97706", section: "מקרר ומאפייה", aliases: ["מאפים ודגנים"] },
  { id: "dairy", name: "חלב וגבינות", icon: "🧀", color: "#FCD34D", section: "מקרר ומאפייה", aliases: ["מוצרי חלב", "חלב"] },
  { id: "eggs", name: "ביצים", icon: "🥚", color: "#FBBF24", section: "מקרר ומאפייה", aliases: [] },
  { id: "meat", name: "בשר, עוף ודגים", icon: "🥩", color: "#EF4444", section: "מקרר ומאפייה", aliases: ["בשר, ביצים ודגים"] },
  { id: "basics", name: "מוצרי בסיס", icon: "🧂", color: "#F59E0B", section: "מזווה", aliases: [] },
  { id: "baking", name: "אפייה", icon: "🎂", color: "#F472B6", section: "מזווה", aliases: ["מצרכים לאפייה"] },
  { id: "grains", name: "דגנים ופסטה", icon: "🍝", color: "#EAB308", section: "מזווה", aliases: [] },
  { id: "legumes", name: "קטניות", icon: "🫘", color: "#A78BFA", section: "מזווה", aliases: ["קטניות ותוספות"] },
  { id: "canned", name: "שימורים", icon: "🥫", color: "#DC2626", section: "מזווה", aliases: [] },
  { id: "sauces", name: "רטבים ומטבלים", icon: "🫕", color: "#16A34A", section: "מזווה", aliases: ["מטבלים ורטבים"] },
  { id: "spreads", name: "ממרחים", icon: "🍯", color: "#78716C", section: "מזווה", aliases: [] },
  { id: "spices", name: "תבלינים", icon: "🌶️", color: "#B45309", section: "מזווה", aliases: [] },
  { id: "nuts", name: "אגוזים ופירות יבשים", icon: "🥜", color: "#92400E", section: "מזווה", aliases: ["אגוזים"] },
  { id: "snacks", name: "חטיפים ומתוקים", icon: "🍬", color: "#EC4899", section: "חטיפים ושתייה", aliases: [] },
  { id: "drinks", name: "משקאות", icon: "🥤", color: "#3B82F6", section: "חטיפים ושתייה", aliases: [] },
  { id: "frozen", name: "קפואים", icon: "🧊", color: "#06B6D4", section: "קפואים", aliases: [] },
  { id: "cleaning", name: "ניקיון וכביסה", icon: "🧹", color: "#60A5FA", section: "הבית", aliases: [] },
  { id: "paper", name: "נייר וחד-פעמי", icon: "🧻", color: "#94A3B8", section: "הבית", aliases: [] },
  { id: "hygiene", name: "היגיינה וטיפוח", icon: "🧴", color: "#C084FC", section: "אישי ומשפחה", aliases: [] },
  { id: "baby", name: "תינוקות", icon: "👶", color: "#F9A8D4", section: "אישי ומשפחה", aliases: [] },
  { id: "health", name: "תרופות ובריאות", icon: "💊", color: "#F87171", section: "אישי ומשפחה", aliases: ["תרופות"] },
  { id: "pets", name: "חיות מחמד", icon: "🐾", color: "#FB923C", section: "אישי ומשפחה", aliases: [] },
  { id: "misc", name: "שונות", icon: "📦", color: "#6B7280", section: "שונות", aliases: [] },
];

const BY_ID = new Map(TAXONOMY.map((c) => [c.id, c]));

/** Generic / legacy names that mean "not really sorted yet" */
/**
 * "שונות" stored by older versions means "nobody sorted this" and is re-filed by name.
 * When a person deliberately chooses "שונות" we store this marker instead, so it is
 * never re-filed. resolveCategory() maps it back to the "שונות" group.
 */
export const MANUAL_MISC = "שונות (ידני)";

/** Category string to persist for a deliberate user choice. */
export function toStoredCategory(name: string): string {
  return name === "שונות" ? MANUAL_MISC : name;
}

export const UNSORTED_CATEGORY_NAMES = new Set(["שונות", "אחר", "מזון", "בית", "כללי"]);

// ---------------------------------------------------------------------------
// Dictionary. Entry syntax: "word/variant/variant:emoji", comma separated.
// Plural / feminine forms are folded by stem(), so only list real variants.
// ---------------------------------------------------------------------------

const DICT: Record<string, string> = {
  veg: `
    עגבניה/עגבנייה:🍅, עגבניות שרי/שרי/עגבניית שרי:🍅, עגבניות מגורדות:🍅, מלפפון:🥒, בצל:🧅, בצל ירוק/בצל סגול/בצל לבן/בצל יבש:🧅,
    שום:🧄, ראש שום:🧄, גזר:🥕, פלפל:🫑, פלפל אדום/פלפל צהוב/פלפל ירוק/גמבה:🫑, פלפל חריף/צילי חריף:🌶️, חסה:🥬, חסה אייסברג/חסה ערבית/חסה רומית:🥬,
    כרוב:🥬, כרוב סגול/כרוב לבן/כרוב ניצנים:🥬, כרובית:🥦, ברוקולי:🥦, תפוח אדמה/תפוחי אדמה/תפוא/תפוצ אדמה:🥔, בטטה:🍠,
    חציל:🍆, קישוא:🥒, דלעת:🎃, דלורית:🎃, תירס טרי/קלח תירס/תירס:🌽, אבוקדו:🥑, פטריה/שמפיניון/פטריות פורטובלו:🍄,
    סלרי:🥬, סלק:🥕, כרישה:🥬, לפת:🥕, צנון/צנונית:🥕, קולרבי:🥬, שומר:🥬, תרד/עלי תרד:🥬, רוקט/ארוגולה:🥬, עלי חסה:🥬,
    אפונה טרייה:🫛, שעועית ירוקה:🫛, במיה:🥬, ארטישוק:🥬, עלי גפן:🥬, נבטים:🌱, סלט מוכן/סלט ירקות/סלט ירוק:🥗, ירקות:🥬,
    ירקות לסלט:🥬, ירק:🥬, בצל קצוץ:🧅, חצילים קלויים:🍆, גזר ננסי:🥕, פלפלונים:🌶️, עגבניות מרוסקות טריות:🍅, ג'ינג'ר טרי:🫚
  `,
  fruit: `
    תפוח:🍎, תפוח עץ:🍎, תפוח עץ ירוק:🍏, בננה:🍌, תפוז:🍊, קלמנטינה:🍊, מנדרינה:🍊, אשכולית:🍊, אשכוליות:🍊, לימון:🍋, ליים:🍋, ענבים/ענב:🍇,
    אבטיח:🍉, מלון:🍈, אגס:🍐, שזיף:🍑, תות:🍓, תות שדה:🍓, קיווי:🥝, מנגו:🥭, אננס:🍍, רימון:🍎, אפרסק:🍑, נקטרינה:🍑,
    דובדבן:🍒, תאנה:🍑, אוכמניות:🫐, פטל:🍓, אפרסמון:🍊, שסק:🍑, גויאבה:🍈, פומלה:🍊, פפאיה:🥭, קוקוס:🥥, משמש:🍑,
    פירות:🍎, פירות העונה:🍎, סלט פירות:🍓, חבילת פירות:🍎, אבטיח קטן:🍉, תפוזים לסחיטה:🍊, לימונים:🍋, בננות:🍌, ענבים אדומים:🍇, ענבים ירוקים:🍇
  `,
  herbs: `
    כוסברה:🌿, פטרוזיליה:🌿, שמיר:🌿, נענע:🌱, בזיליקום:🌿, רוזמרין:🌿, טימין:🌿, עירית:🌱, מרווה:🌿, אורגנו טרי:🌿,
    לואיזה:🌿, עשבי תיבול:🌿, עשבים:🌿, עלי בזיליקום:🌿, עלי נענע:🌱, תימין:🌿, מנטה:🌱, עלי דפנה טריים:🌿, לימונית:🌿, טרגון:🌿
  `,
  bakery: `
    לחם:🍞, לחם אחיד/לחם מלא/לחם פרוס/לחם קל/לחם לבן/לחם טוסט/לחם שיפון/לחם כוסמין/לחם דגנים/לחם בגט:🍞, חלה:🍞, פיתה:🫓, לחמניה:🥖,
    באגט/בגט:🥖, בייגלה:🥨, בייגל:🥨, קרואסון:🥐, רוגלך:🥐, עוגה:🍰, עוגת שוקולד/עוגת גבינה/עוגת תפוחים/עוגת יום הולדת:🍰,
    מאפה:🥐, מאפים:🥐, דונאט:🍩, טורטייה/טורטיה:🫓, לאפה:🫓, לחמניות המבורגר/לחמניות המבורגר:🍔, פרוסות טוסט:🍞,
    מאפינס/מאפין:🧁, קרקר:🍘, קרקרים:🍘, פריכיות:🍘, לחמניות:🥖, לחם קמח מלא:🍞, בייגלה מלוח:🥨, מצות:🍘, מצה:🍘, לחם בית:🍞, ג'בטה:🍞, צ'ה בטה:🍞, פוקאצ'ה:🍞,
    רולים:🥐, סופגניה:🍩, סופגניות:🍩, בורקס טרי:🥐, מלאווח טרי:🫓, עוגיות שמרים:🥐, קרם בריולה:🍮
  `,
  dairy: `
    חלב:🥛, חלב עיזים:🥛, חלב שקדים:🥛, חלב סויה:🥛, חלב שיבולת שועל:🥛, חלב אורז:🥛, חלב מועשר:🥛, חלב מרוכז:🥛, חלב עמיד:🥛, שוקו:🥛, שוקו שטראוס:🥛,
    גבינה:🧀, גבינות:🧀, גבינה צהובה/גבינה לבנה/גבינה בולגרית/גבינת שמנת/גבינת עיזים/גבינה מלוחה:🧀, קוטג:🥛, קוטג תנובה:🥛,
    שמנת:🥛, שמנת מתוקה/שמנת חמוצה/שמנת לבישול/שמנת לקצפת/קצפת:🥛, יוגורט:🥛, יוגורט יווני/יוגורט טבעי/יוגורט פירות:🥛,
    מעדן:🍮, מעדני חלב:🍮, מילקי:🍮, דנונה:🥛, חמאה:🧈, חמאה מלוחה:🧈, מרגרינה:🧈, לבן:🥛, לבנה:🥛, קפיר:🥛, שמנת צמחית:🥛,
    קשקבל:🧀, מוצרלה:🧀, פרמזן:🧀, פטה:🧀, ריקוטה:🧀, מסקרפונה:🧀, גאודה:🧀, עמק:🧀, ברי:🧀, קממבר:🧀, צפתית:🧀, חלומי:🧀,
    גבינה מגורדת:🧀, גבינת פטה:🧀, גבינה פרוסה:🧀, גבינה קשה:🧀, גבינה מלוחה:🧀, גבינה גאודה:🧀, גבינת קוטג:🥛, אשל:🥛, מעדן שוקולד:🍮,
    פודינג:🍮, פנקוטה:🍮, יוגורט שתייה:🥛, לאבנה:🥛, גבינה כחולה:🧀, גורגונזולה:🧀, גבינת פרמזן:🧀, בולגרית:🧀, גבינה עמק:🧀, פרוסות גבינה:🧀,
    תנובה:🥛, טרה:🥛, שטראוס:🥛, יטבתה:🥛
  `,
  eggs: `
    ביצה:🥚, ביצי חופש:🥚, ביצים אורגניות:🥚, ביצי שליו:🥚, ביצים L:🥚, ביצים M:🥚, תבנית ביצים:🥚, חלמון:🥚, ביצה קשה:🥚, חלבון ביצה:🥚
  `,
  meat: `
    עוף:🍗, עוף שלם:🍗, חזה עוף:🍗, שוק עוף/שוקיים/ירכיים:🍗, כנפיים:🍗, כנפי עוף:🍗, שניצל:🍗, שניצל עוף:🍗, כבד:🥩, כבד עוף:🍗, לב עוף:🍗, פרגיות:🍗, פרגית:🍗,
    נקניק:🌭, נקניקיה:🌭, נקניקיות:🌭, בשר:🥩, בשר טחון:🥩, בקר:🥩, סטייק:🥩, אנטריקוט:🥩, צלעות:🥩, צלעות טלה:🥩, קבב:🥩, המבורגר:🍔,
    כבש:🥩, טלה:🥩, הודו:🍗, חזה הודו:🍗, פסטרמה:🥩, סלמי:🥩, בייקון:🥓, פפרוני:🍕, סלמון:🐟, דג:🐟, פילה דג:🐟, דגים:🐟,
    דניס:🐟, לברק:🐟, פורל:🐟, אמנון:🐟, נסיכת הנילוס:🐟, בורי:🐟, מושט:🐟, שרימפס:🦐, קלמרי:🦑, פילה:🥩, צ'יפס עוף:🍗,
    גפילטע:🐟, הרינג:🐟, לוקוס:🐟, קרפיון:🐟, טופו:🥡, סייטן:🥡, תחליפי בשר:🥡, שווארמה:🥙, שווארמה הודו:🥙, שיפודים:🍢, שיפוד:🍢,
    אסאדו:🥩, ריבס:🍖, צלי כתף:🥩, חזה בקר:🥩, עוף טוב:🍗, זוגלובק:🍗, טירת צבי:🥩, ירכי עוף:🍗, ירך עוף:🍗, חזה עוף טחון:🍗, המבורגרים:🍔, קציצות:🥩,
    עוף מבושל:🍗, כרעיים:🍗, גולש:🥩, נתחי עוף:🍗, בשר לצלי:🥩, פילה סלמון:🐟, פילה אמנון:🐟, סלמון מעושן:🐟, טונה טרייה:🐟, קוביות בשר:🥩
  `,
  basics: `
    שמן:🫙, שמן זית:🫒, שמן קנולה:🫙, שמן חמניות:🫙, שמן קוקוס:🥥, שמן שומשום:🫙, שמן ספריי:🫙, מלח:🧂, מלח גס:🧂, מלח ים:🧂, סוכר:🧂,
    סוכר חום:🧂, קמח:🌾, קמח מלא:🌾, קמח לבן:🌾, קמח שקדים:🌾, קמח כוסמין:🌾, ממתיק:🧂, סוכרזית:🧂, סטיביה:🧂, פירורי לחם:🍞, פנקו:🍞,
    קורנפלור:🌽, עמילן:🌽, עמילן תירס:🌽, אבקת מרק:🍲, מרק:🍲, מרק עוף:🍲, מרק אבקה:🍲, סוכר דק:🧂, סוכר לבן:🧂, מלח שולחן:🧂
  `,
  baking: `
    אבקת אפייה/אבקת אפיה/אפיה:🥄, סודה לשתייה:🥄, שמרים:🍞, שמרים יבשים:🍞, וניל:🍶, תמצית וניל:🍶, סוכר וניל:🍶, קקאו:🍫, אבקת קקאו:🍫, שוקולד צ'יפס:🍫,
    שוקולד לבישול:🍫, שוקולד לאפייה:🍫, פתיתי שוקולד:🍫, קוקוס מגורד:🥥, אבקת סוכר:🍬, קמח תופח:🌾, ג'לטין:🍮, אבקת פודינג:🍮, תמצית:🍶,
    צבע מאכל:🎨, מרציפן:🍬, סוכריות לקישוט:🍬, סוכר מצופה:🍬, קרם פטיסייר:🍮, קרם קוקוס:🥥, חלב מרוכז ממותק:🥛, שוקולד מריר לאפייה:🍫, אבקת קפה לאפייה:☕, פנקייק:🥞, אבקת פנקייק:🥞, תערובת לעוגה:🎂
  `,
  grains: `
    אורז:🍚, אורז בסמטי:🍚, אורז פרסי:🍚, אורז מלא:🍚, אורז יסמין:🍚, אורז עגול:🍚, פסטה:🍝, ספגטי:🍝, פנה:🍝, פוזילי:🍝, פטוצ'יני:🍝, לזניה:🍝,
    דפי לזניה:🍝, אטריות:🍜, אטריות אורז:🍜, נודלס:🍜, אטריות ביצים:🍜, קוסקוס:🍚, בורגול:🌾, קינואה:🌾, כוסמת:🌾, פתיתים:🍚, קורנפלקס:🥣, גרנולה:🥣,
    שיבולת שועל:🥣, קוואקר:🥣, דגני בוקר:🥣, דגנים:🌾, מוזלי:🥣, סולת:🌾, פולנטה:🌽, כוסמין:🌾, שעורה:🌾, פריקה:🌾, אורז אדום:🍚, ג'ירית:🌾,
    דגני בוקר שוקולד:🥣, חטיפי דגנים:🥣, אורז בר:🍚, דייסה:🥣, דייסת שיבולת שועל:🥣, קוסקוס פרלים:🍚, ספגטי מלא:🍝, מקרוני:🍝, אנג'ל הייר:🍝, סוגת:🍚
  `,
  legumes: `
    חומוס יבש:🫘, גרגירי חומוס:🫘, חומוס גרגירים:🫘, חומוס:🫘, עדשים:🫘, עדשים אדומות:🫘, עדשים שחורות:🫘, עדשים ירוקות:🫘, שעועית:🫘, שעועית לבנה:🫘,
    שעועית אדומה:🫘, שעועית שחורה:🫘, פול:🫘, אפונה יבשה:🫘, אפונה:🫘, סויה יבשה:🫘, שעועית מש:🫘, פולי סויה:🫘, אדממה:🫛, אפונה שבורה:🫘, פולי מאש:🫘, עדשים כתומות:🫘
  `,
  canned: `
    טונה:🐟, טונה בשמן:🐟, טונה במים:🐟, תירס שימורים:🌽, שימורי תירס:🌽, תירס מתוק:🌽, זיתים:🫒, זית:🫒, זיתים ירוקים:🫒, זיתים שחורים:🫒,
    מלפפון חמוץ:🥒, מלפפונים חמוצים:🥒, חמוצים:🥒, כרוב כבוש:🥬, כבושים:🥒, רסק עגבניות:🍅, רסק:🍅, עגבניות מרוסקות:🥫, עגבניות מקולפות:🥫, עגבניות מגוררות:🥫,
    שעועית בשימורים:🫘, שימורי שעועית:🫘, חומוס בשימורים:🫘, אפרסקים בשימורים:🍑, שימורי פירות:🍑, אננס בשימורים:🍍, סרדינים:🐟, פטריות בשימורים:🍄,
    לבבות דקל:🥫, ארטישוק שימורים:🥫, מלפפוני בייבי:🥒, פלפלים צלויים:🫑, עלי גפן ממולאים:🥬, קופסת שימורים:🥫, שימורים:🥫, קונסרבה:🥫, פטריות שימורים:🍄,
    תירס בשימורים:🌽, מיונז קופסה:🥫, חצילים כבושים:🍆, פלפל חריף כבוש:🌶️, זיתים במילוי:🫒, אנשובי:🐟, פירה מוכן:🥔, מרק קופסה:🥫, טחינה קופסה:🥫, חומוס קופסה:🫘, שעועית קופסה:🫘, תירס קופסה:🌽
  `,
  sauces: `
    קטשופ:🍅, חרדל:💛, מיונז:🫙, רוטב סויה:🥢, סויה:🥢, חומץ:🫙, חומץ בלסמי:🫙, חומץ תפוחים:🫙, חומץ יין:🫙, רוטב צילי:🌶️, סריראצה:🌶️,
    סלסה:🍅, פסטו:🌿, רוטב עגבניות:🍅, רוטב לפסטה:🍅, רוטב:🫕, רוטב סלט:🥗, ויניגרט:🥗, טריאקי:🥢, ברביקיו:🍖, רוטב ברביקיו:🍖,
    חריף:🌶️, שום כתוש:🧄, חומוס מוכן:🫘, סלט חצילים:🍆, מטבל:🫕, גוואקמולה:🥑, טחינה:🫙, טחינה גולמית:🫙, טחינה מלאה:🫙,
    רוטב פיצה:🍕, רוטב בולונז:🍅, רוטב שמנת:🫕, צזיקי:🥒, מטבל חצילים:🍆, מיונז קל:🫙, חרדל דיז'ון:💛, רוטב בלסמי:🫙, רוטב חמוץ מתוק:🫕, רוטב צ'ילי מתוק:🌶️,
    רוטב וורצסטר:🫕, חריף תימני:🌶️, סחוג:🌶️, חריימה:🌶️, רוטב פסטו:🌿, טפנד:🫒, רוטב אגוזים:🫕, שמנת לפסטה:🫕, חומוס אחוה:🫘, צלפים:🫒
  `,
  spreads: `
    שוקולד למריחה:🍫, נוטלה:🍫, חמאת בוטנים:🥜, חמאת שקדים:🥜, דבש:🍯, ריבה:🍓, סילאן:🍯, ממרח גבינה:🧀, ממרח:🫙,
    ממרח שוקולד:🍫, ריבת תות:🍓, ריבת חלב:🍮, ריבת אפרסק:🍑, ריבת משמש:🍑, מרמלדה:🍊, דבש תמרים:🍯, ממרח אגוזים:🥜, קרם שוקולד:🍫, שוקולד נוטלה:🍫, ממרח חומוס:🫘, ממרח חצילים:🍆, ממרח סויה:🫙, ממרח בוטנים:🥜, אחוה:🍬, יד מרדכי:🍯
  `,
  spices: `
    פלפל שחור:🌶️, פלפל לבן:🌶️, פפריקה:🌶️, פפריקה מעושנת:🌶️, כמון:🌿, כורכום:🌿, קינמון:🍂, אורגנו:🌿, הל:🌿, זעתר:🌿, אבקת שום:🧄, אבקת בצל:🧅,
    בהרט:🌿, ג'ינג'ר:🫚, זנגביל:🫚, כוסברה טחונה:🌿, קארי:🌿, אגוז מוסקט:🌰, ציפורן:🌿, עלי דפנה:🌿, תבלין:🌶️, תבלין לעוף:🌶️, תבלין לבשר:🌶️,
    תערובת תבלינים:🌶️, ראס אל חנות:🌿, חוויאג:🌿, פלפל קאיין:🌶️, זעפרן:🌿, צילי יבש:🌶️, חילבה:🌿, סומאק:🌿, שום גבישי:🧄, פפריקה חריפה:🌶️,
    כמון טחון:🌿, כורכום טחון:🌿, תבלין לדגים:🌶️, תבלין לפיצה:🌶️, מלח שום:🧂, קינמון טחון:🍂, וניל מקל:🍶, אניס:🌿, שמיר יבש:🌿, פלפל אנגלי:🌶️, מרווה יבשה:🌿, קורנדר:🌿,
    תבלין שווארמה:🌶️, תבלין שניצל:🌶️, תבלין שקשוקה:🌶️, תבלין עוגה:🌿, זרעי שומשום:🌿, שומשום:🌿, זרעי פשתן:🌿, זרעי צ'יה:🌿, צ'יה:🌿, פשתן:🌿
  `,
  nuts: `
    אגוזי מלך:🥜, אגוז:🥜, אגוזים:🥜, שקדים:🥜, בוטנים:🥜, קשיו:🥜, פקאן:🥜, פיסטוק:🥜, אגוזי ברזיל:🥜, אגוזי לוז:🥜, צנוברים:🥜, גרעינים:🌻,
    גרעיני חמניה:🌻, גרעיני דלעת:🎃, פיצוחים:🥜, צימוקים:🍇, תמרים:🌴, תמר:🌴, משמש מיובש:🍑, פירות יבשים:🍑, חמוציות:🍒, תאנים מיובשות:🍑, אגוזי פקאן:🥜,
    שקדים קלויים:🥜, בוטנים קלויים:🥜, מיקס אגוזים:🥜, תערובת אגוזים:🥜, שזיפים מיובשים:🍑, חמוציות מיובשות:🍒, מנגו מיובש:🥭, בננה מיובשת:🍌, תמרי מג'הול:🌴, תמרים מג'הול:🌴, גרעיני דלעת קלויים:🎃, גרעיני אבטיח:🍉
  `,
  snacks: `
    שוקולד:🍫, שוקולד מריר:🍫, שוקולד חלב:🍫, שוקולד לבן:🍫, חטיף:🍫, חטיפים:🍫, במבה:🥜, ביסלי:🍟, צ'יפס שקית:🍟, תפוצ'יפס:🍟, דוריטוס:🌮,
    פרינגלס:🍟, צ'יטוס:🍟, פופקורן:🍿, סוכריות:🍬, סוכרייה:🍬, עוגיות:🍪, ביסקוויט:🍪, ביסקוויטים:🍪, פתי בר:🍪, ופלים:🧇, וופל:🧇, גומי:🍬, גומיות:🍬,
    מסטיק:🍬, מנטוס:🍬, מרשמלו:🍬, אלפחור:🍪, אלפחורים:🍪, קרמבו:🍫, קינדר:🍫, מילקה:🍫, פסק זמן:🍫, עלית:🍫, ממתק:🍬, ממתקים:🍬, חטיף אנרגיה:🍫,
    חטיף חלבון:🍫, חטיף דגנים:🍫, קליק:🍫, שוקולד פרה:🍫, טובלרון:🍫, מגנום:🍦, שוקולית:🍫, פריכיות אורז:🍘, סוכריות על מקל:🍭, סוכריות גומי:🍬, צ'ופר:🍬,
    חטיף תירס:🌽, חטיף שוקולד:🍫, חטיפי בוטנים:🥜, אפרופו:🍫, מקופלת:🍬, חלווה:🍬, עוגיות שוקולד צ'יפס:🍪, עוגיות חמאה:🍪, שקדי מרק:🍪, ביסקוויט פתי בר:🍪
  `,
  drinks: `
    מים:💧, מים מינרלים:💧, מים בטעמים:💧, סודה:🥤, מיץ:🧃, מיץ תפוזים:🧃, מיץ תפוחים:🧃, מיץ ענבים:🧃, מיץ גזר:🧃, מיץ רימונים:🧃, פריגת:🧃, קולה:🥤,
    קוקה קולה:🥤, פפסי:🥤, ספרייט:🥤, פנטה:🥤, שוופס:🥤, בירה:🍺, יין:🍷, יין אדום:🍷, יין לבן:🍷, וודקה:🍸, ויסקי:🥃, ערק:🥃, ליקר:🍸, קפה:☕, קפה נמס:☕,
    קפה טורקי:☕, קפה שחור:☕, נספרסו:☕, קפסולות:☕, קפסולות קפה:☕, תה:🍵, תה ירוק:🍵, תה נענע:🍵, שקיות תה:🍵, חליטה:🍵, לימונדה:🍋, משקה אנרגיה:⚡, רד בול:⚡,
    איסטי:🧃, אבקת משקה:🥤, סירופ:🥤, סירופ פירות:🥤, נקטר:🧃, קפה קר:🧋, פחיות:🥤, אלכוהול:🥃, שמפניה:🍾, קרח:🧊, מי סודה:🥤, סודה סטרים:🥤, מים מוגזים:💧,
    משקה:🥤, משקאות:🥤, ספרינג:🥤, מי עדן:💧, נביעות:💧, פיוז טי:🧃, מיץ פרי:🧃, קפה אספרסו:☕, קפה פילטר:☕, קפה הפוך:☕, ויסוצקי:🍵, בירה גולדסטאר:🍺, בירה מכבי:🍺, בירה קורונה:🍺, יין מבעבע:🍾, פרוסקו:🍾, קפה עלית:☕, קפה בוטיק:☕, קפה בקפסולות:☕, מים בטעם:💧, שייק:🥤, קפה נמס עלית:☕, אספרסו:☕, קפה עלית:☕
  `,
  frozen: `
    גלידה:🍦, ארטיק:🍦, ארטיקים:🍦, סורבה:🍧, ירקות קפואים:🥦, פיצה קפואה:🍕, פיצה:🍕, בורקס:🥟, בורקסים:🥟, שניצל קפוא:🍗, נאגטס:🍗, אפונה קפואה:🫛,
    תירס קפוא:🌽, צ'יפס:🍟, צ'יפס קפוא:🍟, בצק עלים:🥐, בצק פילו:🥐, בצק פריך:🥐, ג'חנון:🥟, מלוואח:🫓, קובה:🥟, כופתאות:🥟, סושי:🍣, פלאפל קפוא:🧆,
    עלי בצק:🥐, בצק קפוא:🥟, פרי גליל:🧊, ירקות מוקפאים:🥦, פירות קפואים:🍓, תותים קפואים:🍓, אפונה וגזר:🥦, פירה קפוא:🥔, קפוא:🧊, ארוחה קפואה:🍽️, לביבות:🥔, לביבות תפוחי אדמה:🥔, פופסיקל:🍦, גלידת וניל:🍦, גלידת שוקולד:🍦, קרטיב:🍧
  `,
  cleaning: `
    סבון כלים:🧴, נוזל כלים:🧴, פיירי:🧴, אקונומיקה:🧴, מרכך כביסה:🧺, מרכך:🧺, אבקת כביסה:🧺, נוזל כביסה:🧺, ג'ל כביסה:🧺, כדורי כביסה:🧺, קפסולות כביסה:🧺,
    אבקת מדיח:🧼, טבליות מדיח:🧼, מלח למדיח:🧼, מבריק מדיח:🧼, מנקה:🧴, מנקה חלונות:🧴, ספריי לחלונות:🧴, נוזל רצפה:🧴, מנקה רצפות:🧴, מסיר שומנים:🧴,
    מנקה אסלה:🚽, טבליות אסלה:🚽, סנו:🧴, מסיר אבנית:🧴, ספוג:🧽, ספוגים:🧽, סקוטש:🧽, מטלית:🧽, מטליות:🧽, מטאטא:🧹, יעה:🧹, מגב:🧹, דלי:🪣, כפפות:🧤,
    כפפות גומי:🧤, שקיות אשפה:🗑️, שקית אשפה:🗑️, שקיות זבל:🗑️, מטהר אוויר:🌸, ספריי ריח:🌸, מחסל חרקים:🪰, חומר הדברה:🪰, אבקת ניקוי:🧴, חומר ניקוי:🧴,
    מגבוני ניקוי:🧻, כביסה:🧺, ניקוי:🧴, סבון כביסה:🧺, מסיר כתמים:🧴, מרכך אבקה:🧺, ג'ל לשירותים:🚽, אקונומיקה סנו:🧴, נוזל לכיור:🧴, ספריי לניקוי:🧴, סבון נוזלי לכלים:🧴, מטהר:🌸, בושם לכביסה:🧺, חומץ לניקוי:🧴, מגבונים לרצפה:🧻, מברשת:🧹, מברשת שירותים:🚽, צבת:🧹, מטאטא ויעה:🧹, שואב אבק:🧹, שקיות לשואב:🧹
  `,
  paper: `
    נייר טואלט:🧻, נייר מגבת:🧻, מגבות נייר:🧻, מפיות:🧻, מפית:🧻, טישו:🧻, טישיו:🧻, קלינקס:🧻, נייר אלומיניום:🍽️, נייר כסף:🍽️, אלומיניום:🍽️, נייר אפייה:🧻,
    ניילון נצמד:🛍️, שקיות ג'יפלוק:🛍️, שקיות זיפלוק:🛍️, שקיות פריזר:🛍️, שקיות קשירה:🛍️, שקיות לכריכים:🛍️, צלחות:🍽️, צלחות חד פעמי:🍽️,
    כוסות:🥤, כוסות חד פעמי:🥤, סכום חד פעמי:🍴, סכו"ם חד פעמי:🍴, מזלגות:🍴, כפיות:🍴, קשיות:🥤, מגש אלומיניום:🍽️, תבניות אלומיניום:🍽️, מפת נייר:🧻, מפה חד פעמית:🧻,
    שקיות:🛍️, נייר סנדוויץ:🧻, נייר דבק:🧻, שקיות פלסטיק:🛍️, חד פעמי:🍽️, מפיות נייר:🧻, מגש חד פעמי:🍽️, סכינים חד פעמי:🍴, קופסאות חד פעמי:🍽️, בקבוקי שתייה:🥤, אריזות:🛍️, סרט הדבקה:🧻
  `,
  hygiene: `
    שמפו:🧴, מרכך שיער:🧴, סבון ידיים:🧼, סבון:🧼, סבון גוף:🧼, ג'ל רחצה:🧼, משחת שיניים:🪥, מברשת שיניים:🪥, חוט דנטלי:🦷, חוט שיניים:🦷, שטיפת פה:🦷,
    דאודורנט:🧴, קרם:🧴, קרם ידיים:🧴, קרם פנים:🧴, קרם לחות:🧴, קרם הגנה:🧴, קרם שיזוף:🧴, תחבושות היגייניות:🌸, טמפונים:🌸, פדים:🌸, מגבונים:🧻, מגבונים לחים:🧻,
    סכיני גילוח:🪒, סכין גילוח:🪒, קצף גילוח:🪒, מכונת גילוח:🪒, מקלות אוזניים:🧴, צמר גפן:☁️, איפור:💄, מייק אפ:💄, לק:💅, מסיר לק:💅, בושם:🧴, ספריי לשיער:💇, ג'ל לשיער:💇,
    צבע לשיער:💇, מסרק:💇, גומיות לשיער:🎀, נוזל עדשות:👁️, סבון פנים:🧼, תחבושת היגיינית:🌸, מסכה לפנים:🧖, שפתון:💄, אודם:💄, מסקרה:💄, מגבת:🧖, אחרי שמש:🧴, שמן גוף:🧴, שמן שיער:🧴, ווקס:🪒, מסיר איפור:🧴, אפטר שייב:🧴, מברשת שיער:💇, גופיות ניקוי:🧼, ספוג רחצה:🧽, ג'ל שיער:💇, שמפו אנטי קשקשים:🧴, קולגייט:🪥, אורל בי:🪥, דאב:🧼, לוקס:🧼, הד אנד שולדרס:🧴, גילט:🪒
  `,
  baby: `
    חיתולים:👶, חיתול:👶, טיטולים:👶, האגיס:👶, פמפרס:👶, מגבוני תינוקות:👶, מגבונים לתינוקות:👶, תמל:🍼, תמ"ל:🍼, תחליף חלב:🍼, אבקת חלב לתינוקות:🍼, סימילאק:🍼,
    נוטרילון:🍼, מטרנה:🍼, בקבוק:🍼, בקבוקים:🍼, מוצץ:🍼, דייסה לתינוק:🥣, דייסה לתינוקות:🥣, מחית:🥣, מחית פירות:🥣, מחית ירקות:🥣, מחית תפוחים:🥣, בייבי:👶, שמפו תינוקות:🧴, קרם החתלה:🧴,
    משחת החתלה:🧴, מזון תינוקות:🍼, אוכל לתינוקות:🍼, תינוק:👶, תינוקות:👶, פורמולה:🍼, בקבוקי הנקה:🍼, פד הנקה:🍼, מחזיק מוצץ:🍼, ביסקוויט תינוקות:🍪, שמן תינוקות:🧴, אמבט תינוקות:🛁, מגבון לחה לתינוק:👶, אבקת תינוקות:🍼, חיתולי בד:👶, חיתולי שחייה:👶, ביגוד תינוק:👶, גופיית תינוק:👶
  `,
  health: `
    אקמול:💊, נורופן:💊, אדוויל:💊, דקסמול:💊, אספירין:💊, ויטמין:💊, ויטמינים:💊, ויטמין c:💊, ויטמין d:💊, אומגה 3:💊, אומגה:💊, פרוביוטיקה:💊, מגנזיום:💊, פלסטר:🩹, פלסטרים:🩹,
    תחבושת:🩹, אלכוג'ל:🧴, אלכוהול רפואי:🧴, מדחום:🌡️, מד חום:🌡️, טיפות עיניים:💧, משחה:💊, משחת:💊, סירופ שיעול:💊, תרופה:💊, תרופות:💊, מרשם:💊, כדורים:💊, אנטיביוטיקה:💊,
    אנטיהיסטמין:💊, אלרג'ין:💊, קלריטין:💊, טבליות:💊, מסכה:😷, מסכות:😷, בדיקת קורונה:🧪, בדיקת הריון:🧪, קונדומים:💊, חומר חיטוי:🧴, גזה:🩹, ויטמין ב:💊, ברזל:💊, סידן:💊,
    אבקת חלבון:💪, תוסף:💊, תוספי תזונה:💊, כדורי שינה:💊, מלטונין:💊, טיפות אוזניים:💧, אינהלר:💊, מי מלח:💧, משחת שיניים לרגישות:🪥, קרם לפצעים:🩹, ספריי לגרון:💊, לכי נעים:💊, סירופ לילדים:💊, נוגד כאבים:💊, כדורי הרגעה:💊
  `,
  pets: `
    אוכל לחתולים:🐱, אוכל לכלבים:🐕, אוכל לחיות:🐾, אוכל לחתול:🐱, אוכל לכלב:🐕, חול לחתולים:🐱, חול לארגז:🐱, חול לחתול:🐱, חול:🐱, חטיפים לכלבים:🦴, חטיפים לחיות:🦴,
    עצם לכלב:🦴, שמפו לכלבים:🐕, רצועה:🐕, צעצוע לכלב:🐕, מזון לציפורים:🐦, מזון לדגים:🐟, קערה לחתול:🐱, כלב:🐕, כלבים:🐕, חתול:🐱, חתולים:🐱, פינוק לחתול:🐱, פינוק לכלב:🐕,
    ארגז חול:🐱, מזון לכלב:🐕, מזון לחתול:🐱, מזון לחיות:🐾, קרם נגד פרעושים:🐕, קולר:🐕, שקיות לצואה:🐕, עצמות לעיסה:🦴, צעצוע לחתול:🐱, מזון יבש לחתול:🐱, מזון יבש לכלב:🐕, ויסקאס:🐱, פדיגרי:🐕, חטיף לחתול:🐱, שקית אוכל לכלב:🐕
  `,
  misc: `
    נורות:💡, נורה:💡, סוללות:🔋, סוללה:🔋, נרות:🕯️, נר:🕯️, נרות שבת:🕯️, נר שבת:🕯️, גפרורים:🔥, מצית:🔥, מטען:🔌, דבק:🧴, סלוטייפ:📎, עטים:🖊️, עט:🖊️, מחברת:📓,
    כרטיס ברכה:💌, מתנה:🎁, עציץ:🪴, פרחים:💐, בלונים:🎈, קלפים:🃏, נייר צבעוני:📄, שקית מתנה:🎁, נייר עטיפה:🎁, תיק:👜, מטריה:☂️, מגבת ים:🏖️, צעצוע:🧸,
    משחק:🎲, פאזל:🧩, בטריות:🔋, מאוורר:🌀, פח:🗑️, מנורה:💡, תבנית:🍽️, סיר:🍳, מחבת:🍳, סכין:🔪, צלחת:🍽️, קופסה:📦, קופסת אחסון:📦, קלסר:📎, מדבקות:🏷️
  `,
};

/** Whole-word overrides, checked before stemming ("חלבה" must not stem into "חלב"). */
const EXACT: Record<string, string> = {
  חלבה: "spreads:🍬",
  חלווה: "spreads:🍬",
  סביח: "bakery:🥙",
};

/** Weak signals: only used if nothing else matched. */
const BRANDS: Record<string, string> = {
  תנובה: "dairy", טרה: "dairy", שטראוס: "dairy", יטבתה: "dairy", גד: "dairy",
  אסם: "basics", אוסם: "basics", עלית: "snacks", סוגת: "grains", זוגלובק: "meat", "עוף טוב": "meat",
  "פרי גליל": "frozen", "יד מרדכי": "spreads", אחוה: "spreads", ויסוצקי: "drinks", "מי עדן": "drinks",
  נביעות: "drinks", "קוקה קולה": "drinks", פפסי: "drinks", שוופס: "drinks", ספרינג: "drinks",
  סנו: "cleaning", פיירי: "cleaning", האגיס: "baby", פמפרס: "baby", דאב: "hygiene", לוקס: "hygiene",
  קולגייט: "hygiene", "אורל בי": "hygiene", גילט: "hygiene", "הד אנד שולדרס": "hygiene",
};

/** Modifiers that override the product itself ("שניצל קפוא" is frozen). */
const MODIFIERS: Record<string, string> = {
  קפוא: "frozen", קפואה: "frozen", קפואים: "frozen", קפואות: "frozen",
  שימורים: "canned", בשימורים: "canned", שימורי: "canned",
  "חד פעמי": "paper", "חד פעמית": "paper", "חד פעמיים": "paper", "חד פעמיות": "paper",
  לתינוקות: "baby", לתינוק: "baby", תינוקות: "baby", לבייבי: "baby",
  לכלבים: "pets", לכלב: "pets", לחתולים: "pets", לחתול: "pets", לחיות: "pets", לציפורים: "pets",
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const FINAL_LETTERS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

function stemToken(tok: string): string {
  let t = tok;
  if (t.length > 4 && (t.endsWith("ים") || t.endsWith("ות"))) {
    t = t.slice(0, -2);
  } else if (t.length > 3 && t.endsWith("ה")) {
    t = t.slice(0, -1);
  }
  const last = t[t.length - 1];
  if (last && FINAL_LETTERS[last]) t = t.slice(0, -1) + FINAL_LETTERS[last];
  return t;
}

/** Tokens of a title after stripping niqqud, quotes, digits and plural endings. */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/["'`´׳״“”‘’]/g, "")
    .replace(/[^א-תa-z\s]/g, " ");
  return cleaned.split(/\s+/).filter(Boolean).map(stemToken);
}

function rawWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/["'`´׳״“”‘’]/g, "")
    .replace(/[^א-תa-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function stripPrefix(tok: string): string {
  return tok.length > 3 && "הולבמשכ".includes(tok[0]) ? tok.slice(1) : tok;
}

interface Entry {
  catId: string;
  emoji: string;
  label: string;
}

const INDEX = new Map<string, Entry>();
const MOD_INDEX = new Map<string, string>();
const BRAND_INDEX = new Map<string, string>();
let MAX_NGRAM = 1;
export const DICTIONARY_DUPLICATES: string[] = [];

function addEntry(key: string, entry: Entry, store: Map<string, Entry>) {
  const existing = store.get(key);
  if (existing) {
    if (existing.catId !== entry.catId) DICTIONARY_DUPLICATES.push(`${key}: ${existing.catId} vs ${entry.catId}`);
    return;
  }
  store.set(key, entry);
}

for (const [catId, raw] of Object.entries(DICT)) {
  const cat = BY_ID.get(catId);
  if (!cat) throw new Error(`unknown taxonomy id ${catId}`);
  for (const chunk of raw.split(",")) {
    const piece = chunk.trim();
    if (!piece) continue;
    const colon = piece.lastIndexOf(":");
    const words = colon === -1 ? piece : piece.slice(0, colon);
    const emoji = colon === -1 ? cat.icon : piece.slice(colon + 1).trim() || cat.icon;
    for (const variant of words.split("/")) {
      const label = variant.trim();
      if (!label) continue;
      const key = tokenize(label).join(" ");
      if (!key) continue;
      MAX_NGRAM = Math.max(MAX_NGRAM, key.split(" ").length);
      addEntry(key, { catId, emoji, label }, INDEX);
    }
  }
}
for (const [word, catId] of Object.entries(MODIFIERS)) MOD_INDEX.set(tokenize(word).join(" "), catId);
for (const [word, catId] of Object.entries(BRANDS)) BRAND_INDEX.set(tokenize(word).join(" "), catId);

export const DICTIONARY_SIZE = INDEX.size;

export interface DictionaryLabel {
  label: string;
  emoji: string;
  categoryId: string;
}

/** Every distinct item name in the dictionary (for autocomplete). */
export function listDictionaryLabels(): DictionaryLabel[] {
  const seen = new Set<string>();
  const out: DictionaryLabel[] = [];
  for (const entry of INDEX.values()) {
    if (seen.has(entry.label)) continue;
    seen.add(entry.label);
    out.push({ label: entry.label, emoji: entry.emoji, categoryId: entry.catId });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export interface Classification {
  categoryId: string;
  categoryName: string;
  emoji: string;
  matched: string;
  via: "modifier" | "phrase" | "token" | "substring" | "brand";
}

function findNgram<T>(tokens: string[], store: Map<string, T>, maxN: number): { value: T; key: string } | null {
  for (let n = Math.min(maxN, tokens.length); n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const key = tokens.slice(i, i + n).join(" ");
      const value = store.get(key);
      if (value !== undefined) return { value, key };
    }
  }
  return null;
}

export function classifyItem(title: string): Classification | null {
  if (!title || !title.trim()) return null;
  const tokens = tokenize(title);
  if (tokens.length === 0) return null;

  for (const raw of rawWords(title)) {
    const hit = EXACT[raw];
    if (hit) {
      const [id, emoji] = hit.split(":");
      const cat = BY_ID.get(id)!;
      return { categoryId: cat.id, categoryName: cat.name, emoji, matched: raw, via: "token" };
    }
  }
  const stripped = tokens.map(stripPrefix);

  for (const toks of [tokens, stripped]) {
    const mod = findNgram(toks, MOD_INDEX, 2);
    if (mod) {
      const cat = BY_ID.get(mod.value)!;
      // If a product word matched too, keep its emoji but use the modifier's category
      const prod = findNgram(toks, INDEX, MAX_NGRAM);
      return { categoryId: cat.id, categoryName: cat.name, emoji: prod?.value.emoji ?? cat.icon, matched: mod.key, via: "modifier" };
    }
  }

  {
    const a = findNgram(tokens, INDEX, MAX_NGRAM);
    const b = findNgram(stripped, INDEX, MAX_NGRAM);
    const len = (h: { key: string } | null) => (h ? h.key.split(" ").length : 0);
    const hit = len(b) > len(a) ? b : a ?? b;
    if (hit) {
      const cat = BY_ID.get(hit.value.catId)!;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        emoji: hit.value.emoji,
        matched: hit.value.label,
        via: hit.key.includes(" ") ? "phrase" : "token",
      };
    }
  }

  // Compound / glued words: longest single-word key (>=4 letters) contained in the title
  const joined = tokens.join(" ");
  let best: { key: string; entry: Entry } | null = null;
  for (const [key, entry] of INDEX) {
    if (key.length < 4 || key.includes(" ")) continue;
    if (joined.includes(key) && (!best || key.length > best.key.length)) best = { key, entry };
  }
  if (best) {
    const cat = BY_ID.get(best.entry.catId)!;
    return { categoryId: cat.id, categoryName: cat.name, emoji: best.entry.emoji, matched: best.entry.label, via: "substring" };
  }

  const brand = findNgram(stripped, BRAND_INDEX, 2) ?? findNgram(tokens, BRAND_INDEX, 2);
  if (brand) {
    const cat = BY_ID.get(brand.value)!;
    return { categoryId: cat.id, categoryName: cat.name, emoji: cat.icon, matched: brand.key, via: "brand" };
  }
  return null;
}

/** Product icon for an item. Cart is the true last resort. */
export function resolveItemIcon(title: string, fallbackIcon?: string | null): string {
  const hit = classifyItem(title);
  if (hit) return hit.emoji;
  if (fallbackIcon) return fallbackIcon;
  return "🛒";
}

export function getTaxonomyCategory(id: string): TaxonomyCategory | undefined {
  return BY_ID.get(id);
}

// ---------------------------------------------------------------------------
// Household category model (DB rows + virtual taxonomy categories)
// ---------------------------------------------------------------------------

export interface HouseholdCategoryLike {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface CategoryModel {
  /** Names in display order (DB rows first-class, taxonomy ones appended if missing) */
  orderedNames: string[];
  iconOf: (name: string) => string;
  colorOf: (name: string) => string;
  sectionOf: (name: string) => string;
  /** Category name an item should be shown under */
  resolveCategory: (title: string, storedCategory: string | null | undefined) => string;
  /** Display name for a taxonomy id */
  displayNameFor: (taxonomyId: string) => string;
}

export function buildCategoryModel(dbCategories: HouseholdCategoryLike[]): CategoryModel {
  const dbNames = dbCategories.map((c) => c.name);
  const dbSet = new Set(dbNames);

  // taxonomy id -> the household's own row name if it has one, else canonical
  const displayById = new Map<string, string>();
  const rankByName = new Map<string, number>();
  TAXONOMY.forEach((cat, rank) => {
    const own = [cat.name, ...cat.aliases].find((n) => dbSet.has(n));
    displayById.set(cat.id, own ?? cat.name);
    for (const n of [cat.name, ...cat.aliases]) rankByName.set(n, rank);
  });

  const taxByName = new Map<string, TaxonomyCategory>();
  for (const cat of TAXONOMY) for (const n of [cat.name, ...cat.aliases]) taxByName.set(n, cat);
  const dbByName = new Map(dbCategories.map((c) => [c.name, c]));

  // Did the household reorder the default categories by hand?
  // Seeded default order was NOT walk order, so "untouched" means "equals the old seed order".
  const OLD_SEED = ["ירקות", "פירות", "עשבי תיבול", "מוצרי בסיס", "מוצרי חלב", "חלב", "בשר, ביצים ודגים", "קטניות ותוספות", "מאפים ודגנים", "אגוזים", "קפואים", "שימורים", "תבלינים", "ממרחים", "מטבלים ורטבים", "משקאות", "חטיפים ומתוקים", "מצרכים לאפייה", "ניקיון וכביסה", "תרופות", "חיות מחמד", "שונות"];
  const oldSeedFiltered = OLD_SEED.filter((n) => dbSet.has(n));
  const knownOldSeed = dbNames.filter((n) => OLD_SEED.includes(n));
  const untouched = JSON.stringify(knownOldSeed) === JSON.stringify(oldSeedFiltered) || dbNames.length === 0;

  const orderedNames: string[] = [];
  if (untouched) {
    // Store-walk order. Custom (non-taxonomy) DB categories go just before "שונות".
    const custom = dbNames.filter((n) => !rankByName.has(n));
    for (const cat of TAXONOMY) {
      if (cat.id === "misc") {
        orderedNames.push(...custom);
      }
      const names = [cat.name, ...cat.aliases].filter((n) => dbSet.has(n));
      if (names.length > 0) orderedNames.push(...names);
      else orderedNames.push(cat.name);
    }
  } else {
    // User re-ordered by hand: respect it, then append taxonomy categories they lack.
    orderedNames.push(...dbNames);
    for (const cat of TAXONOMY) {
      if (![cat.name, ...cat.aliases].some((n) => dbSet.has(n))) {
        const miscIdx = orderedNames.indexOf("שונות");
        if (miscIdx === -1) orderedNames.push(cat.name);
        else orderedNames.splice(miscIdx, 0, cat.name);
      }
    }
  }

  const iconOf = (name: string): string => dbByName.get(name)?.icon || taxByName.get(name)?.icon || "📦";
  const colorOf = (name: string): string => dbByName.get(name)?.color || taxByName.get(name)?.color || "#6B7280";
  const sectionOf = (name: string): string => taxByName.get(name)?.section ?? "קטגוריות שלי";
  const displayNameFor = (id: string): string => displayById.get(id) ?? BY_ID.get(id)?.name ?? "שונות";

  const knownNames = new Set(orderedNames);
  const resolveCategory = (title: string, stored: string | null | undefined): string => {
    const s = (stored ?? "").trim();
    if (s === MANUAL_MISC) return displayNameFor("misc");
    // Respect a deliberate, known, specific choice (including the user's own categories)
    if (s && knownNames.has(s) && !UNSORTED_CATEGORY_NAMES.has(s)) return s;
    const hit = classifyItem(title);
    if (hit && hit.categoryId !== "misc") return displayNameFor(hit.categoryId);
    return knownNames.has(s) ? s : displayNameFor("misc");
  };

  return { orderedNames, iconOf, colorOf, sectionOf, resolveCategory, displayNameFor };
}
