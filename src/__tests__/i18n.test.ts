/**
 * Unit tests for the i18n translation system.
 * Verifies key parity between he.json and en.json, no empty string values,
 * and that the locale helpers in src/lib/i18n/index.ts are correct.
 */

import { describe, it, expect } from "vitest";
import heRaw from "@/lib/i18n/dictionaries/he.json";
import enRaw from "@/lib/i18n/dictionaries/en.json";
import { getDirection } from "@/lib/i18n/index";

// ============================================
// Helpers
// ============================================

type JsonDict = { [key: string]: string | JsonDict };

/**
 * Recursively collect all dot-notation paths for leaf string values.
 * e.g. { nav: { home: "ראשי" } } → ["nav.home"]
 */
function collectLeafPaths(obj: JsonDict, prefix = ""): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      paths.push(path);
    } else if (typeof value === "object" && value !== null) {
      paths.push(...collectLeafPaths(value as JsonDict, path));
    }
  }
  return paths;
}

/**
 * Resolve a dot-path inside a JSON dict.
 * Returns undefined if the path doesn't exist.
 */
function getNestedValue(obj: JsonDict, dotPath: string): string | JsonDict | undefined {
  return dotPath.split(".").reduce<string | JsonDict | undefined>((acc, key) => {
    if (acc === undefined || typeof acc === "string") return undefined;
    return (acc as JsonDict)[key];
  }, obj);
}

const he = heRaw as unknown as JsonDict;
const en = enRaw as unknown as JsonDict;

const hePaths = collectLeafPaths(he);
const enPaths = collectLeafPaths(en);

// ============================================
// Key parity
// ============================================

describe("i18n key parity", () => {
  it("every key in he.json exists in en.json", () => {
    const missing = hePaths.filter((p) => !enPaths.includes(p));
    if (missing.length > 0) {
      console.warn("Keys in he.json missing from en.json:", missing);
    }
    expect(missing).toHaveLength(0);
  });

  it("every key in en.json exists in he.json", () => {
    const missing = enPaths.filter((p) => !hePaths.includes(p));
    if (missing.length > 0) {
      console.warn("Keys in en.json missing from he.json:", missing);
    }
    expect(missing).toHaveLength(0);
  });

  it("he.json and en.json have the same number of leaf keys", () => {
    expect(hePaths.length).toBe(enPaths.length);
  });
});

// ============================================
// No empty values
// ============================================

describe("i18n no empty strings", () => {
  it("he.json has no empty string values", () => {
    const empty = hePaths.filter((p) => getNestedValue(he, p) === "");
    expect(empty).toHaveLength(0);
  });

  it("en.json has no empty string values", () => {
    const empty = enPaths.filter((p) => getNestedValue(en, p) === "");
    expect(empty).toHaveLength(0);
  });
});

// ============================================
// getNestedValue helper (unit test of the helper itself)
// ============================================

describe("getNestedValue", () => {
  const dict: JsonDict = {
    nav: { home: "Home", tasks: "Tasks" },
    common: { save: "Save" },
  };

  it("resolves a single-level key", () => {
    // top-level object
    expect(typeof getNestedValue(dict, "nav")).toBe("object");
  });

  it("resolves a nested dot path", () => {
    expect(getNestedValue(dict, "nav.home")).toBe("Home");
  });

  it("resolves a deep nested dot path", () => {
    expect(getNestedValue(dict, "common.save")).toBe("Save");
  });

  it("returns undefined for a missing key", () => {
    expect(getNestedValue(dict, "nav.missing")).toBeUndefined();
  });

  it("returns undefined for a path that goes through a leaf", () => {
    expect(getNestedValue(dict, "nav.home.extra")).toBeUndefined();
  });
});

// ============================================
// collectLeafPaths
// ============================================

describe("collectLeafPaths", () => {
  it("collects all leaf paths from a nested dict", () => {
    const dict: JsonDict = { a: { b: "1", c: { d: "2" } }, e: "3" };
    const paths = collectLeafPaths(dict);
    expect(paths).toEqual(expect.arrayContaining(["a.b", "a.c.d", "e"]));
    expect(paths).toHaveLength(3);
  });

  it("returns empty array for an empty dict", () => {
    expect(collectLeafPaths({})).toHaveLength(0);
  });
});

// ============================================
// getDirection (from src/lib/i18n/index.ts)
// ============================================

describe("getDirection", () => {
  it("returns rtl for Hebrew locale", () => {
    expect(getDirection("he")).toBe("rtl");
  });

  it("returns ltr for English locale", () => {
    expect(getDirection("en")).toBe("ltr");
  });
});

// ============================================
// Spot-check: key navigation entries match between locales
// ============================================

describe("i18n spot-check nav keys", () => {
  const navKeys = ["home", "tasks", "shopping", "weekly", "stats", "settings"];

  for (const key of navKeys) {
    it(`nav.${key} exists and is non-empty in both locales`, () => {
      const heVal = getNestedValue(he, `nav.${key}`);
      const enVal = getNestedValue(en, `nav.${key}`);
      expect(typeof heVal).toBe("string");
      expect(typeof enVal).toBe("string");
      expect(heVal).not.toBe("");
      expect(enVal).not.toBe("");
    });
  }
});
