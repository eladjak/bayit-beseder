import { NextResponse } from "next/server";
import { requirePriceSession, serviceErrorResponse, NO_STORE } from "@/lib/prices/session";
import { priceService } from "@/lib/prices/server";

export const dynamic = "force-dynamic";

/** GET /api/prices/cities -> cities that have stores with prices (for the location picker). */
export async function GET() {
  const s = await requirePriceSession();
  if (!s.ok) return s.response;
  try {
    const data = await priceService<{ cities: { name: string; stores: number }[] }>("/v1/cities");
    return NextResponse.json(
      { cities: data.cities.map((c) => ({ name: c.name, stores: c.stores })) },
      { headers: NO_STORE }
    );
  } catch (e) {
    return serviceErrorResponse(e);
  }
}
