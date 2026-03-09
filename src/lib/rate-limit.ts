/**
 * Simple in-memory sliding window rate limiter.
 *
 * Works per-instance (state resets on deploy / cold start).
 * Suitable for basic protection against brute-force and abuse on
 * Next.js API routes running in a long-lived server process.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check(ip);
 *   if (!result.success) return 429 response;
 */

export interface RateLimitResult {
  /** Whether the request is within the allowed limit. */
  success: boolean;
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Requests remaining before the limit is reached. */
  remaining: number;
  /** Milliseconds until the oldest recorded hit leaves the window. */
  reset: number;
}

export interface RateLimitOptions {
  /** Length of the sliding window in milliseconds. Default: 60 000 (1 minute). */
  windowMs?: number;
  /** Maximum number of requests allowed within the window. Default: 10. */
  max?: number;
}

export interface RateLimiter {
  /** Check (and record) a request for the given token (e.g. IP address). */
  check(token: string): RateLimitResult;
}

/**
 * Creates a rate limiter instance.
 *
 * The internal Map is cleaned up every 5 minutes to prevent unbounded growth
 * in long-running server processes.
 */
export function rateLimit(options: RateLimitOptions = {}): RateLimiter {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 10;

  /** Map from token → sorted array of hit timestamps (oldest first). */
  const hits = new Map<string, number[]>();

  // Periodic cleanup: remove entries with no recent hits.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits) {
      const valid = timestamps.filter((t) => t > now - windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, 300_000 /* 5 minutes */);

  // Allow the interval to be garbage-collected when the module unloads
  // (relevant in test environments).
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    check(token: string): RateLimitResult {
      const now = Date.now();

      // Keep only timestamps within the current window.
      const timestamps = (hits.get(token) ?? []).filter(
        (t) => t > now - windowMs
      );

      if (timestamps.length >= max) {
        // Rate limit exceeded.  `reset` is how long until the oldest hit
        // slides out of the window.
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: Math.max(0, timestamps[0] + windowMs - now),
        };
      }

      // Record this hit and persist.
      timestamps.push(now);
      hits.set(token, timestamps);

      return {
        success: true,
        limit: max,
        remaining: max - timestamps.length,
        reset: windowMs,
      };
    },
  };
}

/**
 * Extracts the best-effort client IP from common proxy headers.
 * Falls back to "unknown" when headers are absent (e.g. local dev).
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
