/**
 * Unit tests for category helpers.
 * Tests labels, colors, icons, CATEGORY_NAME_TO_KEY / CATEGORY_KEY_TO_NAME mappings,
 * and that all keys are consistent.
 */

import { describe, it, expect } from "vitest";
import {
  CATEGORY_KEYS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_NAME_TO_KEY,
  CATEGORY_KEY_TO_NAME,
  CATEGORY_FILTER_KEYS,
  CATEGORY_BG_CLASSES,
  CATEGORY_ILLUSTRATIONS,
  getCategoryColor,
  getCategoryLabel,
  getCategoryIcon,
} from "@/lib/categories";

// ============================================
// CATEGORY_KEYS
// ============================================

describe("CATEGORY_KEYS", () => {
  it("contains exactly 8 categories", () => {
    expect(CATEGORY_KEYS).toHaveLength(8);
  });

  it("includes the expected category keys", () => {
    const expected = ["kitchen", "bathroom", "living", "bedroom", "laundry", "outdoor", "pets", "general"];
    for (const key of expected) {
      expect(CATEGORY_KEYS).toContain(key);
    }
  });
});

// ============================================
// CATEGORY_FILTER_KEYS
// ============================================

describe("CATEGORY_FILTER_KEYS", () => {
  it("starts with 'all'", () => {
    expect(CATEGORY_FILTER_KEYS[0]).toBe("all");
  });

  it("contains all CATEGORY_KEYS after 'all'", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_FILTER_KEYS).toContain(key);
    }
  });

  it("has length = CATEGORY_KEYS.length + 1", () => {
    expect(CATEGORY_FILTER_KEYS).toHaveLength(CATEGORY_KEYS.length + 1);
  });
});

// ============================================
// CATEGORY_COLORS
// ============================================

describe("CATEGORY_COLORS", () => {
  it("has an entry for every category key", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_COLORS).toHaveProperty(key);
    }
  });

  it("all color values are non-empty strings", () => {
    for (const key of CATEGORY_KEYS) {
      expect(typeof CATEGORY_COLORS[key]).toBe("string");
      expect(CATEGORY_COLORS[key]).not.toBe("");
    }
  });

  it("all color values start with # (hex)", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

// ============================================
// CATEGORY_LABELS
// ============================================

describe("CATEGORY_LABELS", () => {
  it("has an entry for every category key plus 'all'", () => {
    for (const key of CATEGORY_FILTER_KEYS) {
      expect(CATEGORY_LABELS).toHaveProperty(key);
    }
  });

  it("all label values are non-empty strings", () => {
    for (const key of CATEGORY_FILTER_KEYS) {
      expect(typeof CATEGORY_LABELS[key]).toBe("string");
      expect(CATEGORY_LABELS[key]).not.toBe("");
    }
  });
});

// ============================================
// CATEGORY_ICONS
// ============================================

describe("CATEGORY_ICONS", () => {
  it("has an entry for every category key", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_ICONS).toHaveProperty(key);
    }
  });

  it("all icon values are non-empty strings", () => {
    for (const key of CATEGORY_KEYS) {
      expect(typeof CATEGORY_ICONS[key]).toBe("string");
      expect(CATEGORY_ICONS[key]).not.toBe("");
    }
  });
});

// ============================================
// CATEGORY_BG_CLASSES
// ============================================

describe("CATEGORY_BG_CLASSES", () => {
  it("has an entry for every category key", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_BG_CLASSES).toHaveProperty(key);
    }
  });

  it("all bg-class values start with 'bg-'", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_BG_CLASSES[key]).toMatch(/^bg-/);
    }
  });
});

// ============================================
// CATEGORY_ILLUSTRATIONS
// ============================================

describe("CATEGORY_ILLUSTRATIONS", () => {
  it("has an entry for every category key", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_ILLUSTRATIONS).toHaveProperty(key);
    }
  });

  it("all paths start with /illustrations/", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_ILLUSTRATIONS[key]).toMatch(/^\/illustrations\//);
    }
  });
});

// ============================================
// CATEGORY_NAME_TO_KEY / CATEGORY_KEY_TO_NAME bidirectional mapping
// ============================================

describe("CATEGORY_NAME_TO_KEY", () => {
  it("maps Hebrew names to valid category keys", () => {
    for (const [, value] of Object.entries(CATEGORY_NAME_TO_KEY)) {
      expect(CATEGORY_KEYS).toContain(value);
    }
  });

  it("has an entry for each expected Hebrew name", () => {
    const hebrewNames = ["מטבח", "אמבטיה", "סלון", "חדר שינה", "כביסה", "חוץ", "חיות מחמד", "כללי"];
    for (const name of hebrewNames) {
      expect(CATEGORY_NAME_TO_KEY).toHaveProperty(name);
    }
  });
});

describe("CATEGORY_KEY_TO_NAME", () => {
  it("has an entry for each CATEGORY_KEY", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_KEY_TO_NAME).toHaveProperty(key);
    }
  });

  it("all name values are non-empty Hebrew strings", () => {
    for (const key of CATEGORY_KEYS) {
      const name = CATEGORY_KEY_TO_NAME[key];
      expect(typeof name).toBe("string");
      expect(name).not.toBe("");
    }
  });
});

describe("CATEGORY_NAME_TO_KEY and CATEGORY_KEY_TO_NAME are inverse mappings", () => {
  it("roundtrip key → name → key is identity", () => {
    for (const key of CATEGORY_KEYS) {
      const name = CATEGORY_KEY_TO_NAME[key];
      const backToKey = CATEGORY_NAME_TO_KEY[name];
      expect(backToKey).toBe(key);
    }
  });

  it("roundtrip name → key → name is identity", () => {
    for (const [name, key] of Object.entries(CATEGORY_NAME_TO_KEY)) {
      const backToName = CATEGORY_KEY_TO_NAME[key];
      expect(backToName).toBe(name);
    }
  });
});

// ============================================
// getCategoryColor
// ============================================

describe("getCategoryColor", () => {
  it("returns the correct color for known keys", () => {
    expect(getCategoryColor("kitchen")).toBe(CATEGORY_COLORS["kitchen"]);
    expect(getCategoryColor("bathroom")).toBe(CATEGORY_COLORS["bathroom"]);
  });

  it("returns fallback gray for unknown key", () => {
    expect(getCategoryColor("unknown-category")).toBe("#6B7280");
  });
});

// ============================================
// getCategoryLabel
// ============================================

describe("getCategoryLabel", () => {
  it("returns the correct label for known keys", () => {
    expect(getCategoryLabel("kitchen")).toBe(CATEGORY_LABELS["kitchen"]);
    expect(getCategoryLabel("all")).toBe(CATEGORY_LABELS["all"]);
  });

  it("returns the raw key for unknown key (fallback)", () => {
    const unknownKey = "mystery-room";
    expect(getCategoryLabel(unknownKey)).toBe(unknownKey);
  });
});

// ============================================
// getCategoryIcon
// ============================================

describe("getCategoryIcon", () => {
  it("returns the correct icon for known keys", () => {
    expect(getCategoryIcon("kitchen")).toBe(CATEGORY_ICONS["kitchen"]);
    expect(getCategoryIcon("pets")).toBe(CATEGORY_ICONS["pets"]);
  });

  it("returns the house emoji fallback for unknown key", () => {
    expect(getCategoryIcon("unknown")).toBe("🏠");
  });
});
