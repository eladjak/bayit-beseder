/**
 * Regression test for silent rate-limit degradation.
 *
 * Production lead: the Upstash rate limiter is unreachable in production and
 * silently falls back to per-instance in-memory limiting. The existing
 * circuit-breaker + in-memory fallback (see src/lib/rate-limit.ts) already
 * kept requests from 500ing, but the ONLY trace of the underlying problem was
 * a console.error per failed request — nothing surfaces it to a human, and
 * with ~14 routes sharing this module a fully-down Upstash instance would
 * produce a flood of identical log lines rather than one clear signal.
 *
 * This proves: (1) the first Upstash failure reports once to Sentry with the
 * real cause, (2) a SECOND failure (a different limiter instance, same
 * process — the realistic shape when many routes call rateLimit()) does NOT
 * report again, and (3) the in-memory fallback still serves a valid result
 * either way, so behavior for callers is unchanged.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRedisConstructor = vi.fn();
const mockLimit = vi.fn();

vi.mock("@upstash/redis", () => {
  class FakeRedis {
    constructor(...args: unknown[]) {
      mockRedisConstructor(...args);
    }
  }
  return { Redis: FakeRedis };
});

vi.mock("@upstash/ratelimit", () => {
  class FakeRatelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn(() => ({}));
  }
  return { Ratelimit: FakeRatelimit };
});

const captureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureMessage }));

describe("rate-limit — Upstash unreachable is reported once, not per-request", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
    captureMessage.mockReset();
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports the first failure to Sentry with the rate-limit area tag, and still degrades gracefully", async () => {
    mockLimit.mockRejectedValue(new Error("getaddrinfo ENOTFOUND fake.upstash.io"));
    const { rateLimit } = await import("@/lib/rate-limit");

    const limiter = rateLimit({ windowMs: 60_000, max: 5 });
    const result = await limiter.check("1.2.3.4");

    // Behavior for the caller is unchanged: still a usable result via the
    // in-memory fallback, not a thrown error / 500.
    expect(result.success).toBe(true);

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage.mock.calls[0][0]).toMatch(/Upstash Redis is unreachable/);
    expect(captureMessage.mock.calls[0][1]).toMatchObject({
      level: "error",
      tags: { area: "rate-limit" },
    });
  });

  it("does NOT report again for a second limiter instance failing in the same process", async () => {
    mockLimit.mockRejectedValue(new Error("getaddrinfo ENOTFOUND fake.upstash.io"));
    const { rateLimit } = await import("@/lib/rate-limit");

    // Two different routes each call rateLimit() to get their own limiter —
    // this is the real shape (14 routes each create one).
    const limiterA = rateLimit({ windowMs: 60_000, max: 5 });
    const limiterB = rateLimit({ windowMs: 60_000, max: 10 });

    await limiterA.check("ip-a");
    await limiterB.check("ip-b");

    // A flood of identical Sentry events (one per route, forever, per
    // request) is exactly what this fix avoids.
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });
});
