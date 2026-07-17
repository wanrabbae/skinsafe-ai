"""Live BPOM notification verification.

``cekbpom.pom.go.id`` exposes no stable public JSON API and is protected by
Cloudflare, so a direct hit is best-effort and frequently blocked. The reliable
path is to point ``BPOM_VERIFY_URL`` at a proxy that returns clean JSON (for
example an ``indonesia-civic-stack`` instance at
``http://localhost:8000/bpom/check/{number}``).

Every lookup degrades gracefully: any network/parse failure yields
``checked=False`` so the caller can fall back to format-only trust instead of
crashing the analysis pipeline. Results are cached per-number for the process
lifetime.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from functools import lru_cache

_TIMEOUT = float(os.getenv("BPOM_TIMEOUT", "5"))
_USER_AGENT = "Mozilla/5.0 (compatible; SkinSafeAI/1.0; +https://skinsafe.ai)"
_ACTIVE_TOKENS = {"ACTIVE", "AKTIF", "VALID", "TERDAFTAR"}


@dataclass(frozen=True, slots=True)
class BpomVerification:
    number: str
    checked: bool  # whether a live lookup actually completed
    found: bool  # whether the notification number exists in the registry
    active: bool | None  # registration status when known
    product_name: str | None
    source: str


@dataclass(frozen=True, slots=True)
class BpomSearchItem:
    number: str | None
    product_name: str | None
    registrant: str | None  # perusahaan/pendaftar (dipakai sebagai "brand")
    status: str | None
    active: bool | None
    composition: str | None


def _canonical(number: str) -> str:
    return re.sub(r"[\s-]+", "", number).upper()


def _unchecked(number: str, source: str) -> BpomVerification:
    return BpomVerification(
        number=number,
        checked=False,
        found=False,
        active=None,
        product_name=None,
        source=source,
    )


def _fetch(url: str) -> tuple[int, str]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": _USER_AGENT, "Accept": "application/json, text/html"},
    )
    with urllib.request.urlopen(request, timeout=_TIMEOUT) as response:  # noqa: S310
        return response.status, response.read().decode("utf-8", "replace")


def _verify_via_proxy(number: str, template: str) -> BpomVerification:
    url = template.format(number=urllib.parse.quote(number))
    try:
        status, body = _fetch(url)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return _unchecked(number, url)
    if status != 200:
        return _unchecked(number, url)
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return _unchecked(number, url)

    result = data.get("result") if isinstance(data.get("result"), dict) else {}
    found = bool(data.get("found", result.get("product_name")))
    status_token = str(
        data.get("status") or result.get("registration_status") or ""
    ).upper()
    active = status_token in _ACTIVE_TOKENS if status_token else None
    product_name = result.get("product_name") or data.get("product_name")
    return BpomVerification(
        number=number,
        checked=True,
        found=found,
        active=active,
        product_name=product_name,
        source=url,
    )


def _verify_via_cekbpom(number: str, base_url: str) -> BpomVerification:
    url = f"{base_url.rstrip('/')}/all-produk?q={urllib.parse.quote(number)}"
    try:
        status, body = _fetch(url)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return _unchecked(number, url)
    if status != 200:
        return _unchecked(number, url)
    # Cloudflare/reCAPTCHA usually blocks direct hits; only trust a 200 whose
    # payload actually echoes the notification number back.
    haystack = re.sub(r"[\s-]+", "", body).upper()
    return BpomVerification(
        number=number,
        checked=True,
        found=number in haystack,
        active=None,
        product_name=None,
        source=url,
    )


@lru_cache(maxsize=512)
def _verify_cached(number: str) -> BpomVerification:
    template = os.getenv("BPOM_VERIFY_URL")
    if template:
        return _verify_via_proxy(number, template)
    return _verify_via_cekbpom(number, os.getenv("BPOM_BASE_URL", "https://cekbpom.pom.go.id"))


def verify_bpom(number: str) -> BpomVerification:
    """Return the live registration status for a BPOM notification number."""
    return _verify_cached(_canonical(number))


# ---------------------------------------------------------------------------
# Search by product name/brand (proxy only)
# ---------------------------------------------------------------------------

_NUMBER_KEYS = (
    "number", "registration_number", "registrationNumber", "notification_number",
    "nomor_registrasi", "nomor_notifikasi", "nomor", "reg_number", "no_registrasi",
)
_NAME_KEYS = ("product_name", "productName", "nama_produk", "nama", "name", "product")
_REGISTRANT_KEYS = (
    "registrant", "pendaftar", "brand", "merk", "company", "manufacturer",
    "produsen", "nama_pendaftar", "nama_perusahaan",
)
_STATUS_KEYS = ("status", "registration_status", "registrationStatus", "status_produk")
_COMPOSITION_KEYS = ("composition", "komposisi", "ingredients", "bahan", "kandungan")


def _as_item_list(data: object) -> list[dict]:
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        for key in ("results", "data", "products", "items", "result"):
            value = data.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def _pick(*sources: dict, keys: tuple[str, ...]) -> str | None:
    for source in sources:
        for key in keys:
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, (int, float)):
                return str(value)
    return None


def _normalize_item(raw: dict) -> BpomSearchItem:
    nested = raw.get("result") if isinstance(raw.get("result"), dict) else {}
    status = _pick(raw, nested, keys=_STATUS_KEYS)
    active = status.upper() in _ACTIVE_TOKENS if status else None
    return BpomSearchItem(
        number=_pick(raw, nested, keys=_NUMBER_KEYS),
        product_name=_pick(raw, nested, keys=_NAME_KEYS),
        registrant=_pick(raw, nested, keys=_REGISTRANT_KEYS),
        status=status,
        active=active,
        composition=_pick(raw, nested, keys=_COMPOSITION_KEYS),
    )


@lru_cache(maxsize=256)
def _search_cached(query: str, limit: int) -> tuple[bool, tuple[BpomSearchItem, ...]]:
    """Return ``(reachable, items)``.

    ``reachable`` is ``False`` when the proxy is unconfigured or the lookup
    failed (network/HTTP/parse error), so callers can tell "search unavailable"
    apart from "product genuinely not in the registry".
    """
    template = os.getenv("BPOM_SEARCH_URL")
    if not template:
        return (False, ())
    url = template.format(query=urllib.parse.quote(query))
    try:
        status, body = _fetch(url)
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return (False, ())
    if status != 200:
        return (False, ())
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return (False, ())
    items = [_normalize_item(raw) for raw in _as_item_list(data)]
    # Only keep rows that carry at least a notification number or a name.
    items = [item for item in items if item.number or item.product_name]
    return (True, tuple(items[:limit]))


def search_bpom(query: str, limit: int = 10) -> list[BpomSearchItem]:
    """Search the BPOM registry by product name/brand via the configured proxy.

    Returns an empty list when no proxy is configured or the lookup fails, so
    callers degrade gracefully instead of erroring.
    """
    return search_bpom_status(query, limit)[1]


def search_bpom_status(query: str, limit: int = 10) -> tuple[bool, list[BpomSearchItem]]:
    """Like :func:`search_bpom` but also reports whether the proxy was reachable."""
    normalized = query.strip().lower()
    if len(normalized) < 3:
        return (True, [])
    reachable, items = _search_cached(normalized, max(1, min(limit, 20)))
    return (reachable, list(items))
