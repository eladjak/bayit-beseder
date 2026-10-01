"""Where each chain publishes, and how to list today's full files.

Only portals that need no login and no captcha. Each lister returns
FileRef(kind, url, name) for kinds 'stores' / 'pricefull' / 'promofull'.
A lister that cannot list raises; the caller records the chain as failed
for this run and keeps the previous day's data (never a silent empty chain).
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable
from zoneinfo import ZoneInfo

IL = ZoneInfo("Asia/Jerusalem")
UA = "BayitBeSeder-PriceCompare/1.0 (+https://www.bayitbeseder.com; daily, cached)"


@dataclass(frozen=True)
class FileRef:
    kind: str  # stores | pricefull | promofull
    url: str
    name: str


@dataclass(frozen=True)
class Chain:
    key: str
    chain_id: str
    name_he: str
    lister: Callable[["Fetcher"], list[FileRef]]
    online_only: bool = False


class Fetcher:
    def __init__(self, timeout: int = 120, retries: int = 3, pause: float = 0.5):
        self.timeout = timeout
        self.retries = retries
        self.pause = pause

    def get(self, url: str) -> bytes:
        last: Exception | None = None
        for attempt in range(self.retries):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    data = r.read()
                time.sleep(self.pause)
                return data
            except Exception as e:  # network errors are retried, then raised
                last = e
                time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"fetch failed {url}: {last}")

    def text(self, url: str) -> str:
        return self.get(url).decode("utf-8", "replace")


def _kind(name: str) -> str | None:
    n = name.lower()
    if n.startswith("pricefull"):
        return "pricefull"
    if n.startswith("promofull"):
        return "promofull"
    if n.startswith("stores"):
        return "stores"
    return None


def latest_per_store(refs: list[FileRef]) -> list[FileRef]:
    """Keep the newest file per (kind, store). File names end in
    <chain>-<sub>-<store>-<yyyymmdd>-<hhmm..>; stores files have no store part."""
    best: dict[tuple[str, str], tuple[str, FileRef]] = {}
    for r in refs:
        base = r.name.split("?")[0].rsplit("/", 1)[-1]
        stem = re.sub(r"\.(gz|xml|zip)$", "", base, flags=re.I)
        parts = stem.split("-")
        stamp = "".join(parts[-2:]) if len(parts) >= 3 else stem
        store = parts[-3] if r.kind != "stores" and len(parts) >= 4 else "*"
        key = (r.kind, store.lstrip("0") or "0")
        if key not in best or stamp > best[key][0]:
            best[key] = (stamp, r)
    return [v[1] for v in best.values()]


# --- Shufersal ---------------------------------------------------------------

_SHUF_BASE = "https://prices.shufersal.co.il/FileObject/UpdateCategory?catID={cat}&storeId=0&page={page}"
_SHUF_CATS = {"pricefull": 2, "promofull": 4, "stores": 5}


def parse_shufersal_page(page_html: str) -> tuple[list[str], int]:
    urls = [html.unescape(u) for u in re.findall(r'https://pricesprodpublic[^"\']+', page_html)]
    pages = [int(p) for p in re.findall(r"page=(\d+)", page_html)]
    return urls, max(pages) if pages else 1


def list_shufersal(f: Fetcher, kinds=("stores", "pricefull", "promofull")) -> list[FileRef]:
    out: list[FileRef] = []
    for kind in kinds:
        cat = _SHUF_CATS[kind]
        first, last_page = parse_shufersal_page(f.text(_SHUF_BASE.format(cat=cat, page=1)))
        urls = list(first)
        for p in range(2, last_page + 1):
            more, _ = parse_shufersal_page(f.text(_SHUF_BASE.format(cat=cat, page=p)))
            urls.extend(more)
        for u in urls:
            name = u.split("?")[0].rsplit("/", 1)[-1]
            if _kind(name) == kind:
                out.append(FileRef(kind, u, name))
    if "pricefull" in kinds and not any(r.kind == "pricefull" for r in out):
        raise RuntimeError("shufersal: no PriceFull files listed")
    return latest_per_store(out)


# Shufersal download links are signed and expire one hour after listing
# (measured 1.10.2026: a link listed at 09:40Z carried se=10:40Z and returned 403
# later). Listing all three kinds before downloading took longer than that, so
# the ingest lists and downloads one kind at a time.
SHUFERSAL_KIND_ORDER = ("stores", "pricefull", "promofull")


# --- Carrefour (ex Yeinot Bitan / Mega) ----------------------------------------

def parse_carrefour_index(page_html: str) -> tuple[str, list[str]]:
    m = re.search(r"const path = '(\d{8})'", page_html)
    fm = re.search(r"const files = (\[.*?\]);", page_html, re.S)
    if not m or not fm:
        raise RuntimeError("carrefour: index format changed")
    names = [x["name"] for x in json.loads(fm.group(1)) if isinstance(x, dict) and x.get("name")]
    return m.group(1), names


def list_carrefour(f: Fetcher) -> list[FileRef]:
    path, names = parse_carrefour_index(f.text("https://prices.carrefour.co.il/"))
    refs = [FileRef(k, f"https://prices.carrefour.co.il/{path}/{n}", n) for n in names if (k := _kind(n))]
    if not any(r.kind == "pricefull" for r in refs):
        raise RuntimeError("carrefour: no PriceFull files listed")
    return latest_per_store(refs)


# --- Wolt Market (online only) ---------------------------------------------------

_WOLT = "https://wm-gateway.wolt.com/isr-prices/public/v1/"


def parse_wolt_index(page_html: str) -> list[str]:
    return re.findall(r'href="(download/[^"]+)"', page_html)


def list_wolt(f: Fetcher, now: datetime | None = None) -> list[FileRef]:
    now = now or datetime.now(IL)
    for back in range(3):
        day = (now - timedelta(days=back)).strftime("%Y-%m-%d")
        try:
            links = parse_wolt_index(f.text(f"{_WOLT}{day}.html"))
        except RuntimeError:
            continue
        refs = [FileRef(k, _WOLT + l, l.rsplit("/", 1)[-1]) for l in links if (k := _kind(l.rsplit("/", 1)[-1]))]
        if any(r.kind == "pricefull" for r in refs):
            return latest_per_store(refs)
    raise RuntimeError("wolt: no PriceFull files in the last 3 days")


CHAINS: dict[str, Chain] = {
    "shufersal": Chain("shufersal", "7290027600007", "שופרסל", list_shufersal),
    "carrefour": Chain("carrefour", "7290055700007", "קרפור", list_carrefour),
    "wolt": Chain("wolt", "7290058249350", "וולט מרקט", list_wolt, online_only=True),
}
