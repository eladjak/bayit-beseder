import { isPriceCompareEnabled } from "./flag";
import { compareList, loadOpenList, resolveOrigin } from "./compare";
import { ASSISTANT_PRICE_RULES, isPriceQuestion, summarizeForAssistant } from "./assistant";

type Supabase = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Returns the "נתוני מחירים" block for the assistant, or null when the question
 * is not about prices or the household is not in the flag. The household comes
 * from the signed-in user's own profile row.
 */
export async function buildPriceContext(supabase: Supabase, userId: string, message: string): Promise<string | null> {
  if (!isPriceQuestion(message)) return null;
  const { data: profile } = await supabase.from("profiles").select("household_id").eq("id", userId).maybeSingle();
  const householdId = (profile?.household_id as string | undefined) ?? null;
  if (!householdId || !isPriceCompareEnabled(householdId)) return null;
  const header = `נתוני מחירים (נוצרו עכשיו על ידי מנוע ההשוואה של בית בסדר):\n${ASSISTANT_PRICE_RULES}\n\n`;
  try {
    const origin = await resolveOrigin(supabase, householdId, {});
    if (!origin) {
      return `${header}אין מיקום למשק הבית. אמור למשתמש לפתוח "השוואת מחירים" ברשימת הקניות ולבחור יישוב. אל תמציא מחירים.`;
    }
    const rows = await loadOpenList(supabase, householdId);
    if (rows.length === 0) return `${header}רשימת הקניות ריקה. אין מה להשוות.`;
    return header + summarizeForAssistant(await compareList(householdId, rows, origin));
  } catch {
    return `${header}שירות המחירים לא זמין כרגע. אמור זאת ואל תמציא מחירים.`;
  }
}
