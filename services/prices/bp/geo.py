"""Store locations at city level.

Shufersal writes a CBS settlement code ("2530"); other chains write a name.
Codes -> names come from data.gov.il (CBS settlement list). Names -> coordinates
come from OpenStreetMap Nominatim, at most one request per second, cached
forever in the `cities` table. Distance is between city centres and is shown to
people as approximate.
"""
from __future__ import annotations

import json
import math
import re
import sqlite3
import time
import urllib.parse

from .sources import Fetcher

CBS_RESOURCE = "5c78e9fa-c2e2-4771-93ff-7f400a12f7ba"
NOMINATIM = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&q="


def clean_city(name: str) -> str:
    n = re.sub(r"\s+", " ", (name or "").replace("״", '"').strip())
    n = re.sub(r"\s*-\s*", "-", n)
    return n


# Names a store file uses for a city whose official (CBS) name differs.
_CITY_ALIASES = {
    "תל אביב": "תל אביב-יפו",
    'ת"א': "תל אביב-יפו",
    "ראשלצ": "ראשון לציון",
    "מודיעין": "מודיעין-מכבים-רעות",
    "מישור אדומים": "מעלה אדומים",
}


def _fold(s: str) -> str:
    s = clean_city(s).replace("-", " ").replace("״", '"')
    s = s.replace("יי", "י").replace("וו", "ו")
    s = re.sub(r'[^\w" ]', " ", s)
    return " " + re.sub(r"\s+", " ", s).strip() + " "


def infer_city(texts: list[str], known: list[str]) -> str:
    """A city from free text, for chains whose Stores file has no city code
    (Yochananof writes City=0). The store name is tried before the address; the
    longest known name wins; a name shorter than 4 letters counts only when it
    is the whole text (so the address "נופי חמד" is not the village Hemed)."""
    table: dict[str, str] = {}
    for k in known:
        table.setdefault(_fold(k), k)
    by_fold = dict(table)
    for alias, target in _CITY_ALIASES.items():
        real = by_fold.get(_fold(target))
        if real:
            table[_fold(alias)] = real
    for text in texts:
        ft = _fold(text or "")
        if not ft.strip():
            continue
        best, best_len = "", 0
        for fk, name in table.items():
            core = fk.strip()
            if ft == fk or (len(core.replace(" ", "")) >= 4 and fk in ft):
                if len(core) > best_len:
                    best, best_len = name, len(core)
        if best:
            return best
    return ""


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    d = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(d))


def load_city_codes(con: sqlite3.Connection, f: Fetcher) -> int:
    have = con.execute("SELECT COUNT(*) FROM city_codes").fetchone()[0]
    if have > 1000:
        return have
    url = f"https://data.gov.il/api/3/action/datastore_search?resource_id={CBS_RESOURCE}&limit=5000"
    recs = json.loads(f.text(url))["result"]["records"]
    rows = [(str(r["סמל_ישוב"]).strip(), clean_city(r["שם_ישוב"])) for r in recs if r.get("סמל_ישוב")]
    with con:
        con.executemany("INSERT OR REPLACE INTO city_codes VALUES(?,?)", rows)
    return len(rows)


def geocode(con: sqlite3.Connection, f: Fetcher, name: str) -> tuple[float, float] | None:
    row = con.execute("SELECT lat, lon FROM cities WHERE name=?", (name,)).fetchone()
    if row:
        return (row[0], row[1]) if row[0] is not None else None
    try:
        res = json.loads(f.text(NOMINATIM + urllib.parse.quote(name)))
    except Exception:
        return None  # not cached: retried on the next run
    time.sleep(1.1)  # Nominatim policy: max 1 request/second
    if res:
        lat, lon = float(res[0]["lat"]), float(res[0]["lon"])
        if not (29.0 < lat < 33.6 and 34.0 < lon < 36.0):
            lat = lon = None
    else:
        lat = lon = None
    with con:
        con.execute("INSERT OR REPLACE INTO cities VALUES(?,?,?,?)", (name, lat, lon, "nominatim"))
    return (lat, lon) if lat is not None else None


def refresh_store_locations(con: sqlite3.Connection, f: Fetcher) -> dict:
    codes = 0
    numeric = con.execute("SELECT COUNT(*) FROM stores WHERE city_raw GLOB '[0-9]*'").fetchone()[0]
    if numeric:
        codes = load_city_codes(con, f)
    code_map = dict(con.execute("SELECT code, name FROM city_codes").fetchall())
    rows = con.execute("SELECT chain, store_id, city_raw, address, name FROM stores").fetchall()
    known = sorted(set(code_map.values()))
    updates = []
    inferred = 0
    for chain, sid, raw, address, name in rows:
        raw = (raw or "").strip()
        city = code_map.get(raw.lstrip("0"), "") if raw.isdigit() else clean_city(raw)
        if not city:
            city = infer_city([name or "", address or ""], known)
            inferred += bool(city)
        updates.append((city, chain, sid))
    with con:
        con.executemany("UPDATE stores SET city=? WHERE chain=? AND store_id=?", updates)
    names = [r[0] for r in con.execute("SELECT DISTINCT city FROM stores WHERE city != ''").fetchall()]
    located = 0
    for name in names:
        if geocode(con, f, name):
            located += 1
    with con:
        con.execute(
            "UPDATE stores SET lat=(SELECT lat FROM cities c WHERE c.name=stores.city), "
            "lon=(SELECT lon FROM cities c WHERE c.name=stores.city)"
        )
    return {"city_codes": codes, "cities": len(names), "located": located, "city_from_store_name": inferred}
