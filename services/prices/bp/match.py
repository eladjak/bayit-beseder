"""Canonical item rules: which chain products count as "חלב", and how to price them.

A rule is deliberately simple and readable so a wrong match can be fixed by a
human in the JSON, not by retraining anything:
  include: list of alternatives; an alternative is a list of words that must
           ALL appear in the product name (normalised).
  exclude: words that disqualify a product.
  dim/ref/min/max: pack dimension (g / ml / u), the reference amount a price is
           normalised to, and the pack-size window that counts as "a normal pack".
  weighted: whether a per-kg product may stand in (produce, meat).
"""
from __future__ import annotations

import json
import re
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

_NIQQUD = re.compile(r"[֑-ׇ‎‏‪-‮⁦-⁩﻿]")  # + bidi controls (wolt)
_PUNCT = re.compile(r"[\"'`´׳״“”‘’\-_/\\.,()\[\]{}+*%!?:;|]")
_FINALS = str.maketrans({"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"})


def norm(text: str) -> str:
    """Lower-case, drop niqqud/punctuation, unify final letters, collapse spaces.
    Digits are kept (3%, 500 גרם) because they distinguish products."""
    t = _NIQQUD.sub("", text or "").lower()
    t = _PUNCT.sub(" ", t)
    t = t.translate(_FINALS)
    return " " + re.sub(r"\s+", " ", t).strip() + " "


def _word_in(word: str, name: str) -> bool:
    """Whole-word-ish containment. A leading ^ anchors to a word start, so
    'חלב' does not match inside 'מחלבה' but does match 'חלב' and 'החלב'."""
    w = norm(word).strip()
    if not w:
        return False
    if word.startswith("="):  # whole word (one optional prefix letter), nothing glued after it
        x = norm(word[1:]).strip()
        return re.search(rf"(?:^| )[הובלמשכ]?{re.escape(x)}(?= |$)", name) is not None
    # word start, allowing one Hebrew prefix letter (ה ו ב ל מ ש כ)
    return re.search(rf"(?:^| )[הובלמשכ]?{re.escape(w)}", name) is not None


@dataclass
class Rule:
    id: str
    label: str
    aliases: list[str]
    include: list[list[str]]
    exclude: list[str] = field(default_factory=list)
    dim: str = "u"
    ref: float = 1.0
    min: Optional[float] = None
    max: Optional[float] = None
    weighted: bool = False
    packaged: bool = True
    category: str = ""

    def matches(self, name: str, weighted: bool) -> bool:
        if weighted and not self.weighted:
            return False
        if not weighted and not self.packaged:
            return False
        n = norm(name)
        if any(_word_in(x, n) for x in self.exclude):
            return False
        return any(all(_word_in(w, n) for w in alt) for alt in self.include)

    def normalised_price(self, price: float, dim: Optional[str], size: Optional[float], weighted: bool) -> Optional[float]:
        """Price for `ref` of this item, or None when the pack is outside the window."""
        if weighted:
            # weighted ItemPrice is per kg; ref is in grams for g-items, else 1 kg
            grams = self.ref if self.dim == "g" else 1000.0
            return round(price * grams / 1000.0, 4)
        if self.dim == "u":
            if dim not in (None, "u"):
                # a 'u' item sold by weight/volume (e.g. a pack of pasta when the
                # rule counts packs): one pack is one unit
                count = 1.0
            else:
                count = size if (size and size > 0) else 1.0
            if self.min is not None and count < self.min:
                return None
            if self.max is not None and count > self.max:
                return None
            return round(price / count * self.ref, 4)
        if dim != self.dim or not size or size <= 0:
            return None
        if self.min is not None and size < self.min:
            return None
        if self.max is not None and size > self.max:
            return None
        return round(price / size * self.ref, 4)


def load_rules(path: str | Path) -> list[Rule]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    items = data["items"] if isinstance(data, dict) else data
    out = []
    for it in items:
        out.append(
            Rule(
                id=it["id"],
                label=it["label"],
                aliases=it.get("aliases", []),
                include=it["include"],
                exclude=it.get("exclude", []),
                dim=it.get("dim", "u"),
                ref=float(it.get("ref", 1)),
                min=it.get("min"),
                max=it.get("max"),
                weighted=bool(it.get("weighted", False)),
                packaged=bool(it.get("packaged", True)),
                category=it.get("category", ""),
            )
        )
    ids = [r.id for r in out]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate canonical ids")
    return out


class Matcher:
    def __init__(self, rules: list[Rule]):
        self.rules = rules
        self.by_id = {r.id: r for r in rules}
        # first include word of each alternative -> rules, to avoid testing 300 rules per product
        self._index: dict[str, list[Rule]] = {}
        for r in rules:
            for alt in r.include:
                key = norm(alt[0].lstrip("=")).strip().split(" ")[0]
                self._index.setdefault(key, []).append(r)

    def match(self, name: str, weighted: bool) -> list[str]:
        n = norm(name)
        seen: set[str] = set()
        out: list[str] = []
        for key, rules in self._index.items():
            if key not in n:
                continue
            for r in rules:
                if r.id in seen:
                    continue
                seen.add(r.id)
                if r.matches(name, weighted):
                    out.append(r.id)
        return out


def drop_outliers(values: list[float], floor_ratio: float = 0.3) -> float:
    """Lower bound under which a normalised price is treated as a data error
    (a ₪0.10 placeholder, a per-gram price typed as per-pack)."""
    if len(values) < 4:
        return 0.0
    return statistics.median(values) * floor_ratio
