"""Streaming parsers for the Israeli Price Transparency files (PriceFull / Stores / PromoFull).

Chains write slightly different XML dialects: tag case varies (Store / STORE),
encodings vary (UTF-8, UTF-8 BOM, UTF-16 BOM), some files are gzip and some are
plain XML. Everything here is tag-case-insensitive and reads by local name, so a
dialect difference becomes a missing field, never a crash that silently drops a chain.
"""
from __future__ import annotations

import gzip
import io
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import IO, Iterator, Optional


def open_payload(raw: bytes) -> IO[bytes]:
    """Return a binary stream of the XML, gunzipping when the bytes are gzip."""
    if raw[:2] == b"\x1f\x8b":
        return io.BytesIO(gzip.decompress(raw))
    if raw[:2] == b"PK":  # a few portals ship zip
        import zipfile

        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            name = zf.namelist()[0]
            return io.BytesIO(zf.read(name))
    return io.BytesIO(raw)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _children(el: ET.Element) -> dict[str, str]:
    out: dict[str, str] = {}
    for ch in el:
        out[_local(ch.tag)] = (ch.text or "").strip()
    return out


def _num(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    s = s.strip().replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


@dataclass
class PriceRow:
    item_code: str
    name: str
    manufacturer: str
    qty: Optional[float]
    unit_qty: str
    unit_of_measure: str
    weighted: bool
    price: float
    unit_price: Optional[float]
    updated: str


@dataclass
class StoreRow:
    store_id: str
    name: str
    address: str
    city: str
    store_type: str
    sub_chain: str


def _header_value(root_children: dict[str, str], key: str) -> str:
    return root_children.get(key, "")


def iter_prices(stream: IO[bytes]) -> tuple[dict[str, str], Iterator[PriceRow]]:
    """Parse a Price/PriceFull file. Returns (header, rows iterator).

    Header holds chainid/storeid/subchainid, read as they stream past (they come
    before <Items> in every dialect we measured)."""
    header: dict[str, str] = {}

    def gen() -> Iterator[PriceRow]:
        for event, el in ET.iterparse(stream, events=("end",)):
            tag = _local(el.tag)
            if tag in ("chainid", "storeid", "subchainid") and tag not in header:
                header[tag] = (el.text or "").strip()
            if tag not in ("item", "product"):
                continue
            c = _children(el)
            el.clear()
            code = c.get("itemcode", "").strip()
            price = _num(c.get("itemprice"))
            if not code or price is None or price <= 0:
                continue
            yield PriceRow(
                item_code=code.lstrip("0") or code,
                name=re.sub(r"\s+", " ", c.get("itemname") or c.get("itemnm") or "").strip(),
                manufacturer=(c.get("manufacturername") or c.get("manufacturename") or "").strip(),
                qty=_num(c.get("quantity")),
                unit_qty=c.get("unitqty", ""),
                unit_of_measure=c.get("unitofmeasure", ""),
                weighted=(c.get("bisweighted") or c.get("blsweighted") or "0").strip() in ("1", "true"),
                price=price,
                unit_price=_num(c.get("unitofmeasureprice")),
                updated=c.get("priceupdatetime") or c.get("priceupdatedate") or "",
            )

    return header, gen()


def iter_stores(stream: IO[bytes]) -> tuple[dict[str, str], Iterator[StoreRow]]:
    header: dict[str, str] = {}

    def gen() -> Iterator[StoreRow]:
        sub_chain = ""
        for event, el in ET.iterparse(stream, events=("end",)):
            tag = _local(el.tag)
            if tag in ("chainid", "chainname") and tag not in header:
                header[tag] = (el.text or "").strip()
            if tag == "subchainid":
                sub_chain = (el.text or "").strip()
            if tag != "store":
                continue
            c = _children(el)
            el.clear()
            sid = c.get("storeid", "").strip()
            if not sid:
                continue
            yield StoreRow(
                store_id=sid.lstrip("0") or "0",
                name=(c.get("storename") or "").strip(),
                address=(c.get("address") or "").strip(),
                city=(c.get("city") or "").strip(),
                store_type=(c.get("storetype") or "").strip(),
                sub_chain=c.get("subchainid", sub_chain) or sub_chain,
            )

    return header, gen()


@dataclass
class PromoItem:
    item_code: str
    promotion_id: str
    description: str
    start: str
    end: str
    club_all: bool
    min_qty: Optional[float]
    discounted_price: Optional[float]


def iter_promos(stream: IO[bytes]) -> Iterator[PromoItem]:
    """Yield one PromoItem per (promotion, item). Display-only in the MVP: the
    meaning of DiscountedPrice differs between chains (unit vs bundle), so it is
    never summed into a basket total."""
    for event, el in ET.iterparse(stream, events=("end",)):
        if _local(el.tag) != "promotion":
            continue
        top = _children(el)
        club = top.get("clubid", "")
        club_all = club.strip().startswith("0") or club.strip() == ""
        for sub in el.iter():
            if _local(sub.tag) not in ("promotionitem", "item"):
                continue
            c = _children(sub)
            code = c.get("itemcode", "").strip()
            if not code:
                continue
            yield PromoItem(
                item_code=code.lstrip("0") or code,
                promotion_id=top.get("promotionid", ""),
                description=top.get("promotiondescription", ""),
                start=top.get("promotionstartdatetime") or top.get("promotionstartdate", ""),
                end=top.get("promotionenddatetime") or top.get("promotionenddate", ""),
                club_all=club_all,
                min_qty=_num(c.get("minqty") or top.get("minqty")),
                discounted_price=_num(c.get("discountedprice") or top.get("discountedprice")),
            )
        el.clear()


# ---------------------------------------------------------------------------
# Pack size normalisation
# ---------------------------------------------------------------------------

_UNIT_MAP = [
    (re.compile(r"קילו|ק\"ג|קג|kg", re.I), ("g", 1000.0)),
    (re.compile(r"גרם|גר|gr|g\b", re.I), ("g", 1.0)),
    (re.compile(r"מ\"ל|מל|ml|מיליליטר", re.I), ("ml", 1.0)),
    (re.compile(r"ליטר|ליט|l\b|lt", re.I), ("ml", 1000.0)),
    (re.compile(r"יח|unit|יחידה|יחידות", re.I), ("u", 1.0)),
]


def pack_size(qty: Optional[float], unit_qty: str, name: str = "") -> tuple[Optional[str], Optional[float]]:
    """Normalise a pack to (dimension, amount) with dimension in g / ml / u.

    Falls back to a size written in the product name ("1 ליטר", "500 גרם").
    Two corrections for what chains actually publish (measured 1.10.2026):
      * an explicit count in the name ("12 יח׳", "18 יחידות") wins: Wolt lists
        an egg carton as 2000 גרם;
      * a litre/kilo amount above 20 is really ml/grams: Carrefour lists a
        452 g cornflakes box as 452 ליטר."""
    m = re.search(r"(\d+)\s*(?:יח|יחידות|גלילים|גלי|ביצים)\b|(?:יח|יחידות)['׳]?\s*(\d+)", name or "")
    if m:
        n = int(m.group(1) or m.group(2))
        if n > 1:
            return "u", float(n)
    if qty and qty > 0 and unit_qty:
        for rx, (dim, mult) in _UNIT_MAP:
            if rx.search(unit_qty):
                if mult == 1000.0 and qty > 20:
                    mult = 1.0  # "452 ליטר" = 452 ml/g
                return dim, qty * mult
    m = re.search(r"(\d+(?:\.\d+)?)\s*(ק\"ג|קג|קילו|גרם|גר|מ\"ל|מל|ליטר|ל'|ל\b)", name)
    if m:
        n = float(m.group(1))
        u = m.group(2)
        if u in ('ק"ג', "קג", "קילו"):
            return "g", n * 1000
        if u in ("גרם", "גר"):
            return "g", n
        if u in ('מ"ל', "מל"):
            return "ml", n
        return "ml", n * 1000
    return None, None
