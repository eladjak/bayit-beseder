"""SQLite store for price comparison. Separate from the shared Supabase DB on purpose."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS chains(
  key TEXT PRIMARY KEY, chain_id TEXT, name_he TEXT, online_only INTEGER DEFAULT 0,
  last_ok_at TEXT, last_attempt_at TEXT, last_error TEXT,
  files_ok INTEGER, files_failed INTEGER, stores INTEGER, products INTEGER, prices INTEGER
);
CREATE TABLE IF NOT EXISTS stores(
  chain TEXT, store_id TEXT, name TEXT, address TEXT, city_raw TEXT, city TEXT,
  store_type TEXT, online INTEGER DEFAULT 0, lat REAL, lon REAL, price_published TEXT,
  PRIMARY KEY(chain, store_id)
);
CREATE TABLE IF NOT EXISTS products(
  chain TEXT, item_code TEXT, name TEXT, manufacturer TEXT, dim TEXT, size REAL, weighted INTEGER,
  PRIMARY KEY(chain, item_code)
);
CREATE TABLE IF NOT EXISTS cand(
  chain TEXT, canonical_id TEXT, item_code TEXT, PRIMARY KEY(chain, canonical_id, item_code)
);
CREATE INDEX IF NOT EXISTS cand_by_item ON cand(chain, canonical_id);
CREATE TABLE IF NOT EXISTS prices(
  chain TEXT, store_id TEXT, item_code TEXT, price REAL, updated TEXT,
  PRIMARY KEY(chain, store_id, item_code)
) WITHOUT ROWID;
-- by product: the candidates list and audits group prices per product (a full scan took >30 min)
CREATE INDEX IF NOT EXISTS prices_by_item ON prices(chain, item_code);
CREATE TABLE IF NOT EXISTS promos(
  chain TEXT, store_id TEXT, item_code TEXT, promotion_id TEXT, description TEXT,
  start TEXT, end TEXT, club_all INTEGER, min_qty REAL, discounted_price REAL
);
CREATE INDEX IF NOT EXISTS promos_by_store ON promos(chain, store_id, item_code);
CREATE TABLE IF NOT EXISTS product_stats(
  chain TEXT, item_code TEXT, avg_price REAL, stores INTEGER, PRIMARY KEY(chain, item_code)
);
CREATE TABLE IF NOT EXISTS pins(
  household_id TEXT, canonical_id TEXT, item_code TEXT, name TEXT, created_at TEXT,
  PRIMARY KEY(household_id, canonical_id)
);
CREATE TABLE IF NOT EXISTS city_codes(code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS cities(name TEXT PRIMARY KEY, lat REAL, lon REAL, source TEXT);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=60)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con
