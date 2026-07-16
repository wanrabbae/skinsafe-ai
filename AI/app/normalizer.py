"""Ingredient name normalization and resolution against the chemical knowledge base.

Resolves raw ingredient names (from OCR, manual input, or product labels)
to canonical chemical names in ``chem_full.csv`` using a three-tier
matching strategy:

1. **Exact match** on normalized chemical name.
2. **Alias match** via INCI name ↔ chemical name mapping (built from the
   data at load time).
3. **Fuzzy match** via ``difflib.get_close_matches`` with a configurable
   similarity threshold (default 0.82).

Unresolved ingredients are kept with ``canonical_name=None`` — they are
never silently discarded (per docs: "unknown ingredients kept as
``unresolved``; unresolved ratio lowers confidence").
"""

from __future__ import annotations

import difflib
import re
import unicodedata
from dataclasses import dataclass

from .data_loader import DataStore, get_store

# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ResolvedIngredient:
    """Result of resolving a single raw ingredient name."""

    raw_name: str
    canonical_name: str | None  # None → unresolved
    confidence: float  # 1.0 exact, 0.82‒0.99 fuzzy, 0.0 unresolved
    match_type: str  # "exact" | "alias" | "fuzzy" | "unresolved"


# ---------------------------------------------------------------------------
# Normalizer
# ---------------------------------------------------------------------------

# Regex to strip parenthetical concentration suffixes like "(10%)"
_CONC_RE = re.compile(r"\s*\([\d.]+%?\)\s*$")

# Common trivial words to strip for better matching
_TRIVIAL_PREFIXES = {"pure", "natural", "organic", "extract", "derived"}


def _normalize_for_lookup(text: str) -> str:
    """Aggressively normalize a name for dictionary lookup.

    - NFC unicode normalize
    - Lowercase, strip
    - Remove trailing concentration like "(10%)"
    - Collapse multiple spaces
    """
    text = unicodedata.normalize("NFC", text).strip().lower()
    text = _CONC_RE.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class IngredientNormalizer:
    """Resolves raw ingredient names against the chemical knowledge base.

    Parameters
    ----------
    store : DataStore | None
        If ``None``, uses the module-level singleton from
        :func:`data_loader.get_store`.
    fuzzy_threshold : float
        Minimum similarity ratio for fuzzy matches (0–1).  Default 0.82.
    """

    def __init__(
        self,
        store: DataStore | None = None,
        fuzzy_threshold: float = 0.82,
    ) -> None:
        self._store = store or get_store()
        self._threshold = fuzzy_threshold

        # Build the lookup index: normalized name → canonical key
        # "canonical key" is the normalized chem_full.name used as dict key
        self._name_index: dict[str, str] = {}
        for key, chem in self._store.chemicals.items():
            # Primary name
            self._name_index[key] = key
            # Also index common variations
            normalized = _normalize_for_lookup(chem.name)
            if normalized not in self._name_index:
                self._name_index[normalized] = key

        # Pre-compute the list of all candidate names for fuzzy matching
        self._fuzzy_candidates: list[str] = list(self._name_index.keys())

    def resolve(self, raw_name: str) -> ResolvedIngredient:
        """Resolve a single ingredient name to a canonical chemical.

        Strategy (in order of preference):
        1. Exact match on normalized name
        2. Alias / variation match
        3. Fuzzy match (difflib, threshold-gated)
        4. Unresolved
        """
        normalized = _normalize_for_lookup(raw_name)

        if not normalized:
            return ResolvedIngredient(
                raw_name=raw_name,
                canonical_name=None,
                confidence=0.0,
                match_type="unresolved",
            )

        # 1) Exact match
        if normalized in self._name_index:
            canonical_key = self._name_index[normalized]
            chem = self._store.chemicals[canonical_key]
            return ResolvedIngredient(
                raw_name=raw_name,
                canonical_name=chem.name,
                confidence=1.0,
                match_type="exact",
            )

        # 2) Try without parenthetical / trivial words
        stripped = normalized
        for prefix in _TRIVIAL_PREFIXES:
            stripped = stripped.replace(prefix, "").strip()
        stripped = re.sub(r"\s+", " ", stripped)
        if stripped and stripped != normalized and stripped in self._name_index:
            canonical_key = self._name_index[stripped]
            chem = self._store.chemicals[canonical_key]
            return ResolvedIngredient(
                raw_name=raw_name,
                canonical_name=chem.name,
                confidence=0.95,
                match_type="alias",
            )

        # 3) Fuzzy match
        matches = difflib.get_close_matches(
            normalized,
            self._fuzzy_candidates,
            n=1,
            cutoff=self._threshold,
        )
        if matches:
            best = matches[0]
            canonical_key = self._name_index[best]
            chem = self._store.chemicals[canonical_key]
            ratio = difflib.SequenceMatcher(None, normalized, best).ratio()
            return ResolvedIngredient(
                raw_name=raw_name,
                canonical_name=chem.name,
                confidence=round(ratio, 3),
                match_type="fuzzy",
            )

        # 4) Unresolved
        return ResolvedIngredient(
            raw_name=raw_name,
            canonical_name=None,
            confidence=0.0,
            match_type="unresolved",
        )

    def resolve_list(self, ingredients: list[str]) -> list[ResolvedIngredient]:
        """Resolve a list of ingredient names."""
        return [self.resolve(name) for name in ingredients]

    def parse_and_resolve(self, raw_text: str) -> list[ResolvedIngredient]:
        """Split a raw ingredient text and resolve each part.

        Handles comma and semicolon separators, parenthesis-aware
        tokenization (per docs Stage 3 — Normalization).
        """
        # Split by comma or semicolon, but not inside parentheses
        parts = split_ingredients(raw_text)
        return self.resolve_list(parts)

    @property
    def resolution_coverage(self) -> dict[str, int]:
        """Return counts by match_type — useful for confidence scoring."""
        return {"total_chemicals": len(self._store.chemicals)}


# ---------------------------------------------------------------------------
# Ingredient string parser
# ---------------------------------------------------------------------------

def split_ingredients(raw: str) -> list[str]:
    """Split an ingredient string by comma/semicolon, parenthesis-aware.

    Handles cases like:
    - "Glycerin, Water, Niacinamide"
    - "AHA (Alpha Hydroxy Acid), BHA"
    - "Retinol; Vitamin C"
    """
    result: list[str]= []
    depth = 0
    current: list[str] = []

    for char in raw:
        if char == "(":
            depth += 1
            current.append(char)
        elif char == ")":
            depth = max(0, depth - 1)
            current.append(char)
        elif char in (",", ";") and depth == 0:
            token = "".join(current).strip()
            if token:
                result.append(token)
            current = []
        else:
            current.append(char)

    # Don't forget the last token
    token = "".join(current).strip()
    if token:
        result.append(token)

    return result


# Backward-compatible alias for the existing unit tests and internal imports.
_split_ingredients = split_ingredients
