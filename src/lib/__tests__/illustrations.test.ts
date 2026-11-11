import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ILLUSTRATIONS } from "../illustrations";

describe("illustration assets", () => {
  it("covers all 38 originals with bilingual descriptions and correctly sized variants", async () => {
    expect(Object.keys(ILLUSTRATIONS)).toHaveLength(39);
    for (const item of Object.values(ILLUSTRATIONS)) {
      expect(item.alt.he.trim()).not.toBe("");
      expect(item.alt.en.trim()).not.toBe("");
      for (const [src, width] of [[item.src480, 480], [item.src960, 960]] as const) {
        const file = path.join(process.cwd(), "public", src);
        expect(existsSync(file), src).toBe(true);
        if (width === 960) expect(statSync(file).size, src).toBeLessThan(120_000);
        const metadata = await sharp(file).metadata();
        expect(metadata.width, src).toBe(width);
        expect(metadata.height, src).toBe(Math.round(item.height * width / item.width));
      }
    }
  });
});

describe("V-02 state illustrations", () => {
  it("provides every planned state with bilingual alt text and both responsive assets", () => {
    const ids = ["stateNoHousehold"] as const;
    for (const id of ids) {
      const item = (ILLUSTRATIONS as Record<string, { src480: string; src960: string; alt: { he: string; en: string } }>)[id];
      expect(item, `missing ${id}`).toBeDefined();
      expect(item.alt.he.trim(), id).not.toBe("");
      expect(item.alt.en.trim(), id).not.toBe("");
      expect(existsSync(path.join(process.cwd(), "public", item.src480)), id).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", item.src960)), id).toBe(true);
    }
  });
});
