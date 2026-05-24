/**
 * Pets Collection — Alopik v2 Phase 3.
 *
 * 20 starter pets. Unlocked via streak milestones + surprise box rewards.
 * 1 active pet shown on dashboard. Persisted via localStorage (no DB yet —
 * deferred to Phase 3.5 once we know which pets users actually equip).
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

export type Rarity = "common" | "rare" | "epic";

export type Pet = {
  readonly id: string;
  readonly emoji: string;
  readonly name: string;
  readonly rarity: Rarity;
  /** Streak in days needed to unlock (0 = available from start) */
  readonly unlockStreak: number;
};

export const PETS: ReadonlyArray<Pet> = [
  // Always available (3)
  { id: "dog", emoji: "🐶", name: "כלב", rarity: "common", unlockStreak: 0 },
  { id: "cat", emoji: "🐱", name: "חתול", rarity: "common", unlockStreak: 0 },
  { id: "rabbit", emoji: "🐰", name: "ארנב", rarity: "common", unlockStreak: 0 },

  // Streak 3+ (5)
  { id: "fox", emoji: "🦊", name: "שועל", rarity: "common", unlockStreak: 3 },
  { id: "panda", emoji: "🐼", name: "פנדה", rarity: "common", unlockStreak: 3 },
  { id: "koala", emoji: "🐨", name: "קואלה", rarity: "common", unlockStreak: 3 },
  { id: "hedgehog", emoji: "🦔", name: "קיפוד", rarity: "common", unlockStreak: 3 },
  { id: "owl", emoji: "🦉", name: "ינשוף", rarity: "common", unlockStreak: 3 },

  // Streak 7+ (6 — rare)
  { id: "deer", emoji: "🦌", name: "צבי", rarity: "rare", unlockStreak: 7 },
  { id: "elephant", emoji: "🐘", name: "פיל", rarity: "rare", unlockStreak: 7 },
  { id: "lion", emoji: "🦁", name: "אריה", rarity: "rare", unlockStreak: 7 },
  { id: "tiger", emoji: "🐯", name: "נמר", rarity: "rare", unlockStreak: 7 },
  { id: "wolf", emoji: "🐺", name: "זאב", rarity: "rare", unlockStreak: 7 },
  { id: "monkey", emoji: "🐵", name: "קוף", rarity: "rare", unlockStreak: 7 },

  // Streak 14+ (4 — rare)
  { id: "polar-bear", emoji: "🐻‍❄️", name: "דב קוטב", rarity: "rare", unlockStreak: 14 },
  { id: "horse", emoji: "🐴", name: "סוס", rarity: "rare", unlockStreak: 14 },
  { id: "kangaroo", emoji: "🦘", name: "קנגורו", rarity: "rare", unlockStreak: 14 },
  { id: "octopus", emoji: "🐙", name: "תמנון", rarity: "rare", unlockStreak: 14 },

  // Streak 30+ (2 — epic)
  { id: "dragon", emoji: "🐉", name: "דרקון", rarity: "epic", unlockStreak: 30 },
  { id: "unicorn", emoji: "🦄", name: "חד-קרן", rarity: "epic", unlockStreak: 30 },
];

const ACTIVE_KEY = "bayit-pet-active-v1";
const COLLECTION_KEY = "bayit-pet-collection-v1";

export function getActivePet(): Pet {
  if (typeof window === "undefined") return PETS[0] as Pet;
  const id = localStorage.getItem(ACTIVE_KEY);
  return PETS.find((p) => p.id === id) ?? (PETS[0] as Pet);
}

export function setActivePet(petId: string): void {
  if (typeof window === "undefined") return;
  const pet = PETS.find((p) => p.id === petId);
  if (!pet) return;
  localStorage.setItem(ACTIVE_KEY, petId);
}

export function getCollection(): ReadonlySet<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function addToCollection(petId: string): boolean {
  if (typeof window === "undefined") return false;
  const c = new Set(getCollection());
  if (c.has(petId)) return false;
  c.add(petId);
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify([...c]));
    return true;
  } catch {
    return false;
  }
}

/** Sync collection with current streak — unlocks any pets the user has earned */
export function syncCollectionWithStreak(currentStreak: number): readonly Pet[] {
  const collected = getCollection();
  const newlyUnlocked: Pet[] = [];
  for (const pet of PETS) {
    if (pet.unlockStreak <= currentStreak && !collected.has(pet.id)) {
      if (addToCollection(pet.id)) newlyUnlocked.push(pet);
    }
  }
  return newlyUnlocked;
}

export function petsAtRarity(rarity: Rarity): readonly Pet[] {
  return PETS.filter((p) => p.rarity === rarity);
}
