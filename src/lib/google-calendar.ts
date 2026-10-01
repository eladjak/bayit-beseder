/**
 * Google Calendar OAuth2 + Calendar API integration
 *
 * SUPABASE MIGRATION (run in Supabase SQL Editor before using this feature):
 *
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_tokens jsonb;
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_id text;
 *   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id text;
 *
 * These columns store OAuth2 tokens, the primary calendar id, and the Google
 * Calendar event id linked to each task so we never duplicate events.
 */

import { ilToday } from "@/lib/il-date";

// ============================================================
// Types
// ============================================================

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (ms)
  token_type: string;
  scope: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  colorId?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

// ============================================================
// Constants
// ============================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"].join(" ");
const TIMEZONE = "Asia/Jerusalem";

// ============================================================
// Environment helpers
// ============================================================

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

/**
 * Detects the correct redirect URI based on the current environment.
 * Falls back to localhost for development.
 */
export function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl}/api/auth/callback/google-calendar`;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}/api/auth/callback/google-calendar`;
  }
  return "http://localhost:3000/api/auth/callback/google-calendar";
}

// ============================================================
// OAuth2 helpers
// ============================================================

/**
 * Generates the Google OAuth2 authorization URL that the user will be
 * redirected to in order to grant calendar permissions.
 */
export function buildOAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // force refresh_token every time
    ...(state ? { state } : {}),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  let data: { access_token: string; refresh_token?: string; expires_in: number; token_type: string; scope: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid JSON from Google token endpoint: ${res.status}`);
  }

  if (!data.refresh_token) {
    throw new Error(
      "No refresh_token returned. The user may need to revoke access and re-authorize."
    );
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };
}

/**
 * Uses the stored refresh_token to obtain a fresh access_token.
 * Returns updated GoogleTokens with the new access_token and expires_at.
 */
export async function refreshAccessToken(
  tokens: GoogleTokens
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: tokens.refresh_token,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  let data: { access_token: string; expires_in: number; token_type: string; scope: string; refresh_token?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid JSON from Google refresh endpoint: ${res.status}`);
  }

  return {
    ...tokens,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
    // Google may rotate the refresh token; keep the new one if provided
    refresh_token: data.refresh_token ?? tokens.refresh_token,
  };
}

/**
 * Returns a valid access token, refreshing it automatically if it has
 * expired or is about to expire (within 5 minutes).
 *
 * Returns the (possibly updated) tokens alongside the valid access_token
 * string so callers can persist the updated tokens back to the database.
 */
export async function getValidAccessToken(tokens: GoogleTokens): Promise<{
  accessToken: string;
  updatedTokens: GoogleTokens;
}> {
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() < tokens.expires_at - fiveMinutes) {
    return { accessToken: tokens.access_token, updatedTokens: tokens };
  }

  const updatedTokens = await refreshAccessToken(tokens);
  return { accessToken: updatedTokens.access_token, updatedTokens };
}

// ============================================================
// Calendar API helpers
// ============================================================

/**
 * Why a Calendar API call failed, so callers can decide what to DO about it
 * instead of pattern-matching an error message string.
 *
 * "auth_expired" (Google status 401) means the access token itself is
 * invalid. A valid refresh token normally prevents this, so seeing it means
 * Google rejected the token out of band.
 *
 * "permission_denied" (403) means the token is otherwise fine, but Google
 * refused the specific operation: a missing or changed OAuth scope, the
 * Calendar API not enabled, or a per-user block. This is a DIFFERENT root
 * cause than auth_expired even though both need a reconnect to fix -- this
 * is exactly what was observed in production for one household that still
 * had a valid, present refresh token.
 *
 * "rate_limited" (429) is transient. Never clear tokens or force a reconnect
 * for this -- retrying later resolves it on its own.
 *
 * "unknown" covers any other non-2xx status. Also transient / worth
 * investigating, never an auto-reconnect trigger.
 */
export type GoogleCalendarErrorReason =
  | "auth_expired"
  | "permission_denied"
  | "rate_limited"
  | "unknown";

export class GoogleCalendarApiError extends Error {
  readonly status: number;
  readonly reason: GoogleCalendarErrorReason;
  /** Raw response body text from Google, for logs only -- never shown to users. */
  readonly googleBody?: string;

  constructor(
    status: number,
    reason: GoogleCalendarErrorReason,
    message: string,
    googleBody?: string
  ) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
    this.reason = reason;
    this.googleBody = googleBody;
  }

  /** True when the right recovery is "clear tokens, ask the user to reconnect". */
  get needsReconnect(): boolean {
    return this.reason === "auth_expired" || this.reason === "permission_denied";
  }
}

function reasonForStatus(status: number): GoogleCalendarErrorReason {
  if (status === 401) return "auth_expired";
  if (status === 403) return "permission_denied";
  if (status === 429) return "rate_limited";
  return "unknown";
}

const ERROR_MESSAGE_BY_REASON: Record<
  Exclude<GoogleCalendarErrorReason, "unknown">,
  string
> = {
  auth_expired:
    "Google Calendar access token expired or was revoked. Please reconnect.",
  permission_denied:
    "Google Calendar permission denied. You may need to reconnect with the correct scopes.",
  rate_limited:
    "Google Calendar rate limit exceeded. Please wait a moment and try again.",
};

/** Throws a classified GoogleCalendarApiError for a non-ok response that calendarFetch let through (i.e. not 401/403/429). */
async function throwForUnhandledStatus(res: Response, label: string): Promise<never> {
  const googleBody = await res.clone().text().catch(() => undefined);
  throw new GoogleCalendarApiError(
    res.status,
    "unknown",
    `${label}: ${res.status}`,
    googleBody
  );
}

async function calendarFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  // Surface specific Google API errors for better debugging, classified by
  // status rather than by a message string later.
  if (!res.ok) {
    const reason = reasonForStatus(res.status);
    if (reason !== "unknown") {
      const bodyText = await res.clone().text().catch(() => undefined);
      throw new GoogleCalendarApiError(
        res.status,
        reason,
        ERROR_MESSAGE_BY_REASON[reason],
        bodyText
      );
    }
  }

  return res;
}

/**
 * Lists the user's calendar list and returns the primary calendar id.
 */
export async function getPrimaryCalendarId(
  accessToken: string
): Promise<string> {
  const res = await calendarFetch("/users/me/calendarList", accessToken);
  if (!res.ok) {
    await throwForUnhandledStatus(res, "Failed to list calendars");
  }

  const data = (await res.json()) as { items: CalendarListEntry[] };
  const primary = data.items.find((c) => c.primary);
  return primary?.id ?? "primary";
}

/**
 * Lists events from the given calendar within a date range.
 */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    accessToken
  );

  if (!res.ok) {
    await throwForUnhandledStatus(res, "Failed to list events");
  }

  const data = (await res.json()) as { items: CalendarEvent[] };
  return data.items ?? [];
}

/**
 * Creates a calendar event and returns the created event (including the id).
 */
export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<CalendarEvent & { id: string }> {
  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    await throwForUnhandledStatus(res, "Failed to create event");
  }

  return (await res.json()) as CalendarEvent & { id: string };
}

/**
 * Updates an existing calendar event.
 */
export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent & { id: string }> {
  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    await throwForUnhandledStatus(res, "Failed to update event");
  }

  return (await res.json()) as CalendarEvent & { id: string };
}

/**
 * Deletes a calendar event.
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await calendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    accessToken,
    { method: "DELETE" }
  );

  if (!res.ok && res.status !== 404) {
    await throwForUnhandledStatus(res, "Failed to delete event");
  }
}

// ============================================================
// Task ↔ Calendar event conversion
// ============================================================

export interface TaskLike {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  estimated_minutes?: number | null;
}

/**
 * Converts a task to a Google Calendar event object.
 * If the task has no due_date, defaults to today.
 */
export function taskToCalendarEvent(task: TaskLike): CalendarEvent {
  const dueDate = task.due_date ?? ilToday();

  // Default: 1-hour block starting at 09:00 Israel time
  const durationMinutes = task.estimated_minutes ?? 60;
  const startDateTime = `${dueDate}T09:00:00`;
  const endDateTime = offsetDateTime(startDateTime, durationMinutes);

  return {
    summary: task.title,
    description: task.description ?? undefined,
    start: { dateTime: startDateTime, timeZone: TIMEZONE },
    end: { dateTime: endDateTime, timeZone: TIMEZONE },
    colorId: "5", // banana / yellow — feels homey
  };
}

/**
 * Returns the Asia/Jerusalem UTC offset — "+02:00" (winter) or "+03:00"
 * (summer DST) — for the given reference instant.
 *
 * MUST be resolved from the date being computed, never from "now": Israel
 * observes DST, so a task due in a different season than the moment this
 * code happens to run needs the *other* offset. Resolving from "now" was a
 * real bug — see src/lib/__tests__/google-calendar.dst.test.ts — that quietly
 * shifted every calendar event's end time by exactly one hour whenever the
 * sync ran on the opposite side of the DST boundary from the task's due date.
 */
function getJerusalemOffset(reference: Date): string {
  // Extract the longOffset representation, e.g. "GMT+3", "GMT+03:00", or "GMT+2"
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(reference);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+2";
  // offsetPart may be "GMT+3", "GMT+03:00", or "GMT+02:00" depending on environment
  const fullMatch = offsetPart.match(/GMT([+-]\d{2}:\d{2})/);
  if (fullMatch) return fullMatch[1]; // Already in ±HH:MM format
  const shortMatch = offsetPart.match(/GMT([+-]?\d{1,2})/);
  if (!shortMatch) return "+02:00";
  const hours = parseInt(shortMatch[1], 10);
  const sign = hours >= 0 ? "+" : "-";
  return `${sign}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

/**
 * Adds `minutes` minutes to an ISO local datetime string ("YYYY-MM-DDTHH:mm:ss").
 * Returns the result as a local datetime string in Israel timezone.
 */
function offsetDateTime(localDatetime: string, minutes: number): string {
  // Resolve the DST offset for THIS date, not for "now": use noon UTC on the
  // same calendar date as a reference instant. Israel's UTC offset is only
  // ever 2-3 hours, so noon UTC always lands on the correct side of the DST
  // boundary for any date except the transition day itself (a known,
  // acceptable narrowing — see the test file for the case this fixes).
  const [datePart] = localDatetime.split("T");
  const offsetReference = new Date(`${datePart}T12:00:00Z`);
  const offset = getJerusalemOffset(offsetReference); // dynamically resolve DST-aware offset for this date
  const date = new Date(`${localDatetime}${offset}`);
  date.setMinutes(date.getMinutes() + minutes);
  // Convert back to Israel local time (not UTC) by formatting in Israel timezone
  const pad = (n: number) => String(n).padStart(2, "0");
  const localDate = new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const y = localDate.getFullYear();
  const m = pad(localDate.getMonth() + 1);
  const d = pad(localDate.getDate());
  const h = pad(localDate.getHours());
  const min = pad(localDate.getMinutes());
  const s = pad(localDate.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}
