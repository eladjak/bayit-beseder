import gzip
import json
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bp import parse  # noqa: E402
from bp.api import State, make_handler  # noqa: E402
from bp.ingest import ingest_chain, published_stamp  # noqa: E402
from bp.match import Matcher, Rule, norm  # noqa: E402
from bp.db import connect  # noqa: E402
from bp.sources import Chain, FileRef, latest_per_store, parse_carrefour_index, parse_shufersal_page  # noqa: E402

PRICE_XML = """﻿<Root><ChainID>7290055700007</ChainID><SubChainID>001</SubChainID><StoreID>002</StoreID>
<Items><Item><ItemCode>7290114312431</ItemCode><ItemName>חלב טרי 3% 1 ליטר</ItemName><ManufactureName>טרה</ManufactureName>
<UnitQty>ליטר</UnitQty><Quantity>1.00</Quantity><bIsWeighted>0</bIsWeighted><ItemPrice>7.40</ItemPrice>
<UnitOfMeasurePrice>7.40</UnitOfMeasurePrice><PriceUpdateTime>2026-06-15T07:22:30</PriceUpdateTime></Item>
<Item><ItemCode>0000123</ItemCode><ItemName>עגבניות</ItemName><UnitQty>קילוגרמים</UnitQty><Quantity>1</Quantity>
<bIsWeighted>1</bIsWeighted><ItemPrice>5.90</ItemPrice></Item>
<Item><ItemCode>999</ItemCode><ItemName>מוצר חינם</ItemName><ItemPrice>0.00</ItemPrice></Item>
</Items></Root>"""

STORES_UTF16 = """<Root><ChainID>7290055700007</ChainID><ChainName>קרפור</ChainName><SubChains><SubChain><SubChainID>001</SubChainID>
<Stores><Store><StoreID>002</StoreID><StoreType>1</StoreType><StoreName>קרפור מגדל העמק</StoreName><Address>הנשיא 1</Address>
<City>מגדל העמק</City></Store></Stores></SubChain></SubChains></Root>"""

SHUF_STORES = """<?xml version="1.0" encoding="UTF-8"?><Chain><ChainID>7290027600007</ChainID><SubChains><SubChain><SubChainID>1</SubChainID>
<Stores><Store><StoreID>756</StoreID><StoreType>1</StoreType><StoreName>שלי באר יעקב</StoreName><Address>17 יצחק שמיר</Address>
<City>2530</City></Store></Stores></SubChain></SubChains></Chain>"""

PROMO_XML = """<Root><StoreID>002</StoreID><Promotions><Promotion><PromotionID>11</PromotionID>
<PromotionDescription>3 ב-19</PromotionDescription><PromotionStartDateTime>2026-08-16T00:01:00</PromotionStartDateTime>
<PromotionEndDateTime>2026-10-02T23:59:00</PromotionEndDateTime><ClubID>0</ClubID><Groups><Group><PromotionItems>
<PromotionItem><ItemCode>7290114312431</ItemCode><MinQty>3</MinQty><DiscountedPrice>19.00</DiscountedPrice></PromotionItem>
</PromotionItems></Group></Groups></Promotion></Promotions></Root>"""


class ParseTests(unittest.TestCase):
    def test_prices_gzip_bom_and_bad_rows(self):
        raw = gzip.compress(PRICE_XML.encode("utf-8"))
        header, it = parse.iter_prices(parse.open_payload(raw))
        rows = list(it)
        self.assertEqual([r.item_code for r in rows], ["7290114312431", "123"])  # zero-price row dropped
        self.assertEqual(header["storeid"], "002")
        self.assertTrue(rows[1].weighted)
        self.assertEqual(parse.pack_size(rows[0].qty, rows[0].unit_qty, rows[0].name), ("ml", 1000.0))

    def test_stores_utf16(self):
        raw = b"\xff\xfe" + STORES_UTF16.encode("utf-16-le")
        header, it = parse.iter_stores(parse.open_payload(raw))
        stores = list(it)
        self.assertEqual(stores[0].store_id, "2")
        self.assertEqual(stores[0].city, "מגדל העמק")

    def test_promos(self):
        p = list(parse.iter_promos(parse.open_payload(PROMO_XML.encode())))
        self.assertEqual(p[0].item_code, "7290114312431")
        self.assertTrue(p[0].club_all)
        self.assertEqual(p[0].min_qty, 3)

    def test_pack_size_from_name(self):
        self.assertEqual(parse.pack_size(None, "", "פסטה פנה 500 גרם"), ("g", 500.0))
        self.assertEqual(parse.pack_size(None, "", "שמן קנולה 1 ליטר"), ("ml", 1000.0))

    def test_bidi_controls_do_not_break_word_start(self):
        r = Rule(id="e", label="ביצים", aliases=[], include=[["=ביצים"]])
        self.assertTrue(r.matches("קרטון ‫ביצים רגילות", False))

    def test_norm_and_prefix_matching(self):
        r = Rule(id="milk", label="חלב", aliases=[], include=[["=חלב"]], exclude=["שוקו"])
        self.assertTrue(r.matches("החלב של טרה", False))
        self.assertFalse(r.matches("מחלבות גד שמנת", False))  # "=" stops glued words
        self.assertFalse(r.matches("חלבה מרבל", False))
        self.assertFalse(r.matches("חלב שוקו", False))
        self.assertEqual(norm("קוטג'  5%").strip(), "קוטג 5")


class SourceTests(unittest.TestCase):
    def test_shufersal_page(self):
        html = ('<a href="https://pricesprodpublic.blob.core.windows.net/price/PriceFull7290027600007-001-001-20261001-020000.gz?sv=1&amp;sig=x">'
                '<a href="?page=2">2</a><a href="?page=22">>></a>')
        urls, last = parse_shufersal_page(html)
        self.assertEqual(last, 22)
        self.assertIn("&sig=x", urls[0])

    def test_carrefour_index(self):
        html = "const path = '20261001'; const files = [{\"name\":\"PriceFull7290055700007-001-002-20261001-051015.gz\"}];"
        path, names = parse_carrefour_index(html)
        self.assertEqual(path, "20261001")
        self.assertEqual(len(names), 1)

    def test_latest_per_store(self):
        refs = [FileRef("pricefull", "u1", "PriceFull7-001-002-20261001-010000.gz"),
                FileRef("pricefull", "u2", "PriceFull7-001-002-20261001-050000.gz"),
                FileRef("pricefull", "u3", "PriceFull7-001-003-20261001-010000.gz")]
        got = sorted(r.url for r in latest_per_store(refs))
        self.assertEqual(got, ["u2", "u3"])
        self.assertEqual(published_stamp("PriceFull7-001-002-20261001-050000.gz"), "2026-10-01T05:00")


class IngestTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.con = connect(self.tmp / "p.db")
        self.matcher = Matcher([Rule(id="milk", label="חלב", aliases=[], include=[["חלב"]], dim="ml", ref=1000)])
        self.chain = Chain("carrefour", "7290055700007", "קרפור", lambda f: [])

    def _refs(self, n_price: int, ok_price: int):
        refs = [FileRef("stores", "s", "Stores7290055700007-000-20261001-000100.xml")]
        payloads = {"Stores7290055700007-000-20261001-000100.xml": b"\xff\xfe" + STORES_UTF16.encode("utf-16-le")}
        for i in range(n_price):
            name = f"PriceFull7290055700007-001-00{i}-20261001-051015.gz"
            refs.append(FileRef("pricefull", name, name))
            payloads[name] = gzip.compress(PRICE_XML.encode()) if i < ok_price else RuntimeError("timeout")
        return refs, payloads

    def test_chain_written_when_enough_files_parse(self):
        refs, payloads = self._refs(5, 5)
        res = ingest_chain(self.con, self.chain, self.matcher, None, self.tmp, refs=refs, payloads=payloads)
        self.assertNotIn("error", res)
        self.assertEqual(self.con.execute("SELECT COUNT(*) FROM prices").fetchone()[0], 1)  # only the milk is a candidate
        self.assertEqual(self.con.execute("SELECT price_published FROM stores").fetchone()[0], "2026-10-01T05:10")

    def test_partial_download_keeps_previous_snapshot(self):
        refs, payloads = self._refs(5, 5)
        ingest_chain(self.con, self.chain, self.matcher, None, self.tmp, refs=refs, payloads=payloads)
        refs, payloads = self._refs(5, 2)  # 2/5 parsed -> rejected
        res = ingest_chain(self.con, self.chain, self.matcher, None, self.tmp, refs=refs, payloads=payloads)
        self.assertIn("error", res)
        self.assertEqual(self.con.execute("SELECT COUNT(*) FROM prices").fetchone()[0], 1)
        self.assertIsNotNone(self.con.execute("SELECT last_error FROM chains").fetchone()[0])


class ApiTests(unittest.TestCase):
    KEY = "k" * 40

    @classmethod
    def setUpClass(cls):
        cls.home = Path(tempfile.mkdtemp())
        rules = cls.home / "canonical-items.json"
        rules.write_text(json.dumps({"items": [{"id": "milk", "label": "חלב", "include": [["חלב"]]}]}), encoding="utf-8")
        import os

        os.environ["BP_RULES"] = str(rules)
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(State(cls.home, cls.KEY)))
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.srv.server_address[1]}/bayit-prices"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def call(self, path, body=None, key=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method="POST" if data else "GET")
        if key:
            req.add_header("X-Bayit-Prices-Key", key)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read()), r.headers
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read()), e.headers

    def test_health_is_open_everything_else_needs_the_key(self):
        self.assertEqual(self.call("/v1/health")[0], 200)
        self.assertEqual(self.call("/v1/cities")[0], 401)
        self.assertEqual(self.call("/v1/cities", key="wrong" * 10)[0], 401)
        self.assertEqual(self.call("/v1/cities", key=self.KEY)[0], 200)

    def test_compare_validates_and_is_not_cacheable(self):
        hh = "98549f83-612b-469f-b647-94616b23d36c"
        self.assertEqual(self.call("/v1/compare", {"householdId": "x"}, key=self.KEY)[0], 400)
        self.assertEqual(self.call("/v1/compare", {"householdId": hh, "origin": {"lat": 0, "lon": 0}}, key=self.KEY)[0], 400)
        code, body, headers = self.call("/v1/compare", {"householdId": hh, "origin": {"lat": 32.67, "lon": 35.24},
                                                        "items": [{"key": "a", "canonicalId": "milk", "qty": 1}]}, key=self.KEY)
        self.assertEqual(code, 200)
        self.assertIn("no-store", headers["Cache-Control"])

    def test_pins_are_scoped_to_household(self):
        a, b = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"
        self.call("/v1/pin", {"householdId": a, "canonicalId": "milk", "itemCode": "7290000000001", "chain": "x"}, key=self.KEY)
        body_a = self.call("/v1/compare", {"householdId": a, "origin": {"lat": 32.6, "lon": 35.2}, "items": []}, key=self.KEY)[1]
        body_b = self.call("/v1/compare", {"householdId": b, "origin": {"lat": 32.6, "lon": 35.2}, "items": []}, key=self.KEY)[1]
        self.assertEqual(body_a["pins"], {"milk": "x|7290000000001"})
        self.assertEqual(body_b["pins"], {})


if __name__ == "__main__":
    unittest.main()
