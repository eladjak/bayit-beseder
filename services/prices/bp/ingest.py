"""Daily ingestion: list -> download -> parse -> write one chain per transaction.

A chain that fails keeps yesterday's rows and is marked with last_error, so the
app can say "data from <date>" instead of silently dropping the chain.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import os
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

from . import parse
from .db import connect
from .match import Matcher, load_rules
from .sources import CHAINS, IL, SHUFERSAL_KIND_ORDER, Chain, Fetcher, FileRef, list_shufersal, store_from_name

MIN_OK_RATIO = 0.8  # a chain run with fewer parsed price files than this is rejected


def _now() -> str:
    return datetime.now(IL).isoformat(timespec="seconds")


_STORE_WIDE = __import__("re").compile(r"קופון|מתנה|סיבוס|סודקסו|תו קנייה|תווי|שובר|כרטיס|נקודות|ע\. ")


def is_item_promo(description: str, items_in_promo: int) -> bool:
    """Keep promotions about specific products. Store-wide offers ('Cibus coupon
    50 ₪ gift', 'buy for 99 ₪ get a cooler') list thousands of items and say
    nothing about this product's price: measured 1.10.2026 on Shufersal milk."""
    return items_in_promo <= 40 and not _STORE_WIDE.search(description or "")


def published_stamp(name: str) -> str:
    """'PriceFull7290027600007-001-001-20261001-020000.gz' -> '2026-10-01T02:00'."""
    import re

    m = re.search(r"-(20\d{6})-?(\d{2})(\d{2})", name)
    if not m:
        return ""
    d = m.group(1)
    return f"{d[:4]}-{d[4:6]}-{d[6:]}T{m.group(2)}:{m.group(3)}"


def _download(f: Fetcher, refs: list[FileRef], raw_dir: Path, workers: int = 2) -> dict[str, bytes | Exception]:
    raw_dir.mkdir(parents=True, exist_ok=True)

    def one(r: FileRef):
        try:
            data = (r.session or f).get(r.url)  # Cerberus files ride on the logged-in session
            (raw_dir / r.name.split("?")[0]).write_bytes(data)
            return r.name, data
        except Exception as e:  # recorded per file; the ratio decides the chain
            return r.name, e

    out: dict[str, bytes | Exception] = {}
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for name, res in ex.map(one, refs):
            out[name] = res
    return out


def ingest_chain(con: sqlite3.Connection, chain: Chain, matcher: Matcher, f: Fetcher, raw_root: Path,
                 refs: list[FileRef] | None = None, payloads: dict | None = None) -> dict:
    started = _now()
    con.execute(
        "INSERT INTO chains(key, chain_id, name_he, online_only, last_attempt_at) VALUES(?,?,?,?,?) "
        "ON CONFLICT(key) DO UPDATE SET last_attempt_at=excluded.last_attempt_at, name_he=excluded.name_he, online_only=excluded.online_only",
        (chain.key, chain.chain_id, chain.name_he, int(chain.online_only), started),
    )
    con.commit()
    try:
        raw_dir = raw_root / datetime.now(IL).strftime("%Y%m%d") / chain.key
        if refs is None and chain.key == "shufersal":
            # signed links expire an hour after listing: list and fetch one kind at a time
            refs, payloads = [], {}
            for kind in SHUFERSAL_KIND_ORDER:
                rk = list_shufersal(f, kinds=(kind,))
                refs.extend(rk)
                payloads.update(_download(f, rk, raw_dir))
        refs = refs if refs is not None else chain.lister(f)
        payloads = payloads if payloads is not None else _download(f, refs, raw_dir)

        stores, products, cand, prices, promos = [], {}, set(), [], []
        code_cache: dict[str, list[str]] = {}
        store_pub: dict[str, str] = {}
        header_chains: set[str] = set()
        ok = failed = 0
        price_refs = [r for r in refs if r.kind == "pricefull"]
        for r in refs:
            data = payloads.get(r.name)
            if isinstance(data, Exception) or data is None:
                failed += 1
                continue
            try:
                stream = parse.open_payload(data)
                if r.kind == "stores":
                    _, it = parse.iter_stores(stream)
                    for s in it:
                        stores.append(s)
                elif r.kind == "pricefull":
                    header, it = parse.iter_prices(stream)
                    rows = list(it)
                    file_chain = (header.get("chainid") or "").strip()
                    if file_chain and file_chain != chain.chain_id:
                        # the header is the chain's own word on whose file this is
                        raise ValueError(f"file header chain {file_chain} != {chain.chain_id}")
                    header_chains.add(file_chain or "?")
                    store_id = (header.get("storeid") or "").lstrip("0")
                    if not store_id:
                        store_id = store_from_name(r.name) or "0"
                    for p in rows:
                        ids = code_cache.get(p.item_code)
                        if ids is None:
                            ids = matcher.match(p.name, p.weighted)
                            code_cache[p.item_code] = ids
                        if not ids:
                            continue
                        if p.item_code not in products:
                            dim, size = parse.pack_size(p.qty, p.unit_qty, p.name)
                            products[p.item_code] = (p.name, p.manufacturer, dim, size, int(p.weighted))
                        for cid in ids:
                            cand.add((cid, p.item_code))
                        prices.append((store_id, p.item_code, p.price, p.updated))
                    store_pub[store_id] = published_stamp(r.name)
                    ok += 1
                elif r.kind == "promofull":
                    pass  # second pass below, needs the candidate set
            except Exception as e:
                failed += 1
                print(f"[{chain.key}] parse failed {r.name}: {e}", file=sys.stderr)
        if not price_refs or ok < MIN_OK_RATIO * len(price_refs):
            raise RuntimeError(f"only {ok}/{len(price_refs)} price files parsed")

        prev = con.execute("SELECT stores, products FROM chains WHERE key=? AND last_ok_at IS NOT NULL", (chain.key,)).fetchone()
        if prev and prev[0] and prev[1]:
            if len(stores) < 0.7 * prev[0] or len(products) < 0.6 * prev[1]:
                raise RuntimeError(
                    f"snapshot shrank too much (stores {prev[0]}->{len(stores)}, products {prev[1]}->{len(products)}); keeping previous"
                )

        wanted = {c for _, c in cand}
        for r in refs:
            if r.kind != "promofull":
                continue
            data = payloads.get(r.name)
            if isinstance(data, Exception) or data is None:
                continue
            store_id = store_from_name(r.name)  # both name shapes; "" if unrecognised
            try:
                rows = list(parse.iter_promos(parse.open_payload(data)))
                size: dict[str, int] = {}
                for pi in rows:
                    size[pi.promotion_id] = size.get(pi.promotion_id, 0) + 1
                for pi in rows:
                    if pi.item_code in wanted and is_item_promo(pi.description, size[pi.promotion_id]):
                        promos.append((store_id, pi.item_code, pi.promotion_id, pi.description[:200], pi.start,
                                       pi.end, int(pi.club_all), pi.min_qty, pi.discounted_price))
            except Exception as e:
                print(f"[{chain.key}] promo parse failed {r.name}: {e}", file=sys.stderr)

        with con:  # one transaction: all of the chain or none of it
            k = chain.key
            for t in ("stores", "products", "cand", "prices", "promos"):
                con.execute(f"DELETE FROM {t} WHERE chain=?", (k,))
            con.executemany(
                "INSERT OR REPLACE INTO stores(chain,store_id,name,address,city_raw,store_type,online) VALUES(?,?,?,?,?,?,?)",
                [(k, s.store_id, s.name, s.address, s.city, s.store_type,
                  int(chain.online_only or s.store_type.strip() == "2" or "אונליין" in s.name or "online" in s.name.lower()))
                 for s in stores],
            )
            con.executemany(
                "UPDATE stores SET price_published=? WHERE chain=? AND store_id=?",
                [(stamp, k, sid) for sid, stamp in store_pub.items()],
            )
            con.executemany(
                "INSERT OR REPLACE INTO products VALUES(?,?,?,?,?,?,?)",
                [(k, code, *v) for code, v in products.items()],
            )
            con.executemany("INSERT OR IGNORE INTO cand VALUES(?,?,?)", [(k, cid, code) for cid, code in cand])
            con.executemany("INSERT OR REPLACE INTO prices VALUES(?,?,?,?,?)", [(k, *p) for p in prices])
            con.executemany("INSERT INTO promos VALUES(?,?,?,?,?,?,?,?,?,?)", [(k, *p) for p in promos])
            compute_stats(con, k)
            con.execute(
                "UPDATE chains SET last_ok_at=?, last_error=NULL, files_ok=?, files_failed=?, stores=?, products=?, prices=? WHERE key=?",
                (_now(), ok, failed, len(stores), len(products), len(prices), k),
            )
        return {"chain": chain.key, "ok": ok, "failed": failed, "stores": len(stores), "products": len(products),
                "prices": len(prices), "promos": len(promos), "header_chain_ids": sorted(header_chains)}
    except Exception as e:
        con.execute("UPDATE chains SET last_error=? WHERE key=?", (f"{_now()} {e}"[:500], chain.key))
        con.commit()
        return {"chain": chain.key, "error": str(e)}


def compute_stats(con: sqlite3.Connection, chain: str) -> int:
    """Average price and store count per product, for the 'choose my product' list
    (grouping 1.8M price rows on every request took 16 s)."""
    con.execute("DELETE FROM product_stats WHERE chain=?", (chain,))
    con.execute(
        "INSERT INTO product_stats SELECT chain, item_code, ROUND(AVG(price),2), COUNT(*) FROM prices "
        "WHERE chain=? GROUP BY chain, item_code", (chain,))
    return con.execute("SELECT COUNT(*) FROM product_stats WHERE chain=?", (chain,)).fetchone()[0]


def rematch(con: sqlite3.Connection, matcher: Matcher) -> dict:
    """Re-check stored candidates against the current rules and drop the ones
    that no longer match. Only removes: a widened rule needs a full ingest,
    because products that never matched were never stored."""
    rows = con.execute(
        "SELECT c.chain, c.canonical_id, c.item_code, d.name, d.weighted FROM cand c "
        "JOIN products d ON d.chain=c.chain AND d.item_code=c.item_code").fetchall()
    drop = []
    for chain, cid, code, name, weighted in rows:
        r = matcher.by_id.get(cid)
        if r is None or not r.matches(name, bool(weighted)):
            drop.append((chain, cid, code))
    with con:
        con.executemany("DELETE FROM cand WHERE chain=? AND canonical_id=? AND item_code=?", drop)
    return {"rematch_checked": len(rows), "dropped": len(drop)}


def main(argv: list[str]) -> int:
    root = Path(os.environ.get("BP_HOME", "/opt/bayit-prices"))
    rules = load_rules(os.environ.get("BP_RULES", root / "canonical-items.json"))
    matcher = Matcher(rules)
    con = connect(root / "data" / "prices.db")
    if argv[:1] == ["--rematch"]:
        print(json.dumps(rematch(con, matcher), ensure_ascii=False))
        return 0
    if argv[:1] == ["--stats"]:
        with con:
            print(json.dumps({k: compute_stats(con, k) for k in CHAINS}, ensure_ascii=False))
        return 0
    keys = argv or list(CHAINS)
    f = Fetcher()
    results = []
    for k in keys:
        t0 = time.time()
        res = ingest_chain(con, CHAINS[k], matcher, f, root / "raw")
        res["seconds"] = round(time.time() - t0)
        results.append(res)
        print(json.dumps(res, ensure_ascii=False), flush=True)
    from .geo import refresh_store_locations

    try:
        print(json.dumps(refresh_store_locations(con, f), ensure_ascii=False), flush=True)
    except Exception as e:
        print(f"geo refresh failed: {e}", file=sys.stderr)
    _prune_raw(root / "raw", keep=2)
    return 1 if any("error" in r for r in results) else 0


def _prune_raw(raw_root: Path, keep: int) -> None:
    if not raw_root.exists():
        return
    days = sorted(p for p in raw_root.iterdir() if p.is_dir())
    import shutil

    for p in days[:-keep]:
        shutil.rmtree(p, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
