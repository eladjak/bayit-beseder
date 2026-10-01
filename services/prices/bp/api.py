"""HTTP API for price comparison. Bound to 127.0.0.1; reached only through the tunnel path
/bayit-prices/ and only with the shared server-to-server key (except /health).

The household id comes from the Bayit server, which derives it from the logged-in
session; this service never trusts a household id from a browser because no
browser ever holds the key.
"""
from __future__ import annotations

import contextlib
import hmac
import json
import os
import sqlite3
import sys
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .compare import IL, ItemReq, compare
from .db import connect
from .match import Matcher, load_rules

PREFIX = "/bayit-prices"
MAX_BODY = 64 * 1024
_UUID = __import__("re").compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class State:
    def __init__(self, home: Path, key: str):
        self.home = home
        self.key = key.encode()
        self.db_path = home / "data" / "prices.db"
        self.rules_path = Path(os.environ.get("BP_RULES", home / "canonical-items.json"))
        self._lock = threading.Lock()
        self._matcher = None
        self._rules_mtime = 0.0
        connect(self.db_path).close()  # ensure schema

    def matcher(self) -> Matcher:
        mt = self.rules_path.stat().st_mtime
        with self._lock:
            if self._matcher is None or mt != self._rules_mtime:
                self._matcher = Matcher(load_rules(self.rules_path))
                self._rules_mtime = mt
            return self._matcher

    @contextlib.contextmanager
    def con(self):
        c = sqlite3.connect(str(self.db_path), timeout=30)
        try:
            yield c
            c.commit()
        finally:
            c.close()


def make_handler(state: State):
    class H(BaseHTTPRequestHandler):
        server_version = "bayit-prices/1"

        def log_message(self, fmt, *args):  # no request bodies, no query strings in logs
            sys.stderr.write(f"{self.command} {urlparse(self.path).path} -> {args[1] if len(args) > 1 else ''}\n")

        def _send(self, code: int, obj) -> None:
            body = json.dumps(obj, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "private, no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _authed(self) -> bool:
            got = (self.headers.get("X-Bayit-Prices-Key") or "").encode()
            return bool(got) and hmac.compare_digest(got, state.key)

        def _body(self):
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_BODY:
                raise ValueError("body size")
            return json.loads(self.rfile.read(n).decode("utf-8"))

        def _route(self) -> str | None:
            p = urlparse(self.path).path
            if not p.startswith(PREFIX + "/"):
                return None
            return p[len(PREFIX):]

        def do_GET(self):
            r = self._route()
            if r == "/v1/health":
                with state.con() as c:
                    rows = c.execute("SELECT key, last_ok_at, last_error IS NOT NULL FROM chains ORDER BY key").fetchall()
                return self._send(200, {"ok": True, "chains": [
                    {"chain": k, "lastOk": ok, "lastRunFailed": bool(err)} for k, ok, err in rows]})
            if r is None:
                return self._send(404, {"error": "not found"})
            if not self._authed():
                return self._send(401, {"error": "unauthorized"})
            q = parse_qs(urlparse(self.path).query)
            if r == "/v1/cities":
                with state.con() as c:
                    rows = c.execute(
                        "SELECT city, MIN(lat), MIN(lon), COUNT(*) FROM stores WHERE lat IS NOT NULL AND online=0 "
                        "GROUP BY city ORDER BY city").fetchall()
                return self._send(200, {"cities": [{"name": n, "lat": a, "lon": o, "stores": k} for n, a, o, k in rows]})
            if r == "/v1/candidates":
                cid = (q.get("canonicalId") or [""])[0][:80]
                with state.con() as c:
                    # up to 12 per chain, most widely sold first, so every chain is represented
                    rows = c.execute(
                        "SELECT chain, item_code, name, manufacturer, size, dim, weighted, avg_price, stores FROM ("
                        " SELECT d.chain, d.item_code, d.name, d.manufacturer, d.size, d.dim, d.weighted,"
                        " s.avg_price, s.stores,"
                        " ROW_NUMBER() OVER (PARTITION BY d.chain ORDER BY s.stores DESC, s.avg_price) AS rn"
                        " FROM cand x JOIN products d ON d.chain=x.chain AND d.item_code=x.item_code"
                        " JOIN product_stats s ON s.chain=x.chain AND s.item_code=x.item_code"
                        " WHERE x.canonical_id=?) WHERE rn <= 12 ORDER BY chain, rn",
                        (cid,)).fetchall()
                return self._send(200, {"candidates": [
                    {"chain": ch, "code": code, "name": nm, "manufacturer": mf, "size": sz, "dim": dm,
                     "weighted": bool(w), "avgPrice": ap, "stores": n} for ch, code, nm, mf, sz, dm, w, ap, n in rows]})
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            r = self._route()
            if r is None:
                return self._send(404, {"error": "not found"})
            if not self._authed():
                return self._send(401, {"error": "unauthorized"})
            try:
                body = self._body()
            except Exception:
                return self._send(400, {"error": "bad body"})
            hh = str(body.get("householdId") or "")
            if not _UUID.match(hh):
                return self._send(400, {"error": "householdId"})
            if r == "/v1/pin":
                cid = str(body.get("canonicalId") or "")[:80]
                code = body.get("itemCode")
                with state.con() as c:
                    if code is None:
                        c.execute("DELETE FROM pins WHERE household_id=? AND canonical_id=?", (hh, cid))
                    else:
                        c.execute("INSERT OR REPLACE INTO pins VALUES(?,?,?,?,?)",
                                  (hh, cid, f'{str(body.get("chain") or "")[:20]}|{str(code)[:20]}',
                                   str(body.get("name") or "")[:120], datetime.now(IL).isoformat(timespec="seconds")))
                return self._send(200, {"ok": True})
            if r == "/v1/compare":
                try:
                    origin = body.get("origin") or {}
                    lat, lon = float(origin["lat"]), float(origin["lon"])
                    if not (29 < lat < 34 and 34 < lon < 36):
                        raise ValueError
                except Exception:
                    return self._send(400, {"error": "origin"})
                raw = body.get("items") or []
                if not isinstance(raw, list) or len(raw) > 200:
                    return self._send(400, {"error": "items"})
                with state.con() as c:
                    pins = {cid: v for cid, v in c.execute(
                        "SELECT canonical_id, item_code FROM pins WHERE household_id=?", (hh,))}
                    reqs = []
                    for it in raw:
                        cid = it.get("canonicalId")
                        pin = pins.get(cid) if cid else None
                        pin_chain, pin_code = (pin.split("|", 1) if pin and "|" in pin else (None, None))
                        try:
                            qty = float(it.get("qty") or 1)
                        except (TypeError, ValueError):
                            qty = 1.0
                        reqs.append(ItemReq(key=str(it.get("key"))[:60], canonical_id=cid, qty=qty,
                                            strict=[str(s)[:30] for s in (it.get("strict") or [])][:6],
                                            pin_code=pin_code, pin_chain=pin_chain))
                    radius = min(max(float(body.get("radiusKm") or 20), 2), 60)
                    res = compare(c, state.matcher(), reqs, (lat, lon), radius_km=radius)
                res["pins"] = {k: v for k, v in pins.items()}
                return self._send(200, res)
            return self._send(404, {"error": "not found"})

    return H


def main() -> int:
    key = os.environ.get("BAYIT_PRICES_KEY", "")
    if len(key) < 32:
        print("BAYIT_PRICES_KEY missing or too short; refusing to start", file=sys.stderr)
        return 2
    home = Path(os.environ.get("BP_HOME", "/opt/bayit-prices"))
    port = int(os.environ.get("BP_PORT", "3995"))
    srv = ThreadingHTTPServer(("127.0.0.1", port), make_handler(State(home, key)))
    srv.daemon_threads = True
    print(f"bayit-prices api on 127.0.0.1:{port}", file=sys.stderr, flush=True)
    srv.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
