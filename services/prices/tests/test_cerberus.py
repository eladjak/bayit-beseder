"""The publishedprices.co.il (Cerberus) portal: login with a chain's public
username and an empty password, list the files, download them on the session.

A fake portal stands in for the real one; it behaves like the measured portal
(1.10.2026): /login carries a csrftoken meta tag, a good login lands on /file,
a bad one goes back to /login, and a lost session redirects downloads to /login."""
import gzip
import json
import sys
import tempfile
import unittest
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bp.db import connect  # noqa: E402
from bp.ingest import ingest_chain  # noqa: E402
from bp.match import Matcher, Rule  # noqa: E402
from bp.sources import (  # noqa: E402
    FileRef,
    CHAINS,
    CerberusSession,
    Fetcher,
    PortalLoginError,
    list_cerberus,
    load_portal_user,
)

RAMI = "7290058140886"


def page(token: str) -> bytes:
    return f'<html><head><meta name="csrftoken" content="{token}"/></head><body>x</body></html>'.encode()


PRICE = f"""<Root><ChainId>{RAMI}</ChainId><SubChainId>001</SubChainId><StoreId>039</StoreId><Items>
<Item><ItemCode>7290004131074</ItemCode><ItemName>חלב טרי 3% 1 ליטר</ItemName><UnitQty>ליטר</UnitQty>
<Quantity>1</Quantity><bIsWeighted>0</bIsWeighted><ItemPrice>6.90</ItemPrice></Item></Items></Root>"""

STORES = f"""<Root><ChainId>{RAMI}</ChainId><SubChains><SubChain><SubChainId>001</SubChainId><Stores>
<Store><StoreId>039</StoreId><StoreName>רמי לוי עפולה</StoreName><Address>x</Address><City>עפולה</City>
<StoreType>1</StoreType></Store></Stores></SubChain></SubChains></Root>"""


class FakePortal:
    """Measured behaviour of url.publishedprices.co.il, in miniature."""

    def __init__(self, users=("RamiLevi",), files=None, drop_session_after=None):
        self.users = set(users)
        self.files = files if files is not None else {}
        self.logged_in = False
        self.logins = 0
        self.downloads = 0
        self.drop_session_after = drop_session_after
        self.posted_passwords = []

    def __call__(self, url: str, data: bytes | None = None):
        u = urllib.parse.urlparse(url)
        form = dict(urllib.parse.parse_qsl(data.decode(), keep_blank_values=True)) if data else {}
        if u.path == "/login":
            return "https://portal/login", page("t-login")
        if u.path == "/login/user":
            self.posted_passwords.append(form.get("password"))
            if form.get("csrftoken") != "t-login":
                return "https://portal/login", page("t-login")
            if form.get("username") in self.users and form.get("password") == "":
                self.logged_in = True
                self.logins += 1
                return "https://portal/file", page("t-file")
            return "https://portal/login?r=%2Ffile", page("t-login")
        if u.path == "/file/json/dir":
            if not self.logged_in or form.get("csrftoken") != "t-file":
                return "https://portal/login", page("t-login")
            rows = [{"fname": n, "size": len(b)} for n, b in self.files.items()]
            return url, json.dumps({"aaData": rows, "iTotalRecords": len(rows), "iTotalDisplayRecords": len(rows)}).encode()
        if u.path.startswith("/file/d/"):
            if self.drop_session_after is not None and self.downloads == self.drop_session_after:
                self.logged_in = False
                self.drop_session_after = None
            if not self.logged_in:
                return "https://portal/login", page("t-login")
            self.downloads += 1
            name = urllib.parse.unquote(u.path[len("/file/d/"):])
            return url, self.files[name]
        raise AssertionError(f"unexpected {url}")


def session(portal, user="RamiLevi"):
    return CerberusSession(user, base="https://portal", transport=portal, pause=0, sleep=lambda s: None)


class PortalUserTests(unittest.TestCase):
    def setUp(self):
        self.path = Path(tempfile.mkdtemp()) / "portal_users.json"

    def test_reads_username(self):
        self.path.write_text(json.dumps({"ramilevy": {"username": "RamiLevi"}}), encoding="utf-8")
        self.assertEqual(load_portal_user("ramilevy", self.path), "RamiLevi")

    def test_refuses_a_non_empty_password(self):
        # only the chains' public empty-password logins are allowed
        self.path.write_text(json.dumps({"ramilevy": {"username": "RamiLevi", "password": "x"}}), encoding="utf-8")
        with self.assertRaises(PortalLoginError):
            load_portal_user("ramilevy", self.path)

    def test_missing_file_or_chain_is_loud(self):
        with self.assertRaises(PortalLoginError):
            load_portal_user("ramilevy", self.path)
        self.path.write_text(json.dumps({"osherad": {"username": "osherad"}}), encoding="utf-8")
        with self.assertRaises(PortalLoginError):
            load_portal_user("ramilevy", self.path)


class SessionTests(unittest.TestCase):
    def test_login_posts_an_empty_password_and_lists(self):
        portal = FakePortal(files={f"PriceFull{RAMI}-001-039-20261001-020000.gz": b"x"})
        s = session(portal)
        s.login()
        self.assertEqual(portal.posted_passwords, [""])
        self.assertEqual(s.list_names(), [f"PriceFull{RAMI}-001-039-20261001-020000.gz"])

    def test_rejected_login_raises(self):
        with self.assertRaises(PortalLoginError):
            session(FakePortal(users=()), user="RamiLevi").login()

    def test_lost_session_logs_in_again_once(self):
        name = f"PriceFull{RAMI}-001-039-20261001-020000.gz"
        portal = FakePortal(files={name: b"gzdata"}, drop_session_after=0)
        s = session(portal)
        s.login()
        self.assertEqual(s.get(f"https://portal/file/d/{name}"), b"gzdata")
        self.assertEqual(portal.logins, 2)

    def test_html_instead_of_a_file_is_an_error(self):
        name = f"PriceFull{RAMI}-001-039-20261001-020000.gz"
        portal = FakePortal(files={name: b"<!DOCTYPE html><html>error</html>"})
        s = session(portal)
        s.login()
        with self.assertRaises(RuntimeError):
            s.get(f"https://portal/file/d/{name}")

    def test_truncated_listing_is_an_error(self):
        class Short(FakePortal):
            def __call__(self, url, data=None):
                final, body = super().__call__(url, data)
                if url.endswith("/file/json/dir"):
                    j = json.loads(body)
                    j["iTotalRecords"] = j["iTotalDisplayRecords"] = len(j["aaData"]) + 5
                    body = json.dumps(j).encode()
                return final, body

        s = session(Short(files={"a.gz": b"x"}))
        s.login()
        with self.assertRaises(RuntimeError):
            s.list_names()


class ListerTests(unittest.TestCase):
    def setUp(self):
        self.users = Path(tempfile.mkdtemp()) / "portal_users.json"
        self.users.write_text(json.dumps({"ramilevy": {"username": "RamiLevi"}}), encoding="utf-8")

    def test_keeps_latest_full_files_of_this_chain_only(self):
        files = {
            f"PriceFull{RAMI}-001-039-20260930-020000.gz": b"old",
            f"PriceFull{RAMI}-001-039-20261001-020000.gz": b"new",
            f"Price{RAMI}-001-039-20261001-090000.gz": b"partial",  # not a full file
            f"PromoFull{RAMI}-001-039-20261001-020000.gz": b"p",
            f"Stores{RAMI}-000-202610010200.xml": b"s",
            "PriceFull7290103152017-001-001-20261001-020000.gz": b"other chain",
        }
        portal = FakePortal(files=files)
        refs = list_cerberus(Fetcher(), "ramilevy", RAMI, users_path=self.users,
                             session_factory=lambda u, **kw: session(portal, u))
        names = sorted(r.name for r in refs)
        self.assertEqual(names, [f"PriceFull{RAMI}-001-039-20261001-020000.gz",
                                 f"PromoFull{RAMI}-001-039-20261001-020000.gz",
                                 f"Stores{RAMI}-000-202610010200.xml"])
        self.assertTrue(all(r.session is not None for r in refs))

    def test_no_price_files_is_an_error(self):
        portal = FakePortal(files={f"Stores{RAMI}-000-202610010200.xml": b"s"})
        with self.assertRaises(RuntimeError):
            list_cerberus(Fetcher(), "ramilevy", RAMI, users_path=self.users,
                          session_factory=lambda u, **kw: session(portal, u))

    def test_registry_has_the_four_chains(self):
        expected = {"ramilevy": "7290058140886", "osherad": "7290103152017",
                    "yochananof": "7290803800003", "tivtaam": "7290873255550"}
        for key, cid in expected.items():
            self.assertEqual(CHAINS[key].chain_id, cid)


class IngestThroughSessionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.con = connect(self.tmp / "p.db")
        self.matcher = Matcher([Rule(id="milk", label="חלב", aliases=[], include=[["חלב"]], dim="ml", ref=1000)])
        self.users = self.tmp / "portal_users.json"
        self.users.write_text(json.dumps({"ramilevy": {"username": "RamiLevi"}}), encoding="utf-8")

    def _run(self, files):
        portal = FakePortal(files=files)
        chain = CHAINS["ramilevy"]
        refs = list_cerberus(Fetcher(), "ramilevy", RAMI, users_path=self.users,
                             session_factory=lambda u, **kw: session(portal, u))
        return ingest_chain(self.con, chain, self.matcher, Fetcher(), self.tmp, refs=refs)

    def test_downloads_ride_on_the_session(self):
        res = self._run({
            f"PriceFull{RAMI}-001-039-20261001-020000.gz": gzip.compress(PRICE.encode()),
            f"Stores{RAMI}-000-202610010200.xml": STORES.encode(),
        })
        self.assertNotIn("error", res, res)
        self.assertEqual((res["stores"], res["prices"]), (1, 1))
        self.assertEqual(self.con.execute("SELECT price FROM prices").fetchone()[0], 6.9)

    def test_promos_of_short_named_files_land_on_their_store(self):
        price = PRICE.replace("<StoreId>039</StoreId>", "<StoreId>712</StoreId>")
        promo = ("<Root><Promotions><Promotion><PromotionId>5</PromotionId><PromotionDescription>2 ב-12</PromotionDescription>"
                 "<ClubId>0</ClubId><PromotionItems><Item><ItemCode>7290004131074</ItemCode></Item></PromotionItems>"
                 "</Promotion></Promotions></Root>")
        res = self._run({
            f"PriceFull{RAMI}-712-202610011800.gz": gzip.compress(price.encode()),
            f"PromoFull{RAMI}-712-202610011800.gz": gzip.compress(promo.encode()),
            f"Stores{RAMI}-000-202610010200.xml": STORES.replace("<StoreId>039</StoreId>", "<StoreId>712</StoreId>").encode(),
        })
        self.assertNotIn("error", res, res)
        self.assertEqual(self.con.execute("SELECT DISTINCT store_id FROM prices").fetchall()[0][0], "712")
        self.assertEqual(self.con.execute("SELECT store_id FROM promos").fetchone()[0], "712")

    def test_file_from_another_chain_is_rejected(self):
        # a file whose header names a different chain must not be stored under this one
        wrong = PRICE.replace(RAMI, "7290103152017")
        res = self._run({
            f"PriceFull{RAMI}-001-039-20261001-020000.gz": gzip.compress(wrong.encode()),
            f"Stores{RAMI}-000-202610010200.xml": STORES.encode(),
        })
        self.assertIn("error", res)
        self.assertEqual(self.con.execute("SELECT COUNT(*) FROM prices").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()


class CityFromStoreNameTests(unittest.TestCase):
    """Yochananof's Stores file writes City=0 for every store (measured 1.10.2026);
    the city is only in the store name or the address."""

    KNOWN = ["עפולה", "רמלה", "ירושלים", "חמד", "פתח תקווה", "קריית שמונה", "תל אביב -יפו",
             "ראשון לציון", "עכו", "מודיעין-מכבים-רעות"]

    def test_city_in_store_name(self):
        from bp.geo import clean_city, infer_city
        known = [clean_city(k) for k in self.KNOWN]
        self.assertEqual(infer_city(["עפולה", "קהילת ציון 30"], known), "עפולה")
        self.assertEqual(infer_city(["סגולה פתח תקווה", "סגולה"], known), "פתח תקווה")
        self.assertEqual(infer_city(["קרית שמונה", "שדרות תל חי 93"], known), "קריית שמונה")
        self.assertEqual(infer_city(["בן צבי תל אביב", "unknown"], known), "תל אביב-יפו")
        self.assertEqual(infer_city(["מודיעין כרמים", "unknown"], known), "מודיעין-מכבים-רעות")
        self.assertEqual(infer_city(["עכו", ""], known), "עכו")

    def test_store_name_wins_over_address_and_short_names_need_an_exact_match(self):
        from bp.geo import clean_city, infer_city
        known = [clean_city(k) for k in self.KNOWN]
        # address mentions Jerusalem Blvd and "Nofei Hemed"; the store is in Ramla
        self.assertEqual(infer_city(["רמלה", "שדרות ירושלים פינת נופי חמד"], known), "רמלה")
        # a 3-letter settlement name inside a longer text is not a match
        self.assertEqual(infer_city(["יוחננוף ישן", "נופי חמד"], known), "")
        self.assertEqual(infer_city(["בילו", 'צומת ביל"ו'], known), "")

    def test_refresh_uses_the_store_name_when_the_city_code_is_zero(self):
        from bp.geo import refresh_store_locations
        con = connect(Path(tempfile.mkdtemp()) / "g.db")
        with con:
            con.execute("INSERT INTO city_codes VALUES('7700','עפולה')")
            # a full code table already cached, so the run does not go to data.gov.il
            con.executemany("INSERT INTO city_codes VALUES(?,?)", [(str(90000 + i), f"x{i}") for i in range(1001)])
            con.execute("INSERT INTO cities VALUES('עפולה', 32.6, 35.29, 'test')")
            con.execute("INSERT INTO stores(chain,store_id,name,address,city_raw,store_type,online) "
                        "VALUES('yochananof','37','עפולה','קהילת ציון 30','0','1',0)")
        refresh_store_locations(con, Fetcher())
        self.assertEqual(tuple(con.execute("SELECT city, lat FROM stores").fetchone()), ("עפולה", 32.6))


class FileNameTests(unittest.TestCase):
    """Rami Levy and Yochananof also publish <Kind><chain>-<store>-<yyyymmddhhmm>
    names, next to the usual <Kind><chain>-<sub>-<store>-<yyyymmdd>-<hhmmss>."""

    def test_store_from_both_name_shapes(self):
        from bp.sources import store_from_name
        self.assertEqual(store_from_name(f"PromoFull{RAMI}-712-202610011800.gz"), "712")
        self.assertEqual(store_from_name(f"PromoFull{RAMI}-001-039-20261001-020000.gz"), "39")
        self.assertEqual(store_from_name("PriceFull7290027600007-001-001-20261001-030000.gz"), "1")

    def test_latest_per_store_keeps_short_names_apart(self):
        from bp.sources import latest_per_store
        refs = [FileRef("pricefull", "a", f"PriceFull{RAMI}-712-202610010200.gz"),
                FileRef("pricefull", "b", f"PriceFull{RAMI}-712-202610011800.gz"),
                FileRef("pricefull", "c", f"PriceFull{RAMI}-713-202610010200.gz"),
                FileRef("pricefull", "d", f"PriceFull{RAMI}-001-039-20261001-020000.gz")]
        self.assertEqual(sorted(r.url for r in latest_per_store(refs)), ["b", "c", "d"])

    def test_lister_drops_files_long_out_of_date(self):
        # Yochananof still lists PriceFull files from 2024 next to today's
        users = Path(tempfile.mkdtemp()) / "u.json"
        users.write_text(json.dumps({"yochananof": {"username": "yohananof"}}), encoding="utf-8")
        y = "7290803800003"
        portal = FakePortal(users=("yohananof",), files={
            f"PriceFull{y}-7999-202412271528.gz": b"old",
            f"PriceFull{y}-000-001-20261001-010000.gz": b"new",
            f"PriceFull{y}-000-002-20260929-010000.gz": b"two days old, kept",
        })
        refs = list_cerberus(Fetcher(), "yochananof", y, users_path=users,
                             session_factory=lambda u, **kw: session(portal, u))
        self.assertEqual(sorted(r.name for r in refs), [f"PriceFull{y}-000-001-20261001-010000.gz",
                                                        f"PriceFull{y}-000-002-20260929-010000.gz"])


class RulesOnNewCatalogsTests(unittest.TestCase):
    """Wrong matches found on Elad's list once the new chains came in (2.10.2026)."""

    @classmethod
    def setUpClass(cls):
        from bp.match import load_rules
        rules = load_rules(Path(__file__).resolve().parents[3] / "src" / "lib" / "prices" / "canonical-items.json")
        cls.by_id = {r.id: r for r in rules}

    def test_ground_paprika_is_not_a_pepper(self):
        pepper = self.by_id["pepper"]
        self.assertFalse(pepper.matches("פלפל גרוס מתוק", True))  # Rami Levy, 60 ₪/kg spice
        self.assertTrue(pepper.matches("פלפל כתום", True))

    def test_eggplant_spread_and_fruit_puree_are_not_dairy_desserts(self):
        d = self.by_id["dessert-dairy"]
        self.assertFalse(d.matches("מעדן חצילים 200 גר ש", False))  # Rami Levy
        self.assertFalse(d.matches("מעדן פרי תפוז 320 גר", False))  # Rami Levy
        self.assertTrue(d.matches("מילקי אקסטרה קצפת 17", False))

    def test_more_wrong_matches_from_the_new_catalogs(self):
        self.assertFalse(self.by_id["pepper"].matches("פלפל סודני שלם", True))  # Rami Levy, spice 75 ₪/kg
        self.assertFalse(self.by_id["pepper"].matches("פלפל מתוק שלם", True))  # Rami Levy, spice 80 ₪/kg
        self.assertFalse(self.by_id["pepper"].matches("טאפס פלפל חלפניו", True))  # Rami Levy, deli 159 ₪/kg
        self.assertFalse(self.by_id["dessert-dairy"].matches("מעדן משמש 300 גר", False))  # Rami Levy, fruit
        self.assertFalse(self.by_id["mint"].matches("ריבת אוכמניות עם נענע 300 גרם SAVA", False))  # Tiv Taam
        self.assertFalse(self.by_id["tomato"].matches("עגבניה מגי", True))  # Tiv Taam
        self.assertTrue(self.by_id["mint"].matches("נענע", False))
        self.assertTrue(self.by_id["tomato"].matches("עגבניה", True))

    def test_dairy_dessert_needs_a_dairy_marker(self):
        # the rule used to accept any "מעדן": jams, pet food, borekas (measured on 7 chains)
        d = self.by_id["dessert-dairy"]
        for bad in ("מעדן דובדבן 300 גר", "אולטרא פט מעדן ברווז לכלב 100 גרם", "מעדן -קונפיטורה תות שדה 1.25 ק\"ג",
                    "מזון לחתול מעדן טונה", "מעדן אוכמניות 280 גרם"):
            self.assertFalse(d.matches(bad, False), bad)
        for good in ("מילקי אקסטרה קצפת 17", "מעדן חלב דל קלוריות", "מילקי פסק זמן 133 גרם", "מעדן הגולן וניל",
                     "דני שוקולד 115 גרם", "מעדן שוקולד 125 גרם"):
            self.assertTrue(d.matches(good, False), good)
