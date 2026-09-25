import { describe, it, expect } from "vitest";
import { jerusalemOffsetMinutes, ilDateAndHourToUtc, ilDateString } from "../timezone";

describe("timezone (Asia/Jerusalem, DST-correct)", () => {
  it("is UTC+2 (120 min) in December (winter, no DST)", () => {
    const offset = jerusalemOffsetMinutes(new Date("2026-12-15T12:00:00Z"));
    expect(offset).toBe(120);
  });

  it("is UTC+3 (180 min) in August (summer DST)", () => {
    const offset = jerusalemOffsetMinutes(new Date("2026-08-15T12:00:00Z"));
    expect(offset).toBe(180);
  });

  it("converts 19:00 Israel time in December to 17:00 UTC", () => {
    const utc = ilDateAndHourToUtc("2026-12-15", 19);
    expect(utc.toISOString()).toBe("2026-12-15T17:00:00.000Z");
  });

  it("converts 19:00 Israel time in August to 16:00 UTC", () => {
    const utc = ilDateAndHourToUtc("2026-08-15", 19);
    expect(utc.toISOString()).toBe("2026-08-15T16:00:00.000Z");
  });

  it("the SAME wall-clock hour yields a DIFFERENT UTC instant across the DST boundary", () => {
    const winter = ilDateAndHourToUtc("2026-12-15", 19).getTime();
    const summer = ilDateAndHourToUtc("2026-08-15", 19).getTime();
    // If this were a naive fixed offset, winter and summer would differ by
    // exactly 0 (bug: no DST awareness) instead of exactly 1 hour.
    const winterHourOfDayUtc = new Date(winter).getUTCHours();
    const summerHourOfDayUtc = new Date(summer).getUTCHours();
    expect(winterHourOfDayUtc - summerHourOfDayUtc).toBe(1);
  });

  it("ilDateString formats an instant as its Israel-local calendar date", () => {
    // 2026-01-01T22:30:00Z is already 2026-01-02 00:30 in Israel (UTC+2).
    expect(ilDateString(new Date("2026-01-01T22:30:00Z"))).toBe("2026-01-02");
  });
});
