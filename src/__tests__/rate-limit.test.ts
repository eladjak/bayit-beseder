/**
 * Unit tests for the rate limiter.
 * Tests allow/block behavior, remaining counter, window reset, and IP extraction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ============================================
// rateLimit
// ============================================

describe("rateLimit — basic behavior", () => {
  it("allows the first request", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 5 });
    const result = limiter.check("ip-1");
    expect(result.success).toBe(true);
  });

  it("returns correct limit value", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    const result = limiter.check("ip-1");
    expect(result.limit).toBe(3);
  });

  it("decrements remaining after each request", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    const r1 = limiter.check("ip-1");
    const r2 = limiter.check("ip-1");
    expect(r1.remaining).toBe(2); // 3 - 1
    expect(r2.remaining).toBe(1); // 3 - 2
  });

  it("remaining is 0 at the limit boundary", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    limiter.check("ip-1");
    const r2 = limiter.check("ip-1");
    expect(r2.remaining).toBe(0);
    expect(r2.success).toBe(true);
  });

  it("blocks the request that exceeds max", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    limiter.check("ip-1");
    limiter.check("ip-1");
    const blocked = limiter.check("ip-1");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("different tokens are tracked independently", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    limiter.check("ip-1");
    // ip-1 is now at limit; ip-2 should still pass
    const r = limiter.check("ip-2");
    expect(r.success).toBe(true);
    // ip-1 should be blocked
    const blocked = limiter.check("ip-1");
    expect(blocked.success).toBe(false);
  });

  it("blocked result has a positive reset time", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    limiter.check("ip-1");
    const blocked = limiter.check("ip-1");
    expect(blocked.reset).toBeGreaterThan(0);
  });
});

describe("rateLimit — default options", () => {
  it("defaults to max=10", () => {
    const limiter = rateLimit();
    const result = limiter.check("ip-default");
    expect(result.limit).toBe(10);
  });

  it("allows 10 requests before blocking", () => {
    const limiter = rateLimit(); // max=10
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("ip-x").success).toBe(true);
    }
    expect(limiter.check("ip-x").success).toBe(false);
  });
});

describe("rateLimit — window expiry (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows new requests after the window expires", () => {
    const windowMs = 1_000;
    const limiter = rateLimit({ windowMs, max: 2 });

    limiter.check("ip-time");
    limiter.check("ip-time");
    // At limit — this should be blocked
    expect(limiter.check("ip-time").success).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(windowMs + 1);

    // Should be allowed again
    expect(limiter.check("ip-time").success).toBe(true);
  });

  it("sliding window: request at t=0 expires at t=windowMs", () => {
    const windowMs = 1_000;
    const limiter = rateLimit({ windowMs, max: 1 });

    limiter.check("ip-slide"); // first hit at t=0
    expect(limiter.check("ip-slide").success).toBe(false); // blocked

    // Move forward just before expiry — still blocked
    vi.advanceTimersByTime(windowMs - 1);
    expect(limiter.check("ip-slide").success).toBe(false);

    // Move past expiry
    vi.advanceTimersByTime(2);
    expect(limiter.check("ip-slide").success).toBe(true);
  });
});

// ============================================
// getClientIp
// ============================================

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const req = new Request("http://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://example.com", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = new Request("http://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for entries", () => {
    const req = new Request("http://example.com", {
      headers: { "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://example.com", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});
