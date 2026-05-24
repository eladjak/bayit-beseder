/**
 * Kid Profiles — Sprint 7.30 Loop M (Phase 4 prep).
 *
 * localStorage stub. Will migrate to Supabase table in Phase 4 with kid auth via PIN.
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (Kids module section)
 */

const STORAGE_KEY = "bayit-kid-profiles-v1";

export type KidProfile = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly birthYear?: number;
  /** 4-digit PIN for kid login. NEVER log this. */
  readonly pinCode: string;
  readonly requiresParentApproval: boolean;
  readonly createdAt: string;
};

export type KidProfileInput = Omit<KidProfile, "id" | "createdAt">;

function genId(): string {
  return `kid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadKidProfiles(): readonly KidProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KidProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(profiles: readonly KidProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* quota */
  }
}

export function addKidProfile(input: KidProfileInput): KidProfile | null {
  if (!input.name?.trim()) return null;
  if (!/^\d{4}$/.test(input.pinCode)) return null;
  const profile: KidProfile = {
    ...input,
    name: input.name.trim().slice(0, 50),
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  const list = [...loadKidProfiles(), profile];
  saveAll(list);
  return profile;
}

export function removeKidProfile(id: string): boolean {
  const list = loadKidProfiles();
  const next = list.filter((k) => k.id !== id);
  if (next.length === list.length) return false;
  saveAll(next);
  return true;
}

export function verifyKidPin(id: string, pin: string): boolean {
  const profile = loadKidProfiles().find((k) => k.id === id);
  if (!profile) return false;
  return profile.pinCode === pin;
}

export const KID_EMOJIS: ReadonlyArray<string> = [
  "🦊", "🐱", "🐶", "🐰", "🐯", "🐼", "🦁", "🐻", "🐨", "🐸",
] as const;
