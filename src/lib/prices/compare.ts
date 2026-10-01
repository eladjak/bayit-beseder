/**
 * Builds a comparison for a household's open shopping list. Shared by the
 * /api/prices/compare route and the in-app assistant, so both say the same thing.
 */
import { mapTitle } from "./map-items";
import { priceService } from "./server";
import type { CompareResponse, Origin } from "./types";

type Supabase = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export interface ListRow {
  id: string;
  title: string;
  quantity: number | null;
}

export async function loadOpenList(supabase: Supabase, householdId: string): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("id, title, quantity")
    .eq("household_id", householdId)
    .eq("checked", false)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as ListRow[];
}

export async function resolveOrigin(
  supabase: Supabase,
  householdId: string,
  input: { lat?: number; lon?: number; city?: string | null }
): Promise<Origin | null> {
  if (Number.isFinite(input.lat) && Number.isFinite(input.lon)) {
    // two decimals ~ 1km: enough for "nearby stores", not a home address
    return { lat: Math.round(input.lat! * 100) / 100, lon: Math.round(input.lon! * 100) / 100, label: "המיקום שלך" };
  }
  let city = input.city?.trim() || null;
  if (!city) {
    const { data } = await supabase.from("households").select("city").eq("id", householdId).maybeSingle();
    city = (data?.city as string | null) ?? null;
  }
  if (!city) return null;
  const { cities } = await priceService<{ cities: { name: string; lat: number; lon: number }[] }>("/v1/cities");
  const hit = cities.find((c) => c.name === city) ?? cities.find((c) => c.name.replace(/-/g, " ") === city!.replace(/-/g, " "));
  return hit ? { lat: hit.lat, lon: hit.lon, label: hit.name } : null;
}

export async function compareList(
  householdId: string,
  rows: ListRow[],
  origin: Origin,
  radiusKm = 20
): Promise<CompareResponse> {
  const mapped = rows.map((r) => ({ row: r, m: mapTitle(r.title) }));
  const items = mapped.map(({ row, m }) => ({
    key: row.id,
    canonicalId: m.canonicalId,
    qty: row.quantity && row.quantity > 0 ? Math.min(row.quantity, 100) : 1,
    strict: m.strict,
  }));
  const res = await priceService<Omit<CompareResponse, "titles" | "labels" | "origin">>("/v1/compare", {
    method: "POST",
    body: { householdId, origin: { lat: origin.lat, lon: origin.lon }, radiusKm, items },
  });
  return {
    ...res,
    origin,
    titles: Object.fromEntries(mapped.map(({ row }) => [row.id, row.title])),
    labels: Object.fromEntries(mapped.map(({ row, m }) => [row.id, m.label])),
  };
}
