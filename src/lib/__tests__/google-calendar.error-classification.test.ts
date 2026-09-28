import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPrimaryCalendarId, GoogleCalendarApiError } from "@/lib/google-calendar";

/**
 * Regression test for the calendar-sync 403 misclassification.
 *
 * Production symptom: calendar-sync failed for one household with a Google
 * 403 (not 401), even though a valid refresh_token was present. Before this
 * fix, every Calendar API failure that calendarFetch() didn't special-case
 * with a plain string message ended up logged/handled identically to a
 * generic error — there was no programmatic way for a caller to tell "the
 * token is genuinely dead, clear it and ask the user to reconnect" (401/403)
 * apart from "this is transient, leave the token alone and try again"
 * (429/other). A caller had to regex a message string to guess.
 *
 * This test proves each Google status now throws a typed
 * GoogleCalendarApiError with a `.reason` that is a fact, not a guess, and
 * that `.needsReconnect` correctly separates "clear the tokens" (401, 403)
 * from "leave them, this is transient" (429, everything else).
 */
describe("Calendar API error classification", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockResponse(status: number, body = "") {
    return {
      ok: false,
      status,
      clone() {
        return this;
      },
      text: async () => body,
      json: async () => ({}),
    } as unknown as Response;
  }

  it("classifies 401 as auth_expired and needsReconnect=true", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse(401));

    await expect(getPrimaryCalendarId("token")).rejects.toMatchObject({
      status: 401,
      reason: "auth_expired",
      needsReconnect: true,
    });
  });

  it("classifies 403 as permission_denied and needsReconnect=true — this is the production case (403 with a valid refresh_token present)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(403, '{"error":{"message":"Request had insufficient authentication scopes."}}')
    );

    const err = await getPrimaryCalendarId("token").catch((e) => e);
    expect(err).toBeInstanceOf(GoogleCalendarApiError);
    expect(err).toMatchObject({ status: 403, reason: "permission_denied", needsReconnect: true });
    // The real Google error body must be preserved for logging, not discarded.
    expect((err as GoogleCalendarApiError).googleBody).toContain("insufficient authentication scopes");
  });

  it("classifies 429 as rate_limited and needsReconnect=false — must NOT force a reconnect for a transient rate limit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse(429));

    await expect(getPrimaryCalendarId("token")).rejects.toMatchObject({
      status: 429,
      reason: "rate_limited",
      needsReconnect: false,
    });
  });

  it("classifies any other status (e.g. 500) as unknown and needsReconnect=false", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse(500));

    await expect(getPrimaryCalendarId("token")).rejects.toMatchObject({
      status: 500,
      reason: "unknown",
      needsReconnect: false,
    });
  });
});
