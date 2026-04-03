import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

// Gemini API for generating smart coaching tips
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `אתה מאמן ביתי חכם ומצחיק באפליקציית "בית בסדר" — אפליקציה לניהול תחזוקת הבית לזוגות ומשפחות.
תפקידך לתת טיפ אחד קצר ומעשי (2-3 משפטים) על ניהול בית, ניקיון, ארגון, מוטיבציה או שיתוף פעולה.

כללים:
- עברית בלבד
- טון חם, הומוריסטי, עם הומור עצמי בריא
- טיפ מעשי שאפשר ליישם עכשיו
- אל תחזור על טיפים
- התאם את הטיפ למצב: אם השלימו הרבה משימות — עודד, אם מעט — תן מוטיבציה
- אורך: 2-3 משפטים בלבד, לא יותר`;

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = await limiter.check(getClientIp(req));
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ tip: getRandomFallbackTip() });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ tip: getRandomFallbackTip() });
  }

  try {
    const body = await req.json();
    const { completedCount = 0, totalCount = 0, trigger = "general" } = body;

    const contextPrompt = `מצב נוכחי: ${completedCount} מתוך ${totalCount} משימות הושלמו היום.
סוג הטריגר: ${trigger}.
תן טיפ אחד קצר ומעשי:`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.error(`[coaching-tip] Gemini API error ${response.status}: ${errorText}`);
      return NextResponse.json({ tip: getRandomFallbackTip() });
    }

    const data = await response.json();
    const tip = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!tip) {
      console.error("[coaching-tip] Gemini returned no tip. Response:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ tip: getRandomFallbackTip() });
    }

    return NextResponse.json({ tip });
  } catch {
    return NextResponse.json({ tip: getRandomFallbackTip() });
  }
}

// Fallback tips when API is unavailable
function getRandomFallbackTip(): string {
  const tips = [
    "טיפ: 10 דקות ניקיון ביום חוסכות שעה של ניקיון גדול בסוף השבוע. תכוונו טיימר ותעצרו כשהוא מצלצל! ⏱️",
    "הבית לא חייב להיות מושלם — הוא צריך להיות מספיק טוב כדי שתרגישו בנוח. זה הסוד. 🏠",
    "כלל הזהב: אם משימה לוקחת פחות מ-2 דקות — תעשו אותה עכשיו. לא מחר, לא ׳אחר כך׳. עכשיו. ✨",
    "שמעתם על שיטת ה-5 דברים? כל פעם שנכנסים לחדר, מחזירים 5 דברים למקומם. פשוט ועובד! 🖐️",
    "הניקיון הכי טוב הוא זה שלא שמים לב אליו — כי הוא קורה כל יום, קצת-קצת. כמו מדיטציה, רק עם מטאטא. 🧹",
    "מוזיקה טובה + 15 דקות = בית נקי. זה באמת כל הסוד. נסו את זה. 🎵",
    "במקום לריב על מי ינקה — תעשו ׳ניקיון מהיר׳ של 10 דקות ביחד. תחרות? אם רוצים. שלום בית? בטוח. 🤝",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}
