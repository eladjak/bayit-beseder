"""Independent spot-check: compare DB prices with the raw source files.

Deliberately does NOT use bp.parse: it reads the raw gzip with a regex over the
text, so a parser bug cannot agree with itself.

Usage: python3 -m tools.spotcheck <n> [chain]   (run in /opt/bayit-prices/app)
Picks n random (store, item) price rows from the DB, finds the store's raw
PriceFull file of today, and prints DB price vs file price.
"""
import gzip
import random
import re
import sqlite3
import sys
from pathlib import Path

HOME = Path("/opt/bayit-prices")


def file_price(raw: bytes, code: str) -> str | None:
    text = gzip.decompress(raw).decode("utf-8", "replace") if raw[:2] == b"\x1f\x8b" else raw.decode("utf-8", "replace")
    for block in re.finditer(r"<Item>(.*?)</Item>", text, re.S | re.I):
        b = block.group(1)
        m = re.search(r"<ItemCode>\s*0*(\d+)\s*</ItemCode>", b, re.I)
        if m and m.group(1) == code.lstrip("0"):
            p = re.search(r"<ItemPrice>\s*([\d.]+)\s*</ItemPrice>", b, re.I)
            n = re.search(r"<ItemN(?:a)?m(?:e)?>(.*?)</ItemN", b, re.I)
            return f"{p.group(1) if p else '?'} | {n.group(1).strip() if n else ''}"
    return None


def main(n: int, chain: str | None) -> int:
    con = sqlite3.connect(str(HOME / "data" / "prices.db"))
    q = "SELECT chain, store_id, item_code, price FROM prices" + (" WHERE chain=?" if chain else "")
    rows = con.execute(q, (chain,) if chain else ()).fetchall()
    random.seed(20261001)
    sample = random.sample(rows, min(n, len(rows)))
    days = sorted((HOME / "raw").iterdir())
    bad = 0
    for ch, store, code, price in sample:
        files = [f for d in days[::-1] for f in (d / ch).glob("PriceFull*")
                 if re.search(rf"-0*{re.escape(store)}-20\d{{6}}", f.name)]
        if not files:
            print(f"{ch} store {store} {code}: NO RAW FILE")
            bad += 1
            continue
        got = file_price(files[0].read_bytes(), code)
        ok = got is not None and abs(float(got.split(" | ")[0]) - price) < 0.005
        bad += 0 if ok else 1
        name = con.execute("SELECT name FROM products WHERE chain=? AND item_code=?", (ch, code)).fetchone()
        print(f"{'OK ' if ok else 'BAD'} {ch:9} store {store:>4} {code:>14} db={price:<7} file={got}  ({name[0] if name else ''}) [{files[0].name}]")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 10, sys.argv[2] if len(sys.argv) > 2 else None))
