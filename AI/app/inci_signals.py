"""INCIDecoder per-ingredient signal index.

Loads the batch-scraped INCIDecoder data (``scripts/incidecoder/data/*.json``)
into an in-memory index keyed by normalized INCI name. Exposes ``irritancy``,
``comedogenicity``, ``functions``, and ``rating`` signals used as a scoring
layer that does **not** depend on ``chem_full.csv`` — widening coverage well
beyond the 101-row CSV.

The loader is defensive: if the data directory is missing (e.g. a deploy that
ships only ``AI/``), the index is simply empty and the engines fall back to the
CSV-only behaviour.
"""

from __future__ import annotations

import json
import re
import threading
import unicodedata
from dataclasses import dataclass
from pathlib import Path

# scripts/incidecoder/data lives at the repo root, two levels above AI/app/.
_DATA_DIR = Path(__file__).resolve().parents[2] / "scripts" / "incidecoder" / "data"

_ZERO_WIDTH = "\u200b"


@dataclass(frozen=True, slots=True)
class IngredientSignal:
    """Deterministic INCIDecoder signals for a single INCI ingredient."""

    irritancy: int | None = None
    comedogenicity: int | None = None
    functions: tuple[str, ...] = ()
    rating: str | None = None  # "superstar" | "goodie" | "icky"

    @property
    def has_data(self) -> bool:
        return bool(
            self.irritancy is not None
            or self.comedogenicity is not None
            or self.functions
            or self.rating
        )


def _norm(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip().lower()


def _clean_function(value: str) -> str:
    """Strip the zero-width space INCIDecoder embeds in tags like
    ``moisturizer/\u200bhumectant`` and lowercase."""
    return value.replace(_ZERO_WIDTH, "").strip().lower()


def _parse_scale(value: object) -> int | None:
    """Parse an irritancy/comedogenicity value to an int.

    Handles single values (``"3"``) and ranges (``"0-2"`` → upper bound 2).
    Returns ``None`` when no digit is present.
    """
    if value is None:
        return None
    nums = re.findall(r"\d+", str(value))
    if not nums:
        return None
    return max(int(n) for n in nums)


class SignalStore:
    """In-memory INCI name → :class:`IngredientSignal` index."""

    def __init__(self) -> None:
        self.by_name: dict[str, IngredientSignal] = {}
        self._load()

    def get(self, name: str | None) -> IngredientSignal | None:
        if not name:
            return None
        return self.by_name.get(_norm(name))

    def _load(self) -> None:
        if not _DATA_DIR.is_dir():
            return
        merged: dict[str, dict] = {}
        for path in sorted(_DATA_DIR.glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            for product in data.get("products", []):
                for ing in product.get("ingredients", []):
                    name = (ing.get("name") or "").strip()
                    if not name:
                        continue
                    acc = merged.setdefault(
                        _norm(name),
                        {"irr": None, "com": None, "fn": set(), "rat": None},
                    )
                    irr = _parse_scale(ing.get("irritancy"))
                    if irr is not None:
                        acc["irr"] = irr if acc["irr"] is None else max(acc["irr"], irr)
                    com = _parse_scale(ing.get("comedogenicity"))
                    if com is not None:
                        acc["com"] = com if acc["com"] is None else max(acc["com"], com)
                    rating = ing.get("rating")
                    if rating:
                        acc["rat"] = _norm(str(rating))
                    for fn in ing.get("functions") or []:
                        cleaned = _clean_function(fn)
                        if cleaned:
                            acc["fn"].add(cleaned)

        self.by_name = {
            key: IngredientSignal(
                irritancy=v["irr"],
                comedogenicity=v["com"],
                functions=tuple(sorted(v["fn"])),
                rating=v["rat"],
            )
            for key, v in merged.items()
        }


# ---------------------------------------------------------------------------
# Module-level singleton (thread-safe, lazy)
# ---------------------------------------------------------------------------

_signals: SignalStore | None = None
_lock = threading.Lock()


def get_signals() -> SignalStore:
    """Return the singleton :class:`SignalStore`, creating it on first call."""
    global _signals  # noqa: PLW0603
    if _signals is None:
        with _lock:
            if _signals is None:
                _signals = SignalStore()
    return _signals
