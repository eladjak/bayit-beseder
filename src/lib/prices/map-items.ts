/**
 * Free-text shopping list title -> canonical price item + hard constraints.
 *
 * "חלב" -> { canonicalId: "milk-…", strict: [] }
 * "חלב ללא לקטוז" -> { canonicalId: "milk-…", strict: ["ללא", "לקטוז"] }
 * Words the family wrote that the canonical label does not cover become hard
 * constraints on the product name (the price server enforces them). Only the
 * canonical id, the quantity and these words leave the app; never the title.
 */
import { classifyItem } from "@/lib/shopping-taxonomy";
import catalog from "./canonical-items.json";

export interface CanonicalItem {
  id: string;
  label: string;
  aliases: string[];
  category?: string;
  dim?: string;
  ref?: number;
  weighted?: boolean;
}

export interface MappedItem {
  canonicalId: string | null;
  label: string | null;
  strict: string[];
}

const ITEMS: CanonicalItem[] = (catalog as { items: CanonicalItem[] }).items;

// Same normalisation as services/prices/bp/match.py `norm`
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
export function norm(text: string): string {
  return (text ?? "")
    .replace(/[֑-ׇ‎‏‪-‮⁦-⁩﻿]/g, "")
    .toLowerCase()
    .replace(/["'`´׳״“”‘’\-_/\\.,()[\]{}+*%!?:;|]/g, " ")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, " ")
    .trim();
}

// Same list as STOP in services/prices/bp/compare.py
const STOP = new Set([
  "של", "מכל", "כל", "צבע", "צבעים", "גדול", "גדולה", "קטן", "קטנה", "טרי", "טריים", "טריה",
  "יפה", "יפים", "אחד", "אחת", "שתי", "שני", "בבקשה", "חבילה", "חבילות", "קילו", "ק", "ג",
  "יח", "יחידות", "סוג", "מסוג", "רגיל", "רגילה", "רגילים", "או", "גם", "את", "ל", "ה",
]);

const BY_ALIAS = new Map<string, CanonicalItem>();
for (const it of ITEMS) {
  for (const a of [it.label, ...it.aliases]) {
    const k = norm(a);
    if (k && !BY_ALIAS.has(k)) BY_ALIAS.set(k, it);
  }
}

export function listCanonicalItems(): readonly CanonicalItem[] {
  return ITEMS;
}

export function getCanonicalItem(id: string): CanonicalItem | undefined {
  return ITEMS.find((i) => i.id === id);
}

function cleanTitle(title: string): string {
  // drop emoji and symbols, keep Hebrew/Latin letters, digits and %
  return title.replace(/[^\p{L}\p{N}%\s'"׳״-]/gu, " ");
}

function strictWords(title: string, item: CanonicalItem): string[] {
  const covered = new Set<string>();
  for (const s of [item.label, ...item.aliases]) for (const w of norm(s).split(" ")) covered.add(w);
  const words = norm(cleanTitle(title)).split(" ").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // "לא פרווה": a negation, not a word the product name will contain
    if (w === "לא") {
      i++;
      continue;
    }
    if (w.length < 2 || covered.has(w) || STOP.has(w) || /^\d+$/.test(w)) continue;
    // plural / suffix of a covered word ("פלפלים" vs "פלפל") is not a new constraint
    if ([...covered].some((c) => c.length >= 2 && (w.startsWith(c) || c.startsWith(w)))) continue;
    out.push(w);
  }
  return out.slice(0, 6);
}

export function mapTitle(title: string): MappedItem {
  const t = cleanTitle(title);
  const n = norm(t);
  if (!n) return { canonicalId: null, label: null, strict: [] };

  let item: CanonicalItem | undefined = BY_ALIAS.get(n);
  if (!item) {
    const cls = classifyItem(t);
    if (cls) item = BY_ALIAS.get(norm(cls.matched));
  }
  if (!item) {
    // longest alias contained as whole words in the title
    const padded = ` ${n} `;
    let best: { k: string; it: CanonicalItem } | null = null;
    for (const [k, it] of BY_ALIAS) {
      if (padded.includes(` ${k} `) && (!best || k.length > best.k.length)) best = { k, it };
    }
    item = best?.it;
  }
  if (!item) return { canonicalId: null, label: null, strict: [] };
  return { canonicalId: item.id, label: item.label, strict: strictWords(t, item) };
}
