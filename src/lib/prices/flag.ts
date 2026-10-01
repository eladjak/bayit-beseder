/**
 * Price comparison is behind a server-side allow-list of household ids.
 * PRICE_COMPARE_HOUSEHOLDS="uuid,uuid". Unset or empty = off for everyone.
 * The check is server-only; the browser learns the answer from /api/prices/status.
 */
export function priceCompareHouseholds(raw: string | undefined = process.env.PRICE_COMPARE_HOUSEHOLDS): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s))
  );
}

export function isPriceCompareEnabled(householdId: string | null | undefined, raw?: string): boolean {
  if (!householdId) return false;
  return priceCompareHouseholds(raw ?? process.env.PRICE_COMPARE_HOUSEHOLDS).has(householdId.toLowerCase());
}
