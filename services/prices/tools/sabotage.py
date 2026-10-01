"""Break the comparison on purpose and require the test suite to go red for the
predicted reason. Restores the file byte-for-byte in `finally`, then re-runs green.

Usage: python tools/sabotage.py
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "bp" / "compare.py"

CASES = [
    # (description, old, new, test that must fail)
    ("rank by found total instead of common basket",
     'ranked.sort(key=lambda s: s["commonTotal"])', 'ranked.sort(key=lambda s: s["foundTotal"])',
     "test_store_missing_items_is_not_cheaper_because_of_it"),
    ("internal pin code allowed across chains",
     "if req.pin_code and req.pin_chain and chain != req.pin_chain and not is_gtin(req.pin_code):",
     "if False:", "test_internal_code_pin_never_crosses_chains"),
    ("cost = one pack regardless of quantity",
     "packs = max(1, math.ceil(need / per_pack - 1e-9))", "packs = 1",
     "test_cost_covers_quantity_with_whole_packs"),
    ("stale stores ranked",
     "        if not s[\"fresh\"]:\n            continue\n", "",
     "test_stale_store_is_shown_but_not_ranked"),
    ("strict words ignored",
     "if req.strict and not req.pin_code:", "if False:",
     "test_extra_words_are_hard_constraints"),
]


def run() -> tuple[int, str]:
    p = subprocess.run([sys.executable, "-m", "unittest", "tests.test_compare"], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8")
    return p.returncode, p.stdout + p.stderr


def main() -> int:
    code, out = run()
    if code != 0:
        print("baseline is already red; refusing to sabotage\n" + out[-1500:])
        return 2
    backup = Path(tempfile.mkdtemp()) / "compare.py"
    shutil.copy2(TARGET, backup)
    original = TARGET.read_bytes()
    bad = 0
    try:
        for desc, old, new, must_fail in CASES:
            src = original.decode("utf-8")
            if old not in src:
                print(f"[SETUP] {desc}: anchor not found")
                bad += 1
                continue
            TARGET.write_text(src.replace(old, new, 1), encoding="utf-8")
            assert TARGET.read_bytes() != original, "sabotage did not land"
            code, out = run()
            hit = code != 0 and must_fail in out
            print(f"[{'RED as predicted' if hit else 'NOT CAUGHT'}] {desc} -> expects {must_fail}")
            if not hit:
                bad += 1
                print(out[-800:])
            TARGET.write_bytes(original)
    finally:
        TARGET.write_bytes(original)
    assert TARGET.read_bytes() == original
    code, _ = run()
    print(f"restored, suite {'green' if code == 0 else 'RED'}")
    return 1 if bad or code else 0


if __name__ == "__main__":
    raise SystemExit(main())
