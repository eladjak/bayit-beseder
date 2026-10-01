"""Check every price in a saved comparison result against the raw source files.

Independent of bp.parse (uses the regex reader in spotcheck.py).
Usage: python3 tools/spotcheck_result.py /tmp/bp-res.json [max_per_store]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spotcheck import file_price  # noqa: E402

RAW = Path("/opt/bayit-prices/raw")


def main(path: str, per_store: int) -> int:
    r = json.load(open(path, encoding="utf-8"))
    day = sorted(p for p in RAW.iterdir() if p.is_dir())[-1]
    n = bad = 0
    for s in r["ranked"]:
        store = s["storeId"]
        files = [f for f in (day / s["chain"]).glob("PriceFull*") if re.search(rf"-0*{re.escape(store)}-20\d{{6}}", f.name)]
        for k in r["commonKeys"][:per_store]:
            v = s["lines"][k]
            got = file_price(files[0].read_bytes(), v["code"]) if files else None
            ok = got is not None and abs(float(got.split(" | ")[0]) - v["price"]) < 0.005
            n += 1
            bad += 0 if ok else 1
            print(f"{'OK ' if ok else 'BAD'} {s['chainName']} store {store} {v['code']} app={v['price']} file={got} [{files[0].name if files else '-'}]")
    print(f"{n - bad}/{n} match")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 5))
