/**
 * RED-FIRST for fix #3 (adversarial review, PR #13): `safeEqual` in auth.ts
 * used to branch on raw buffer length (`if (bufA.length !== bufB.length)`)
 * before calling `timingSafeEqual` — that branch itself leaks how the
 * presented token's length compares to the secret's length, independent of
 * `timingSafeEqual`'s own constant-time guarantee (which only covers the
 * comparison it is actually given, not the code deciding whether to call it
 * at all).
 *
 * There is no black-box return-value assertion that distinguishes "branches
 * on length" from "digest-compares first" — both implementations return the
 * same true/false for the same inputs. The only thing that actually differs
 * is the absence of a length-dependent code path, which this test verifies
 * directly against the source: the fixed version hashes both operands to a
 * fixed-size SHA-256 digest before comparing, so no branch on the RAW
 * input's length is possible.
 *
 * Against the pre-fix auth.ts, this test fails on both assertions: the old
 * source contains `bufA.length !== bufB.length` and does not hash the inputs
 * before comparing.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const authSrc = readFileSync(resolve(__dirname, "..", "auth.ts"), "utf8");

describe("auth.ts safeEqual — no length-dependent branch before the constant-time compare", () => {
  it("does not compare raw buffer lengths before calling timingSafeEqual", () => {
    expect(authSrc).not.toMatch(/bufA\.length\s*!==\s*bufB\.length/);
    expect(authSrc).not.toMatch(/Buffer\.alloc\(bufA\.length\)/);
  });

  it("normalizes both operands to a fixed-size digest before the constant-time compare", () => {
    expect(authSrc).toMatch(/createHash\(\s*["']sha256["']\s*\)/);
    // The two digests must both be produced via createHash — a single call
    // would not normalize both sides.
    const digestCalls = authSrc.match(/createHash\(\s*["']sha256["']\s*\)/g) ?? [];
    expect(digestCalls.length).toBeGreaterThanOrEqual(2);
  });
});
