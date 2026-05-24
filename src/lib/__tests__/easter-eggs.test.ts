import { describe, it, expect, beforeEach } from "vitest";
import { loadFired } from "@/lib/easter-eggs";

describe("easter-eggs — loadFired default state", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("returns both eggs not-fired by default", () => {
    const f = loadFired();
    expect(f.konami).toBe(false);
    expect(f["logo-100"]).toBe(false);
  });

  it("respects stored state", () => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("bayit-easter-eggs-fired-v1", JSON.stringify({ konami: true, "logo-100": false }));
    const f = loadFired();
    expect(f.konami).toBe(true);
    expect(f["logo-100"]).toBe(false);
  });

  it("falls back to default on corrupt storage", () => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("bayit-easter-eggs-fired-v1", "{not json");
    const f = loadFired();
    expect(f.konami).toBe(false);
    expect(f["logo-100"]).toBe(false);
  });
});
