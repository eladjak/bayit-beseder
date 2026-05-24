/**
 * Household Type — Sprint 7.30+ Elad: "couples + families + roommates + kids".
 *
 * Stored in localStorage + (future) sync to profiles.household_type.
 * Drives onboarding branches + UI copy + which features show.
 */

export type HouseholdType = "couple" | "family" | "roommates" | "solo";

export type HouseholdConfig = {
  readonly type: HouseholdType;
  readonly hasKids: boolean;
  readonly memberCount: number;
};

export const DEFAULT_HOUSEHOLD: HouseholdConfig = {
  type: "couple",
  hasKids: false,
  memberCount: 2,
};

const STORAGE_KEY = "bayit-household-type-v1";

export function loadHousehold(): HouseholdConfig {
  if (typeof window === "undefined") return DEFAULT_HOUSEHOLD;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOUSEHOLD;
    return { ...DEFAULT_HOUSEHOLD, ...JSON.parse(raw) } as HouseholdConfig;
  } catch {
    return DEFAULT_HOUSEHOLD;
  }
}

export function saveHousehold(cfg: HouseholdConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // quota
  }
}

export const TYPE_LABELS: Record<
  HouseholdType,
  { label: string; emoji: string; desc: string; illustration: string }
> = {
  couple: {
    label: "זוג",
    emoji: "👫",
    desc: "אני והשותף/ה — לחלק את הבית יפה ובלי ויכוחים",
    illustration: "/illustrations/household-couple.jpg",
  },
  family: {
    label: "משפחה",
    emoji: "👨‍👩‍👧",
    desc: "הורים וילדים — מנהלים את הבית ביחד, כל אחד תורם",
    illustration: "/illustrations/household-family.jpg",
  },
  roommates: {
    label: "שותפים",
    emoji: "🤝",
    desc: "שותפים לדירה — חלוקה הוגנת ושקטה, בלי דרמות",
    illustration: "/illustrations/household-roommates.jpg",
  },
  solo: {
    label: "אני לבד",
    emoji: "🙋",
    desc: "מארגן/ת את הבית שלי, בקצב שלי",
    illustration: "/illustrations/household-solo.jpg",
  },
};
