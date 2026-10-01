"""Report how the canonical item rules behave on a catalog sample.

Usage (from services/prices):
    python tools/rules_report.py <catalog.tsv> <canonical-items.json> [labels.json] [--items id1,id2] [--quiet]

catalog.tsv is tab separated, no header:
    chain, item_code, name, manufacturer, dim, size, weighted, price
labels.json defaults to <catalog dir>/labels.json.
"""
from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from bp.match import Matcher, load_rules  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # pragma: no cover
    pass


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    flags = [a for a in argv if a.startswith("--")]
    only: set[str] = set()
    for i, a in enumerate(argv):
        if a == "--items" and i + 1 < len(argv):
            only = set(argv[i + 1].split(","))
            args = [x for x in args if x != argv[i + 1]]
    quiet = "--quiet" in flags
    if len(args) < 2:
        print(__doc__)
        return 2
    catalog, rules_path = Path(args[0]), Path(args[1])
    labels_path = Path(args[2]) if len(args) > 2 else catalog.parent / "labels.json"

    rules = load_rules(rules_path)
    matcher = Matcher(rules)
    raw = json.loads(rules_path.read_text(encoding="utf-8"))
    raw_items = raw["items"] if isinstance(raw, dict) else raw

    chains: list[str] = []
    per: dict[str, dict[str, list[str]]] = {r.id: collections.defaultdict(list) for r in rules}
    n_rows = 0
    n_multi = 0
    multi_examples: list[tuple[str, list[str]]] = []
    for line in catalog.read_text(encoding="utf-8").splitlines():
        p = line.split("\t")
        if len(p) < 8:
            continue
        n_rows += 1
        chain, name, weighted = p[0], p[2], p[6] == "1"
        if chain not in chains:
            chains.append(chain)
        ids = matcher.match(name, weighted)
        if len(ids) > 1:
            n_multi += 1
            if len(multi_examples) < 400:
                multi_examples.append((name, ids))
        for i in ids:
            per[i][chain].append(name)

    if not quiet:
        for r in rules:
            if only and r.id not in only:
                continue
            counts = " ".join(f"{c}={len(per[r.id].get(c, []))}" for c in chains)
            print(f"## {r.id} [{r.label}] {counts}")
            for c in chains:
                names = per[r.id].get(c, [])
                # spread the samples over the list rather than the first three
                if names:
                    step = max(1, len(names) // 3)
                    sample = [names[k] for k in range(0, len(names), step)][:3]
                    print(f"   {c}: " + " | ".join(sample))

    zero_all = [r.id for r in rules if not any(per[r.id].values())]
    two_chain = [r.id for r in rules if sum(1 for c in chains if per[r.id].get(c)) >= 2]
    one_chain = [r.id for r in rules if sum(1 for c in chains if per[r.id].get(c)) == 1]

    labels = {x["label"] for x in json.loads(labels_path.read_text(encoding="utf-8"))}
    missing_aliases = [(it["id"], a) for it in raw_items for a in it.get("aliases", []) if a not in labels]
    alias_owner: dict[str, list[str]] = collections.defaultdict(list)
    for it in raw_items:
        for a in it.get("aliases", []):
            alias_owner[a].append(it["id"])
    dup_aliases = {a: o for a, o in alias_owner.items() if len(o) > 1}
    no_alias = [it["id"] for it in raw_items if not it.get("aliases")]
    # a produce/weighted rule must say so explicitly
    n_alias = sum(len(it.get("aliases", [])) for it in raw_items)

    print("=" * 60)
    print(f"catalog rows: {n_rows}  chains: {chains}")
    print(f"total items: {len(rules)}  aliases: {n_alias}")
    print(f"items matching >=1 product in >=2 chains: {len(two_chain)} ({100 * len(two_chain) / max(1, len(rules)):.1f}%)")
    print(f"items matching in exactly 1 chain: {len(one_chain)}  -> {', '.join(one_chain)}")
    print(f"items with ZERO matches in any chain: {len(zero_all)} -> {', '.join(zero_all)}")
    print(f"items without aliases: {no_alias}")
    print(f"aliases missing from labels.json: {len(missing_aliases)} {missing_aliases[:20]}")
    print(f"duplicate aliases: {len(dup_aliases)} {dup_aliases}")
    print(f"products matched by >1 item: {n_multi}")
    for name, ids in multi_examples[: (0 if quiet else 25)]:
        print(f"   multi: {name} -> {ids}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
