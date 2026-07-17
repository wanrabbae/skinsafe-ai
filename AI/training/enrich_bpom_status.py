"""Populate data/bpom_status.json with best-effort BPOM registry status per product.

The recommendation catalog is sourced from INCIDecoder and carries no BPOM
notification numbers, so registry status is resolved by searching each product's
name through the apiindonesia BPOM endpoint (the same source the Apps BFF uses).
The result is a sidecar keyed by product slug that ``LocalProductRanker`` folds
into the 25% ``bpomTrust`` component. A product whose lookup cannot be reached is
left out entirely so it keeps neutral trust instead of being penalized.

Requires ``API_INDONESIA_API_BPOM_URL`` (base ending with ``?q=``) and
``API_INDONESIA_API_KEY``. Run from the ``AI/`` directory, e.g. reusing the Apps
credentials:

    set -a && . ../Apps/.env && set +a
    py -3.12 training/enrich_bpom_status.py --limit 5
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

AI_ROOT = Path(__file__).resolve().parents[1]
_CATALOG = AI_ROOT / "data" / "local_product_catalog.json"
_OUT = AI_ROOT / "data" / "bpom_status.json"
_TIMEOUT = float(os.getenv("BPOM_TIMEOUT", "15"))
_MATCH_THRESHOLD = 0.6
_PAGE_CAP = 50
_RETRIES = 2
# Cloudflare (error 1010) bans the default urllib signature; mimic a browser.
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
)
_INACTIVE_TOKENS = ("tidak berlaku", "dibatalkan", "batal", "kadaluarsa", "kadaluwarsa", "expired")


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _is_active(status: str | None) -> bool | None:
    if not status:
        return None
    lowered = status.lower()
    if any(token in lowered for token in _INACTIVE_TOKENS):
        return False
    if "berlaku" in lowered or "aktif" in lowered:
        return True
    return None


def _search(base_url: str, api_key: str, query: str) -> list[dict[str, Any]] | None:
    """Return the raw ``data`` list, or ``None`` when the endpoint is unreachable."""
    url = f"{base_url}{urllib.parse.quote(query)}"
    request = urllib.request.Request(
        url,
        headers={"accept": "application/json", "x-api-key": api_key, "user-agent": _USER_AGENT},
    )
    for attempt in range(_RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=_TIMEOUT) as response:  # noqa: S310
                if response.status != 200:
                    return None
                body = json.loads(response.read().decode("utf-8", "replace"))
            data = body.get("data") if isinstance(body, dict) else None
            return data if isinstance(data, list) else []
        except (urllib.error.URLError, OSError, ValueError, TimeoutError):
            if attempt < _RETRIES:
                time.sleep(1.0 + attempt)
                continue
            return None
    return None


def _match(data: list[dict[str, Any]], brand: str, name: str) -> dict[str, Any] | None:
    # The registry search matches keywords, so a full product name returns
    # nothing; we query the brand once (see main) and fuzzy-match by product name.
    # A positive match is always trustworthy. A *negative* conclusion is only
    # safe when the brand list is complete (< page cap): absence inside a
    # truncated list would be a pagination artifact, so we leave it neutral.
    target = _normalize(f"{brand} {name}")
    best: tuple[float, dict[str, Any]] | None = None
    for item in data:
        if not isinstance(item, dict):
            continue
        candidate = _normalize(f"{item.get('brand') or ''} {item.get('product_name') or ''}")
        if not candidate:
            continue
        ratio = difflib.SequenceMatcher(None, target, candidate).ratio()
        if best is None or ratio > best[0]:
            best = (ratio, item)
    if best is not None and best[0] >= _MATCH_THRESHOLD:
        item = best[1]
        return {
            "found": True,
            "active": _is_active(str(item.get("status") or "") or None),
            "number": item.get("nie") or None,
        }
    if data and len(data) < _PAGE_CAP:
        return {"found": False, "active": None, "number": None}
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N products (0 = all).")
    parser.add_argument("--sleep", type=float, default=0.2, help="Delay between requests, seconds.")
    args = parser.parse_args()

    base_url = os.getenv("API_INDONESIA_API_BPOM_URL")
    api_key = os.getenv("API_INDONESIA_API_KEY")
    if not base_url or not api_key:
        print("API_INDONESIA_API_BPOM_URL and API_INDONESIA_API_KEY must be set. Aborting.")
        return 1

    catalog = json.loads(_CATALOG.read_text(encoding="utf-8"))
    products_in = catalog["products"]
    if args.limit > 0:
        products_in = products_in[: args.limit]

    # One registry query per unique brand (34 brands vs 501 products), cached and
    # reused to match every product of that brand.
    brands = sorted({str(p.get("brand") or "").strip() for p in products_in if p.get("brand")})
    brand_data: dict[str, list[dict[str, Any]] | None] = {}
    for index, brand in enumerate(brands):
        brand_data[brand] = _search(base_url, api_key, brand)
        print(f"[{index + 1}/{len(brands)}] {brand}: "
              f"{'unreachable' if brand_data[brand] is None else str(len(brand_data[brand])) + ' items'}")
        if args.sleep and index + 1 < len(brands):
            time.sleep(args.sleep)

    products: dict[str, dict[str, Any]] = {}
    unreachable = 0
    for product in products_in:
        slug = str(product.get("slug") or "")
        brand = str(product.get("brand") or "").strip()
        if not slug:
            continue
        data = brand_data.get(brand)
        if data is None:
            unreachable += 1
            continue
        status = _match(data, brand, str(product.get("name") or ""))
        if status is None:
            unreachable += 1
            continue
        products[slug] = status

    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": base_url,
        "note": "Missing slug = belum diverifikasi (skor BPOM netral).",
        "products": products,
    }
    _OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    found = sum(1 for entry in products.values() if entry["found"])
    print(
        f"Wrote {len(products)} entries to {_OUT} "
        f"({found} found, {len(products) - found} not found, {unreachable} unreachable/skipped)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
