import { describe, it, expect, beforeEach } from "vitest";
import { addKidProfile, loadKidProfiles, removeKidProfile, verifyKidPin } from "@/lib/kid-profiles";

describe("kid-profiles", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("rejects empty name", () => {
    if (typeof localStorage === "undefined") return;
    expect(addKidProfile({ name: "", emoji: "🦊", pinCode: "1234", requiresParentApproval: true })).toBeNull();
  });

  it("rejects non-4-digit PIN", () => {
    if (typeof localStorage === "undefined") return;
    expect(addKidProfile({ name: "ילדה", emoji: "🦊", pinCode: "12", requiresParentApproval: true })).toBeNull();
    expect(addKidProfile({ name: "ילדה", emoji: "🦊", pinCode: "abcd", requiresParentApproval: true })).toBeNull();
  });

  it("creates + retrieves profile", () => {
    if (typeof localStorage === "undefined") return;
    const p = addKidProfile({ name: "ליאם", emoji: "🐱", pinCode: "0420", requiresParentApproval: true });
    expect(p).toBeTruthy();
    expect(loadKidProfiles().length).toBe(1);
    expect(loadKidProfiles()[0]?.name).toBe("ליאם");
  });

  it("verifyKidPin works for correct + wrong pin", () => {
    if (typeof localStorage === "undefined") return;
    const p = addKidProfile({ name: "נועה", emoji: "🐰", pinCode: "9999", requiresParentApproval: false });
    expect(verifyKidPin(p!.id, "9999")).toBe(true);
    expect(verifyKidPin(p!.id, "0000")).toBe(false);
  });

  it("removeKidProfile works", () => {
    if (typeof localStorage === "undefined") return;
    const p = addKidProfile({ name: "תום", emoji: "🐶", pinCode: "1111", requiresParentApproval: true });
    expect(removeKidProfile(p!.id)).toBe(true);
    expect(loadKidProfiles().length).toBe(0);
    expect(removeKidProfile("non-existent")).toBe(false);
  });
});
