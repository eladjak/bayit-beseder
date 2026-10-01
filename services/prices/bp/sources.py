"""Where each chain publishes, and how to list today's full files.

Public portals, plus the Cerberus portal (url.publishedprices.co.il), where a
chain publishes under a public username with an empty password (Elad approved
using those logins on 1.10.2026; never any other password). Each lister returns
FileRef(kind, url, name) for kinds 'stores' / 'pricefull' / 'promofull'.
A lister that cannot list raises; the caller records the chain as failed
for this run and keeps the previous day's data (never a silent empty chain).
"""
from __future__ import annotations

import html
import http.cookiejar
import json
import os
import re
import threading
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import partial
from pathlib import Path
from typing import Callable
from zoneinfo import ZoneInfo

IL = ZoneInfo("Asia/Jerusalem")
UA = "BayitBeSeder-PriceCompare/1.0 (+https://www.bayitbeseder.com; daily, cached)"


@dataclass(frozen=True)
class FileRef:
    kind: str  # stores | pricefull | promofull
    url: str
    name: str
    # a logged-in portal session that must download this file (Cerberus);
    # None means a plain public GET through the Fetcher
    session: object | None = field(default=None, compare=False, repr=False)


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


# <Kind><chain13>-[<sub>-]<store>-<yyyymmdd>[-]<hhmm[ss]>: the long shape is
# common to every chain; Rami Levy and Yochananof also publish -<store>-<yyyymmddhhmm>.
_NAME = re.compile(r"^[A-Za-z]+\d{13}-(?:\d+-)?(\d+)-(\d{8})-?(\d{4,6})(?:\D|$)")


def _name_parts(name: str) -> tuple[str, str] | None:
    """(store, stamp yyyymmddhhmmss) from a file name, or None if unrecognised."""
    base = name.split("?")[0].rsplit("/", 1)[-1]
    m = _NAME.match(base)
    if not m:
        return None
    return m.group(1).lstrip("0") or "0", m.group(2) + m.group(3).ljust(6, "0")


def store_from_name(name: str) -> str:
    p = _name_parts(name)
    return p[0] if p else ""


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
        np = _name_parts(base)
        if np and r.kind != "stores":
            store, stamp = np
        elif np:
            stamp = np[1]
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


# --- Cerberus portal: Rami Levy, Osher Ad, Yochananof, Tiv Taam ----------------
#
# Flow measured from the server on 1.10.2026 (written here, not copied from any
# scraper): GET /login gives a csrftoken meta tag and a session cookie; POST
# /login/user with the chain's public username and an EMPTY password lands on
# /file; POST /file/json/dir lists every file; GET /file/d/<name> downloads on
# the same session. FTP on url.retail.publishedprices.co.il refused connections.

PUBLISHED_PRICES = "https://url.publishedprices.co.il"
_CSRF = re.compile(r'name="csrftoken"\s+content="([^"]+)"')


class PortalLoginError(RuntimeError):
    pass


def portal_users_path() -> Path:
    env = os.environ.get("BP_PORTAL_USERS")
    if env:
        return Path(env)
    return Path(os.environ.get("BP_HOME", "/opt/bayit-prices")) / "config" / "portal_users.json"


def load_portal_user(chain_key: str, path: Path | str | None = None) -> str:
    """The chain's public username from the server-side settings file (outside git).
    A configured non-empty password is refused: only public empty-password logins."""
    p = Path(path) if path else portal_users_path()
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise PortalLoginError(f"portal users file missing: {p}") from None
    entry = data.get(chain_key) if isinstance(data, dict) else None
    if not isinstance(entry, dict) or not str(entry.get("username") or "").strip():
        raise PortalLoginError(f"no portal username configured for {chain_key} in {p}")
    if entry.get("password") not in (None, ""):
        raise PortalLoginError(f"{chain_key}: a non-empty password is configured; refusing (public empty-password logins only)")
    return str(entry["username"]).strip()


def _urllib_transport(timeout: int) -> Callable[[str, bytes | None], tuple[str, bytes]]:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(url: str, data: bytes | None = None) -> tuple[str, bytes]:
        req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
        with opener.open(req, timeout=timeout) as r:
            return r.geturl(), r.read()

    return call


class CerberusSession:
    """One logged-in session per chain. Downloads that come back to /login (the
    session expired) log in again once; an HTML page where a data file should be
    is an error, never parsed as an empty file."""

    def __init__(self, username: str, *, base: str = PUBLISHED_PRICES, transport=None, timeout: int = 120,
                 retries: int = 3, pause: float = 0.5, sleep: Callable[[float], None] = time.sleep):
        self.username = username
        self.base = base.rstrip("/")
        self._t = transport or _urllib_transport(timeout)
        self.retries = retries
        self.pause = pause
        self._sleep = sleep
        self._csrf = ""
        self._lock = threading.Lock()
        self._gen = 0  # login generation, so parallel downloads re-login once, not twice

    def login(self) -> None:
        _, body = self._t(self.base + "/login", None)
        m = _CSRF.search(body.decode("utf-8", "replace"))
        if not m:
            raise PortalLoginError("cerberus: no csrftoken on the login page (format changed?)")
        form = urllib.parse.urlencode({"r": "", "username": self.username, "password": "",
                                       "Submit": "Sign in", "csrftoken": m.group(1)}).encode()
        final, body = self._t(self.base + "/login/user", form)
        if urllib.parse.urlparse(final).path.rstrip("/") != "/file":
            raise PortalLoginError(f"cerberus: login rejected for {self.username!r}")
        m = _CSRF.search(body.decode("utf-8", "replace"))
        if not m:
            raise PortalLoginError("cerberus: no csrftoken after login")
        self._csrf = m.group(1)
        self._gen += 1

    def list_names(self) -> list[str]:
        form = urllib.parse.urlencode({"sEcho": "1", "iColumns": "5", "sColumns": ",,,,", "iDisplayStart": "0",
                                       "iDisplayLength": "100000", "mDataProp_0": "fname", "cd": "/",
                                       "csrftoken": self._csrf}).encode()
        final, body = self._t(self.base + "/file/json/dir", form)
        if "/login" in urllib.parse.urlparse(final).path:
            raise RuntimeError("cerberus: listing bounced to the login page")
        j = json.loads(body)
        rows = j.get("aaData")
        if not isinstance(rows, list):
            raise RuntimeError(f"cerberus: listing without aaData ({str(j)[:120]})")
        total = int(j.get("iTotalDisplayRecords") or j.get("iTotalRecords") or len(rows))
        if len(rows) < total:
            raise RuntimeError(f"cerberus: listing truncated ({len(rows)}/{total})")
        return [r["fname"] for r in rows if isinstance(r, dict) and r.get("fname")]

    def get(self, url: str) -> bytes:
        last: Exception | None = None
        relogged = False
        for attempt in range(self.retries + 1):
            gen = self._gen
            try:
                final, data = self._t(url, None)
            except Exception as e:  # network errors are retried, then raised
                last = e
                self._sleep(2 * (attempt + 1))
                continue
            if "/login" in urllib.parse.urlparse(final).path:
                if relogged:
                    raise RuntimeError(f"cerberus: session lost again after re-login: {url}")
                with self._lock:
                    if self._gen == gen:
                        self.login()
                relogged = True
                continue
            head = data[:300].lstrip().lower()
            if head.startswith(b"<!doctype html") or head.startswith(b"<html"):
                raise RuntimeError(f"cerberus: got an HTML page instead of a file: {url}")
            self._sleep(self.pause)
            return data
        raise RuntimeError(f"fetch failed {url}: {last}")


def list_cerberus(f: Fetcher, chain_key: str, chain_id: str, *, users_path: Path | str | None = None,
                  session_factory=CerberusSession) -> list[FileRef]:
    s = session_factory(load_portal_user(chain_key, users_path), timeout=f.timeout, retries=f.retries, pause=f.pause)
    s.login()
    names = s.list_names()
    refs = [FileRef(k, f"{s.base}/file/d/{urllib.parse.quote(n)}", n, session=s)
            for n in names if chain_id in n and (k := _kind(n))]
    if not any(r.kind == "pricefull" for r in refs):
        raise RuntimeError(f"{chain_key}: no PriceFull files listed for chain {chain_id} ({len(names)} files seen)")
    return latest_per_store(drop_out_of_date(refs))


MAX_FILE_AGE_DAYS = 3


def drop_out_of_date(refs: list[FileRef], max_days: int = MAX_FILE_AGE_DAYS) -> list[FileRef]:
    """The portal keeps old files listed (Yochananof: PriceFull files from 2024,
    measured 1.10.2026). Keep files dated within max_days of the newest one, so a
    store that stopped publishing is not ingested from a stale file."""
    stamps = [p[1] for r in refs if (p := _name_parts(r.name))]
    if not stamps:
        return refs
    newest = datetime.strptime(max(stamps)[:8], "%Y%m%d")
    cutoff = (newest - timedelta(days=max_days)).strftime("%Y%m%d")
    return [r for r in refs if (p := _name_parts(r.name)) is None or p[1][:8] >= cutoff]


def _cerberus(key: str, chain_id: str, name_he: str) -> Chain:
    return Chain(key, chain_id, name_he, partial(list_cerberus, chain_key=key, chain_id=chain_id))


CHAINS: dict[str, Chain] = {
    "shufersal": Chain("shufersal", "7290027600007", "שופרסל", list_shufersal),
    "carrefour": Chain("carrefour", "7290055700007", "קרפור", list_carrefour),
    "wolt": Chain("wolt", "7290058249350", "וולט מרקט", list_wolt, online_only=True),
    "ramilevy": _cerberus("ramilevy", "7290058140886", "רמי לוי"),
    "osherad": _cerberus("osherad", "7290103152017", "אושר עד"),
    "yochananof": _cerberus("yochananof", "7290803800003", "יוחננוף"),
    "tivtaam": _cerberus("tivtaam", "7290873255550", "טיב טעם"),
}
