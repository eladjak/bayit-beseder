/**
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 *
 * Required environment variables (set in Vercel project settings):
 *   UPSTASH_REDIS_REST_URL   — e.g. https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — AX... (REST token from Upstash console)
 *
 * When those variables are absent (local dev without Redis) the limiter
 * automatically falls back to an in-memory implementation so the rest of
 * the codebase continues to work unchanged.
 *
 * All 7 API routes import this module with the same interface:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 10 });
 *   const result  = limiter.check(getClientIp(request));
 *   if (!result.success) return 429 response;
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Public types (unchanged from the original in-memory implementation)
// ---------------------------------------------------------------------------

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
  check(token: string): Promise<RateLimitResult> | RateLimitResult;
}

// ---------------------------------------------------------------------------
// Lazy Redis singleton — created once per process, never on import
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!_redis) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ---------------------------------------------------------------------------
// Upstash-backed limiter
// ---------------------------------------------------------------------------

interface UpstashLimiter extends RateLimiter {
  check(token: string): Promise<RateLimitResult>;
}

function createUpstashLimiter(
  redis: Redis,
  windowMs: number,
  max: number
): UpstashLimiter {
  // @upstash/ratelimit uses seconds for the window duration.
  const windowSeconds = Math.ceil(windowMs / 1000);

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    // Prefix keeps keys from colliding with other app data.
    prefix: "bb:rl",
  });

  return {
    async check(token: string): Promise<RateLimitResult> {
      const { success, limit, remaining, reset } = await rl.limit(token);
      return {
        success,
        limit,
        remaining,
        // reset from Upstash is a Unix timestamp in milliseconds;
        // convert to milliseconds-until-reset to match the original interface.
        reset: Math.max(0, reset - Date.now()),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback (verbatim from original implementation)
// ---------------------------------------------------------------------------

interface SyncLimiter extends RateLimiter {
  check(token: string): RateLimitResult;
}

function createInMemoryLimiter(windowMs: number, max: number): SyncLimiter {
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
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: Math.max(0, timestamps[0] + windowMs - now),
        };
      }

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

// ---------------------------------------------------------------------------
// Unified wrapper — async-first, syncs in-memory fallback transparently
// ---------------------------------------------------------------------------

/**
 * Creates a rate limiter instance.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set the limiter
 * uses Upstash Redis (distributed, survives cold starts). Otherwise it falls
 * back to the original in-memory sliding window (suitable for local dev).
 *
 * The returned `check()` always returns a Promise so callers should await it.
 * The in-memory fallback wraps its synchronous result in Promise.resolve()
 * automatically.
 */
export function rateLimit(options: RateLimitOptions = {}): {
  check: (token: string) => Promise<RateLimitResult>;
} {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 10;

  const redis = getRedis();

  if (redis) {
    return createUpstashLimiter(redis, windowMs, max);
  }

  // In-memory fallback: wrap the sync result so callers get a uniform Promise.
  const inMemory = createInMemoryLimiter(windowMs, max);
  return {
    check: (token: string) => Promise.resolve(inMemory.check(token)),
  };
}

// ---------------------------------------------------------------------------
// Utility (unchanged from original)
// ---------------------------------------------------------------------------

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
