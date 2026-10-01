/**
 * Server-only client for the price service (VPS, via hub tunnel /bayit-prices/).
 * BAYIT_PRICES_URL defaults to the production tunnel path; BAYIT_PRICES_KEY is
 * required and never reaches the browser (no NEXT_PUBLIC_ prefix).
 */

const DEFAULT_URL = "https://hub.eladjak.com/bayit-prices";

export class PriceServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

function config() {
  const key = process.env.BAYIT_PRICES_KEY;
  if (!key || key.length < 32) throw new PriceServiceError("price service not configured", 503);
  return { base: (process.env.BAYIT_PRICES_URL || DEFAULT_URL).replace(/\/$/, ""), key };
}

export async function priceService<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const { base, key } = config();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "X-Bayit-Prices-Key": key,
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch {
    throw new PriceServiceError("price service unreachable", 502);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new PriceServiceError(`price service ${res.status}`, res.status === 401 ? 503 : 502);
  return (await res.json()) as T;
}
