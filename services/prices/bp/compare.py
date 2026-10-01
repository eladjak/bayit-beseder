"""Basket comparison. Pure functions over the SQLite store, so every rule below has a test.

Honesty rules (from the adversarial review, 1.10.2026):
  * Totals are only ranked over the SAME set of items ("the common basket").
    A store that is missing items is never "cheaper" because it is missing them.
  * Cost is what you pay at the till for whole packs that cover the quantity,
    not a per-litre figure. Per-unit price is used only to pick between packs.
  * A pinned product is binding: where it is not sold, the item is missing —
    never silently swapped for something else.
  * Extra words the family wrote ("ללא לקטוז", "3%") are hard constraints.
  * Stale stores (price file older than FRESH_HOURS) are shown but not ranked.
  * Promotions are shown as text only; their terms differ between chains.
"""
from __future__ import annotations

import math
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from .geo import haversine_km
from .match import Matcher, Rule, drop_outliers, norm

IL = ZoneInfo("Asia/Jerusalem")
FRESH_HOURS = 48
MAX_ITEMS = 200
MAX_QTY = 100

# words that do not constrain a product (filler / emoji leftovers / colours of "any colour")
STOP = {
    "של", "מכל", "כל", "צבע", "צבעים", "גדול", "גדולה", "קטן", "קטנה", "טרי", "טריים", "טריה",
    "יפה", "יפים", "אחד", "אחת", "שתי", "שני", "בבקשה", "חבילה", "חבילות", "קילו", "ק", "ג",
    "יח", "יחידות", "סוג", "מסוג", "רגיל", "רגילה", "רגילים", "או", "גם", "את", "ל", "ה",
}


@dataclass
class ItemReq:
    key: str
    canonical_id: Optional[str]
    qty: float = 1.0
    strict: list[str] = field(default_factory=list)
    pin_code: Optional[str] = None
    pin_chain: Optional[str] = None


def strict_tokens(title: str, rule: Rule) -> list[str]:
    """Words in the family's title that the canonical label does not cover.
    'חלב ללא לקטוז' with label 'חלב' -> ['ללא', 'לקטוז']."""
    covered = set()
    for s in [rule.label, *rule.aliases]:
        covered.update(norm(s).split())
    out = []
    for w in norm(re.sub(r"[^\w\s%]", " ", title)).split():
        if len(w) < 2 or w in covered or w in STOP or w.isdigit():
            continue
        out.append(w)
    return out


def is_gtin(code: str) -> bool:
    return code.isdigit() and len(code) in (8, 12, 13, 14) and code[:3] not in ("200", "201", "202")


def _packs_and_cost(rule: Rule, qty: float, price: float, dim: Optional[str], size: Optional[float], weighted: bool):
    """(packs, cost, normalised) for buying `qty` reference units, or None if the pack is unusable."""
    unit_norm = rule.normalised_price(price, dim, size, weighted)
    if unit_norm is None:
        return None
    if weighted:
        grams = (rule.ref if rule.dim == "g" else 1000.0) * qty
        return grams / 1000.0, round(price * grams / 1000.0, 2), unit_norm
    need = rule.ref * qty
    if rule.dim == "u":
        per_pack = size if (dim == "u" and size and size > 0) else 1.0
    else:
        per_pack = size
    packs = max(1, math.ceil(need / per_pack - 1e-9))
    return packs, round(packs * price, 2), unit_norm


def _fresh(published: Optional[str], now: datetime) -> bool:
    if not published:
        return False
    try:
        ts = datetime.fromisoformat(published).replace(tzinfo=IL)
    except ValueError:
        return False
    return now - ts <= timedelta(hours=FRESH_HOURS)


def price_item_in_store(con: sqlite3.Connection, chain: str, store_id: str, rule: Rule, req: ItemReq) -> Optional[dict]:
    if req.pin_code and req.pin_chain and chain != req.pin_chain and not is_gtin(req.pin_code):
        return None  # a chain-internal code means nothing in another chain
    if req.pin_code:
        rows = con.execute(
            "SELECT p.item_code, p.price, d.name, d.dim, d.size, d.weighted FROM prices p "
            "JOIN products d ON d.chain=p.chain AND d.item_code=p.item_code "
            "WHERE p.chain=? AND p.store_id=? AND p.item_code=?",
            (chain, store_id, req.pin_code),
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT p.item_code, p.price, d.name, d.dim, d.size, d.weighted FROM cand c "
            "JOIN prices p ON p.chain=c.chain AND p.item_code=c.item_code AND p.store_id=? "
            "JOIN products d ON d.chain=c.chain AND d.item_code=c.item_code "
            "WHERE c.chain=? AND c.canonical_id=?",
            (store_id, chain, rule.id),
        ).fetchall()
    options = []
    for code, price, name, dim, size, weighted in rows:
        if price is None or price <= 0:
            continue
        if req.strict and not req.pin_code:
            n = norm(name)
            ok = True
            for w in req.strict:
                neg = w.startswith("!")
                hit = re.search(rf"(?:^| )[הובלמשכ]?{re.escape(w.lstrip('!'))}", n) is not None
                if hit == neg:  # required word missing, or forbidden word present
                    ok = False
                    break
            if not ok:
                continue
        pc = _packs_and_cost(rule, req.qty, price, dim, size, bool(weighted))
        if pc is None and req.pin_code:
            # a pinned product outside the size window is still the family's product
            pc = (req.qty, round(price * req.qty, 2), price)
        if pc is None:
            continue
        options.append((pc, code, name, price, bool(weighted)))
    if not options:
        return None
    floor = drop_outliers([o[0][2] for o in options])
    options = [o for o in options if o[0][2] >= floor] or options
    (packs, cost, unit_norm), code, name, price, weighted = min(options, key=lambda o: (o[0][1], o[0][2]))
    promo = con.execute(
        "SELECT description FROM promos WHERE chain=? AND (store_id=? OR store_id='') AND item_code=? AND club_all=1 "
        "AND (end='' OR end >= ?) LIMIT 1",
        (chain, store_id, code, datetime.now(IL).strftime("%Y-%m-%d")),
    ).fetchone()
    return {
        "code": code, "name": name, "price": price, "packs": packs, "cost": cost,
        "weighted": weighted, "estimate": weighted, "promo": promo[0] if promo else None,
    }


def nearby_stores(con: sqlite3.Connection, origin: tuple[float, float], radius_km: float, per_chain: int,
                  online: bool) -> list[dict]:
    rows = con.execute(
        "SELECT s.chain, s.store_id, s.name, s.city, s.address, s.lat, s.lon, s.price_published, c.name_he "
        "FROM stores s JOIN chains c ON c.key=s.chain WHERE s.online=? AND s.lat IS NOT NULL",
        (int(online),),
    ).fetchall()
    by_chain: dict[str, list[dict]] = {}
    for chain, sid, name, city, address, lat, lon, pub, chain_name in rows:
        d = haversine_km(origin, (lat, lon))
        if d > radius_km:
            continue
        by_chain.setdefault(chain, []).append({
            "chain": chain, "chainName": chain_name, "storeId": sid, "name": name, "city": city,
            "address": address, "distanceKm": round(d, 1), "published": pub,
        })
    out = []
    for chain, lst in by_chain.items():
        has_prices = {r[0] for r in con.execute("SELECT DISTINCT store_id FROM prices WHERE chain=?", (chain,))}
        lst = [s for s in lst if s["storeId"] in has_prices]
        lst.sort(key=lambda s: s["distanceKm"])
        out.extend(lst[:per_chain])
    return out


def compare(con: sqlite3.Connection, matcher: Matcher, items: list[ItemReq], origin: tuple[float, float],
            radius_km: float = 20.0, per_chain: int = 3, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(IL)
    items = items[:MAX_ITEMS]
    for it in items:
        if not (isinstance(it.qty, (int, float)) and math.isfinite(it.qty) and 0 < it.qty <= MAX_QTY):
            it.qty = 1.0
    known = [it for it in items if it.canonical_id and it.canonical_id in matcher.by_id]
    unknown = [it.key for it in items if it not in known]

    def evaluate(stores: list[dict]) -> list[dict]:
        res = []
        for s in stores:
            lines = {}
            for it in known:
                rule = matcher.by_id[it.canonical_id]
                lines[it.key] = price_item_in_store(con, s["chain"], s["storeId"], rule, it)
            found = {k: v for k, v in lines.items() if v}
            res.append({**s, "fresh": _fresh(s.get("published"), now), "lines": lines,
                        "foundCount": len(found), "foundTotal": round(sum(v["cost"] for v in found.values()), 2)})
        return res

    physical = evaluate(nearby_stores(con, origin, radius_km, per_chain, online=False))
    online = evaluate(nearby_stores(con, origin, radius_km, 2, online=True))

    # best store per chain: most items found, then cheapest on what it found
    best_by_chain: dict[str, dict] = {}
    for s in physical:
        if not s["fresh"]:
            continue
        cur = best_by_chain.get(s["chain"])
        if cur is None or (s["foundCount"], -s["foundTotal"]) > (cur["foundCount"], -cur["foundTotal"]):
            best_by_chain[s["chain"]] = s
    ranked = list(best_by_chain.values())

    common = [it.key for it in known if ranked and all(s["lines"].get(it.key) for s in ranked)]
    for s in ranked:
        s["commonTotal"] = round(sum(s["lines"][k]["cost"] for k in common), 2)
        s["missing"] = [it.key for it in known if not s["lines"].get(it.key)]
    ranked.sort(key=lambda s: s["commonTotal"])

    verdict = None
    if len(ranked) >= 2 and common:
        full = len(common) == len(known)
        cheapest, dearest = ranked[0], ranked[-1]
        verdict = {
            "storeKey": f'{cheapest["chain"]}:{cheapest["storeId"]}',
            "basis": "full" if full else "common",
            "commonCount": len(common),
            "itemsMatched": len(known),
            "savingVsDearest": round(dearest["commonTotal"] - cheapest["commonTotal"], 2),
        }

    split = None
    if len(ranked) >= 2:
        a, b = ranked[0], ranked[1]
        keys = [it.key for it in known if a["lines"].get(it.key) and b["lines"].get(it.key)]
        if keys:
            single = min(sum(a["lines"][k]["cost"] for k in keys), sum(b["lines"][k]["cost"] for k in keys))
            pick = {k: ("a" if a["lines"][k]["cost"] <= b["lines"][k]["cost"] else "b") for k in keys}
            split_total = sum(min(a["lines"][k]["cost"], b["lines"][k]["cost"]) for k in keys)
            if single - split_total >= 5:
                split = {
                    "a": f'{a["chain"]}:{a["storeId"]}', "b": f'{b["chain"]}:{b["storeId"]}',
                    "pick": pick, "itemCount": len(keys),
                    "saving": round(single - split_total, 2),
                    "note": "פער במחירי המוצרים בלבד, בלי זמן ונסיעה",
                }

    chains = [
        {"key": k, "name": n, "lastOk": ok, "lastRunFailed": bool(err), "onlineOnly": bool(oo)}
        for k, n, ok, err, oo in con.execute(
            "SELECT key, name_he, last_ok_at, last_error, online_only FROM chains ORDER BY key")
    ]
    return {
        "generatedAt": now.isoformat(timespec="seconds"),
        "items": [{"key": it.key, "canonicalId": it.canonical_id, "qty": it.qty, "strict": it.strict,
                   "pinned": bool(it.pin_code)} for it in items],
        "unknownItems": unknown,
        "ranked": ranked,
        "otherStores": [s for s in physical if s not in ranked],
        "online": online,
        "commonKeys": common,
        "verdict": verdict,
        "split": split,
        "chains": chains,
    }
