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
SOURCES = ROOT / "bp" / "sources.py"
INGEST = ROOT / "bp" / "ingest.py"

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
     'if not s["fresh"]:', "if False:",
     "test_stale_store_is_shown_but_not_ranked"),
    ("counted items priced by whole packs again",
     "return None if unit_norm is None else (1, round(unit_norm * qty, 2), unit_norm)", "pass",
     "test_counted_items_compare_per_unit_not_per_pack"),
    ("negated words treated as required",
     "if hit == neg:", "if not hit:",
     "test_negated_word_excludes_products"),
    ("strict words ignored",
     "if req.strict and not req.pin_code:", "if False:",
     "test_extra_words_are_hard_constraints"),
    # Cerberus portal (Rami Levy, Osher Ad, Yochananof, Tiv Taam)
    ("cerberus posts a password",
     '"username": self.username, "password": ""', '"username": self.username, "password": "guess"',
     "test_login_posts_an_empty_password_and_lists", SOURCES),
    ("configured password accepted",
     'if entry.get("password") not in (None, ""):', "if False:",
     "test_refuses_a_non_empty_password", SOURCES),
    ("expired session not renewed",
     "                with self._lock:", "                raise RuntimeError('no relogin')\n                with self._lock:",
     "test_lost_session_logs_in_again_once", SOURCES),
    ("HTML page accepted as a data file",
     'if head.startswith(b"<!doctype html") or head.startswith(b"<html"):', "if False:",
     "test_html_instead_of_a_file_is_an_error", SOURCES),
    ("truncated listing accepted",
     "if len(rows) < total:", "if False:",
     "test_truncated_listing_is_an_error", SOURCES),
    ("other chain's files listed",
     "for n in names if chain_id in n and (k := _kind(n))]", "for n in names if (k := _kind(n))]",
     "test_keeps_latest_full_files_of_this_chain_only", SOURCES),
    ("file header chain id not checked",
     "if file_chain and file_chain != chain.chain_id:", "if False:",
     "test_file_from_another_chain_is_rejected", INGEST),
    ("portal files downloaded without the session",
     "data = (r.session or f).get(r.url)", "data = f.get(r.url)",
     "test_downloads_ride_on_the_session", INGEST),
    ("short file names collapse into one store",
     "        if np and r.kind != \"stores\":", "        if False:",
     "test_latest_per_store_keeps_short_names_apart", SOURCES),
    ("files from 2024 ingested",
     "return latest_per_store(drop_out_of_date(refs))", "return latest_per_store(refs)",
     "test_lister_drops_files_long_out_of_date", SOURCES),
    ("promo store id from the long name shape only",
     "store_id = store_from_name(r.name)  # both", "store_id = r.name.split('-')[-3] if r.name.count('-') >= 4 else ''  # both",
     "test_promos_of_short_named_files_land_on_their_store", INGEST),
    ("city code 0 left without a city",
     "            city = infer_city([name or \"\", address or \"\"], known)", "            city = ''",
     "test_refresh_uses_the_store_name_when_the_city_code_is_zero", ROOT / "bp" / "geo.py"),
    ("short settlement names matched inside text",
     "if ft == fk or (len(core.replace(\" \", \"\")) >= 4 and fk in ft):", "if fk in ft:",
     "test_store_name_wins_over_address_and_short_names_need_an_exact_match", ROOT / "bp" / "geo.py"),
]


def run() -> tuple[int, str]:
    p = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests"], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8")
    return p.returncode, p.stdout + p.stderr


def main() -> int:
    code, out = run()
    if code != 0:
        print("baseline is already red; refusing to sabotage\n" + out[-1500:])
        return 2
    targets = {TARGET} | {c[4] for c in CASES if len(c) > 4}
    originals = {t: t.read_bytes() for t in targets}
    keep = Path(tempfile.mkdtemp())
    for t in targets:
        shutil.copy2(t, keep / t.name)
    bad = 0
    try:
        for case in CASES:
            desc, old, new, must_fail = case[:4]
            target = case[4] if len(case) > 4 else TARGET
            original = originals[target]
            src = original.decode("utf-8")
            if old not in src:
                print(f"[SETUP] {desc}: anchor not found")
                bad += 1
                continue
            target.write_text(src.replace(old, new, 1), encoding="utf-8", newline="")
            assert target.read_bytes() != original, "sabotage did not land"
            code, out = run()
            hit = code != 0 and must_fail in out
            print(f"[{'RED as predicted' if hit else 'NOT CAUGHT'}] {desc} -> expects {must_fail}")
            if not hit:
                bad += 1
                print(out[-800:])
            target.write_bytes(original)
    finally:
        for t, b in originals.items():
            t.write_bytes(b)
    assert all(t.read_bytes() == b for t, b in originals.items())
    code, _ = run()
    print(f"restored, suite {'green' if code == 0 else 'RED'}")
    return 1 if bad or code else 0


if __name__ == "__main__":
    raise SystemExit(main())
