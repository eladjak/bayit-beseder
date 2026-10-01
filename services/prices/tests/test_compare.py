"""Release-gate scenarios from the adversarial review: each one is a way a family
could be told the wrong store is cheapest."""
import sqlite3
import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bp.compare import IL, ItemReq, compare, strict_tokens  # noqa: E402
from bp.db import SCHEMA  # noqa: E402
from bp.match import Matcher, Rule  # noqa: E402

NOW = datetime(2026, 10, 1, 12, 0, tzinfo=IL)
FRESH = "2026-10-01T02:00"
STALE = "2026-09-25T02:00"

MILK = Rule(id="milk", label="חלב", aliases=["חלב"], include=[["חלב"]], exclude=["שוקו"],
            dim="ml", ref=1000, min=700, max=2100)
EGGS = Rule(id="eggs", label="ביצים", aliases=["ביצים"], include=[["ביצים"]], dim="u", ref=12, min=12, max=12)
TOM = Rule(id="tomato", label="עגבניות", aliases=["עגבניות"], include=[["עגבני"]], dim="g", ref=1000,
           weighted=True, packaged=False)
MATCHER = Matcher([MILK, EGGS, TOM])


def db(stores, products, prices, cand=None):
    con = sqlite3.connect(":memory:")
    con.executescript(SCHEMA.replace("PRAGMA journal_mode=WAL;", ""))
    chains = {s[0] for s in stores}
    for c in chains:
        con.execute("INSERT INTO chains(key, chain_id, name_he, last_ok_at) VALUES(?,?,?,?)", (c, c, c, FRESH))
    for chain, sid, lat, pub in stores:
        con.execute("INSERT INTO stores(chain,store_id,name,city,lat,lon,online,price_published) VALUES(?,?,?,?,?,?,0,?)",
                    (chain, sid, f"{chain}-{sid}", "עיר", lat, 35.0, pub))
    for chain, code, name, dim, size, w in products:
        con.execute("INSERT INTO products VALUES(?,?,?,?,?,?,?)", (chain, code, name, "", dim, size, w))
        for cid in MATCHER.match(name, bool(w)):
            con.execute("INSERT OR IGNORE INTO cand VALUES(?,?,?)", (chain, cid, code))
    for chain, sid, code, price in prices:
        con.execute("INSERT INTO prices VALUES(?,?,?,?,?)", (chain, sid, code, price, ""))
    return con


ORIGIN = (32.0, 35.0)


class CompareTests(unittest.TestCase):
    def test_store_missing_items_is_not_cheaper_because_of_it(self):
        con = db(
            [("A", "1", 32.0, FRESH), ("B", "1", 32.01, FRESH)],
            [("A", "m1", "חלב 3% 1 ליטר", "ml", 1000, 0), ("A", "e1", "ביצים L 12", "u", 12, 0),
             ("B", "m1", "חלב 3% 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "m1", 7.0), ("A", "1", "e1", 14.0), ("B", "1", "m1", 7.5)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk"), ItemReq("eggs", "eggs")], ORIGIN, now=NOW)
        # B total (7.5) < A total (21) but B lacks eggs: ranking must use the common basket (milk only)
        self.assertEqual(res["commonKeys"], ["milk"])
        self.assertEqual(res["ranked"][0]["chain"], "A")
        self.assertEqual(res["verdict"]["basis"], "common")
        self.assertEqual(res["verdict"]["savingVsDearest"], 0.5)

    def test_cost_covers_quantity_with_whole_packs(self):
        con = db(
            [("A", "1", 32.0, FRESH)],
            [("A", "small", "חלב 750 מל", "ml", 750, 0), ("A", "big", "חלב 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "small", 6.0), ("A", "1", "big", 7.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk", qty=2)], ORIGIN, now=NOW)
        line = res["otherStores"][0]["lines"]["milk"] if not res["ranked"] else res["ranked"][0]["lines"]["milk"]
        # 2 L: three 750ml packs = 18, two 1L packs = 14 -> 14
        self.assertEqual(line["code"], "big")
        self.assertEqual(line["cost"], 14.0)
        self.assertEqual(line["packs"], 2)

    def test_extra_words_are_hard_constraints(self):
        r = strict_tokens("חלב ללא לקטוז", MILK)
        self.assertEqual(r, ["ללא", "לקטוז"])
        con = db(
            [("A", "1", 32.0, FRESH)],
            [("A", "m", "חלב 3% 1 ליטר", "ml", 1000, 0), ("A", "lf", "חלב ללא לקטוז 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "m", 6.0), ("A", "1", "lf", 8.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk", strict=r)], ORIGIN, now=NOW)
        store = (res["ranked"] or res["otherStores"])[0]
        self.assertEqual(store["lines"]["milk"]["code"], "lf")

    def test_negated_word_excludes_products(self):
        con = db(
            [("A", "1", 32.0, FRESH)],
            [("A", "p", "חלב פרווה 1 ליטר", "ml", 1000, 0), ("A", "d", "חלב 3% 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "p", 4.0), ("A", "1", "d", 7.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk", strict=["!פרווה"])], ORIGIN, now=NOW)
        self.assertEqual((res["ranked"] or res["otherStores"])[0]["lines"]["milk"]["code"], "d")

    def test_store_wide_coupon_promotions_are_not_item_promos(self):
        from bp.ingest import is_item_promo
        self.assertFalse(is_item_promo('ע. סיבוס קופון 50ש"ח מתנה', 3))
        self.assertFalse(is_item_promo("קנה גלידות ב 99 שח", 500))
        self.assertTrue(is_item_promo("3 ב-19", 4))

    def test_pinned_product_missing_means_missing_not_substituted(self):
        con = db(
            [("A", "1", 32.0, FRESH), ("B", "1", 32.0, FRESH)],
            [("A", "7290000000001", "חלב תנובה 1 ליטר", "ml", 1000, 0),
             ("B", "7290000000002", "חלב טרה 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "7290000000001", 7.0), ("B", "1", "7290000000002", 5.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk", pin_code="7290000000001", pin_chain="A")], ORIGIN, now=NOW)
        b = [s for s in res["ranked"] + res["otherStores"] if s["chain"] == "B"][0]
        self.assertIsNone(b["lines"]["milk"])
        self.assertIsNone(res["verdict"])  # nothing common -> no winner

    def test_internal_code_pin_never_crosses_chains(self):
        con = db(
            [("A", "1", 32.0, FRESH), ("B", "1", 32.0, FRESH)],
            [("A", "4455", "חלב 1 ליטר", "ml", 1000, 0), ("B", "4455", "חלב שוקו 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "4455", 7.0), ("B", "1", "4455", 3.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk", pin_code="4455", pin_chain="A")], ORIGIN, now=NOW)
        b = [s for s in res["ranked"] + res["otherStores"] if s["chain"] == "B"][0]
        self.assertIsNone(b["lines"]["milk"])

    def test_stale_store_is_shown_but_not_ranked(self):
        con = db(
            [("A", "1", 32.0, FRESH), ("B", "1", 32.0, STALE)],
            [("A", "m", "חלב 1 ליטר", "ml", 1000, 0), ("B", "m", "חלב 1 ליטר", "ml", 1000, 0)],
            [("A", "1", "m", 7.0), ("B", "1", "m", 1.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk")], ORIGIN, now=NOW)
        self.assertEqual([s["chain"] for s in res["ranked"]], ["A"])
        self.assertIsNone(res["verdict"])  # one fresh store is not a comparison
        self.assertFalse([s for s in res["otherStores"] if s["chain"] == "B"][0]["fresh"])

    def test_weighted_produce_priced_per_kg_as_estimate(self):
        con = db(
            [("A", "1", 32.0, FRESH)],
            [("A", "t", "עגבניות", None, None, 1)],
            [("A", "1", "t", 5.9)],
        )
        res = compare(con, MATCHER, [ItemReq("tom", "tomato", qty=2)], ORIGIN, now=NOW)
        line = (res["ranked"] or res["otherStores"])[0]["lines"]["tom"]
        self.assertEqual(line["cost"], 11.8)
        self.assertTrue(line["estimate"])

    def test_placeholder_price_is_ignored_as_outlier(self):
        con = db(
            [("A", "1", 32.0, FRESH)],
            [("A", f"m{i}", f"חלב {i} 1 ליטר", "ml", 1000, 0) for i in range(5)],
            [("A", "1", "m0", 0.1), ("A", "1", "m1", 6.5), ("A", "1", "m2", 7.0), ("A", "1", "m3", 7.2),
             ("A", "1", "m4", 6.9)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk")], ORIGIN, now=NOW)
        self.assertEqual((res["ranked"] or res["otherStores"])[0]["lines"]["milk"]["price"], 6.5)

    def test_bad_quantity_is_clamped(self):
        con = db([("A", "1", 32.0, FRESH)], [("A", "m", "חלב 1 ליטר", "ml", 1000, 0)], [("A", "1", "m", 7.0)])
        res = compare(con, MATCHER, [ItemReq("milk", "milk", qty=float("inf"))], ORIGIN, now=NOW)
        self.assertEqual(res["items"][0]["qty"], 1.0)

    def test_split_basket_only_when_worth_it_and_labelled(self):
        con = db(
            [("A", "1", 32.0, FRESH), ("B", "1", 32.0, FRESH)],
            [("A", "m", "חלב 1 ליטר", "ml", 1000, 0), ("A", "e", "ביצים 12", "u", 12, 0),
             ("B", "m", "חלב 1 ליטר", "ml", 1000, 0), ("B", "e", "ביצים 12", "u", 12, 0)],
            [("A", "1", "m", 5.0), ("A", "1", "e", 30.0), ("B", "1", "m", 12.0), ("B", "1", "e", 20.0)],
        )
        res = compare(con, MATCHER, [ItemReq("milk", "milk"), ItemReq("eggs", "eggs")], ORIGIN, now=NOW)
        self.assertIsNotNone(res["split"])
        self.assertEqual(res["split"]["saving"], 7.0)
        self.assertIn("בלבד", res["split"]["note"])


if __name__ == "__main__":
    unittest.main()
