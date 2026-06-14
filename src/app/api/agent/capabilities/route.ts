import { NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/agent/auth";

/**
 * GET /api/agent/capabilities
 *
 * Self-describing manifest of what BayitBeSeder can do for an external agent.
 * An agent (Kami / Box / any Claude / OpenClaw) reads this once to learn the
 * available actions, their params, and the auth scheme — then drives the app.
 *
 * Auth: Bearer BAYIT_AGENT_KEY (same as all /api/agent/* endpoints).
 */
export async function GET(request: Request) {
  const auth = verifyAgentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    name: "בית בסדר (BayitBeSeder)",
    description:
      "אפליקציה לניהול תחזוקת הבית המשותף. ממשק הסוכנים מאפשר לסוכן חיצוני לייצר תוכנית שבועית, לקבל את סיכום היום, ולהחזיר טקסט מוכן לשליחה ב-WhatsApp.",
    version: "1.0.0",
    auth: {
      scheme: "Bearer",
      header: "Authorization: Bearer <BAYIT_AGENT_KEY>",
      note: "המפתח מוגדר בסביבת השרת בלבד (BAYIT_AGENT_KEY). אין מפתח ברירת מחדל.",
    },
    actions: [
      {
        id: "generate_weekly_plan",
        method: "POST",
        path: "/api/agent/plan",
        summary:
          "ייצור תוכנית שבועית מאוזנת (חלוקת משימות לימים ולבני הבית) והחזרתה כ-JSON + בלוק טקסט מוכן לשליחה ב-WhatsApp.",
        params: {
          householdId: "string (אופציונלי) — מזהה משק בית. אם סופק, נשלבות גם המשימות הקיימות של אותו משק בית.",
          weekStart: "string YYYY-MM-DD (אופציונלי) — תאריך תחילת השבוע. ברירת מחדל: יום ראשון הקרוב.",
          zoneMode: "boolean (אופציונלי) — תזמון מבוסס-אזורים (קיבוץ משימות לפי חדרי הבית).",
          members: "string[] (אופציונלי) — מזהי בני הבית. נגזר מ-householdId אם לא סופק.",
          deliver: "\"whatsapp\" (אופציונלי) — אם מצוין, התוכנית תישלח ב-WhatsApp לאלעד בלבד (הנמען מהשרת, לא מהבקשה).",
        },
        returns:
          "{ plan: PlanSummary, whatsappText: string, delivery } — whatsappText מוכן להעברה. delivery מדווח אם נשלח בפועל.",
      },
      {
        id: "get_today_brief",
        method: "GET",
        path: "/api/agent/brief",
        summary:
          "סיכום היום: המשימות הפתוחות להיום, מי משויך, כמה משימות באיחור, ומצב הרצף (streak) — כ-JSON + טקסט מוכן.",
        params: {
          householdId: "string (אופציונלי) — query param. מצמצם לאותו משק בית.",
          deliver: "\"whatsapp\" (אופציונלי) — query param. אם מצוין, הסיכום יישלח ב-WhatsApp לאלעד בלבד.",
        },
        returns: "{ date, tasks[], overdueCount, streak, whatsappText, delivery }",
      },
    ],
    sendChannel: {
      note: "שליחה אופציונלית: הוסיפו deliver=\"whatsapp\" כדי שהשרת ישלח את הטקסט ל-WhatsApp של אלעד בלבד (הנמען נקבע ב-env BAYIT_AGENT_WHATSAPP_TO, לעולם לא מגוף הבקשה). ללא deliver — קחו את whatsappText והעבירו אותו בעצמכם.",
    },
  });
}
