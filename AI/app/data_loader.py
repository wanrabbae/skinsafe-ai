"""Unified data layer — loads all 6 CSV files and builds relational indexes.

This module is the foundation of the Core Engine. It reads the chemical
knowledge base, product catalogs, junction tables, and symptom mappings
into memory at startup and exposes them through a single ``DataStore``
facade.

Design decisions:
- Thread-safe singleton via module-level ``get_store()``.
- All lookups are normalized (lowercased, stripped) for fuzzy-friendly
  matching downstream.
- Data quality issues (empty names, duplicates, inconsistent symptom
  labels) are handled during loading so consumers never see dirty data.
- No external dependencies — only Python stdlib ``csv`` and
  ``dataclasses``.
"""

from __future__ import annotations

import csv
import threading
import unicodedata
from dataclasses import dataclass
from pathlib import Path

# ---------------------------------------------------------------------------
# Data directory — resolved relative to *this* file so it works regardless
# of the working directory the process was started from.
# ---------------------------------------------------------------------------
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# ---------------------------------------------------------------------------
# Domain dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Chemical:
    """A single record from ``chem_full.csv`` enriched with symptom links."""

    name: str
    type: str
    benefits: str
    target: str
    frequency: str
    compatible: str
    incompatible: str
    symptoms: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class Product:
    """Unified product record — works for both The Ordinary and Sephora."""

    name: str
    brand: str
    price: float
    link: str
    ingredients_raw: str
    source: str  # "ordinary" | "sephora"
    loves: float = 0.0
    chemical_names: tuple[str, ...] = ()


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------


def _norm(text: str) -> str:
    """Lowercase, strip, NFC-normalize a string for index keys."""
    return unicodedata.normalize("NFC", text).strip().lower()


def _norm_symptom(symptom: str) -> str:
    """Normalize symptom labels — collapse hyphens, strip, lower."""
    return _norm(symptom).replace("-", " ").replace("_", " ")


def _safe_float(value: str, default: float = 0.0) -> float:
    """Parse a float from CSV, returning *default* on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------------------
# CSV readers
# ---------------------------------------------------------------------------


def _read_csv(filename: str) -> list[dict[str, str]]:
    """Read a CSV from the data directory into a list of dicts."""
    path = _DATA_DIR / filename
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        return list(reader)


# ---------------------------------------------------------------------------
# DataStore — the unified facade
# ---------------------------------------------------------------------------


class DataStore:
    """In-memory relational index across all six CSV datasets.

    Public attributes (all ``dict`` values keyed by *normalized* names):

    ``chemicals``
        Canonical chemical name → :class:`Chemical`.
    ``products``
        Product name → :class:`Product`.
    ``symptom_to_chems``
        Symptom label → list of chemical names that address it.
    ``chem_to_symptoms``
        Chemical name → list of symptom labels it addresses.
    ``chem_to_products``
        Chemical name → list of product names containing it.
    ``product_to_chems``
        Product name → list of chemical names found in it.
    ``all_symptoms``
        Sorted list of unique symptom labels.
    ``chemical_name_set``
        ``frozenset`` of all normalized chemical names (for fast membership
        tests in the normalizer).
    """

    def __init__(self) -> None:
        # Primary stores
        self.chemicals: dict[str, Chemical] = {}
        self.products: dict[str, Product] = {}

        # Bidirectional symptom ↔ chemical maps
        self.symptom_to_chems: dict[str, list[str]] = {}
        self.chem_to_symptoms: dict[str, list[str]] = {}

        # Bidirectional chemical ↔ product maps
        self.chem_to_products: dict[str, list[str]] = {}
        self.product_to_chems: dict[str, list[str]] = {}

        # Convenience
        self.all_symptoms: list[str] = []
        self.chemical_name_set: frozenset[str] = frozenset()

        # Run the load pipeline
        self._load()

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def get_chemical(self, name: str) -> Chemical | None:
        """Lookup a chemical by normalized name."""
        return self.chemicals.get(_norm(name))

    def get_product(self, name: str) -> Product | None:
        """Lookup a product by normalized name."""
        return self.products.get(_norm(name))

    def chemicals_for_symptom(self, symptom: str) -> list[str]:
        """Return chemical names that address the given symptom."""
        return self.symptom_to_chems.get(_norm_symptom(symptom), [])

    def products_for_chemical(self, chem_name: str) -> list[str]:
        """Return product names containing the given chemical."""
        return self.chem_to_products.get(_norm(chem_name), [])

    def chemicals_for_product(self, prod_name: str) -> list[str]:
        """Return chemical names found in the given product."""
        return self.product_to_chems.get(_norm(prod_name), [])

    def symptoms_for_chemical(self, chem_name: str) -> list[str]:
        """Return symptoms addressed by the given chemical."""
        return self.chem_to_symptoms.get(_norm(chem_name), [])

    # ------------------------------------------------------------------
    # Internal loading pipeline
    # ------------------------------------------------------------------

    def _load(self) -> None:
        self._load_chemicals()
        self._load_symptoms()
        self._load_ordinary_products()
        self._load_sephora_products()
        self._load_junction_ordinary()
        self._load_junction_sephora()
        self._attach_chemicals_to_products()
        self._finalize()

    def _load_chemicals(self) -> None:
        """Load ``chem_full.csv`` — skip empty names, deduplicate."""
        seen: set[str] = set()
        for row in _read_csv("chem_full.csv"):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            key = _norm(name)
            if key in seen:
                continue
            seen.add(key)
            self.chemicals[key] = Chemical(
                name=name,
                type=(row.get("type") or "").strip(),
                benefits=(row.get("benefits") or "").strip(),
                target=(row.get("target") or "").strip(),
                frequency=(row.get("frequency") or "").strip(),
                compatible=(row.get("compatible") or "").strip(),
                incompatible=(row.get("incompatible") or "").strip(),
            )
        self.chemical_name_set = frozenset(self.chemicals.keys())

    def _load_symptoms(self) -> None:
        """Load ``symp_to_chem_names.csv`` — build bidirectional maps."""
        for row in _read_csv("symp_to_chem_names.csv"):
            chem = (row.get("chem_name") or "").strip()
            symptom_raw = (row.get("chem_symptoms") or "").strip()
            if not chem or not symptom_raw:
                continue
            chem_key = _norm(chem)
            symptom_key = _norm_symptom(symptom_raw)

            # symptom → chemicals
            self.symptom_to_chems.setdefault(symptom_key, [])
            if chem_key not in self.symptom_to_chems[symptom_key]:
                self.symptom_to_chems[symptom_key].append(chem_key)

            # chemical → symptoms
            self.chem_to_symptoms.setdefault(chem_key, [])
            if symptom_key not in self.chem_to_symptoms[chem_key]:
                self.chem_to_symptoms[chem_key].append(symptom_key)

        # Attach symptoms to Chemical objects
        enriched: dict[str, Chemical] = {}
        for key, chem in self.chemicals.items():
            symptoms = tuple(self.chem_to_symptoms.get(key, []))
            enriched[key] = Chemical(
                name=chem.name,
                type=chem.type,
                benefits=chem.benefits,
                target=chem.target,
                frequency=chem.frequency,
                compatible=chem.compatible,
                incompatible=chem.incompatible,
                symptoms=symptoms,
            )
        self.chemicals = enriched

    def _load_ordinary_products(self) -> None:
        """Load ``prod_ordinary_full.csv``."""
        seen: set[str] = set()
        for row in _read_csv("prod_ordinary_full.csv"):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            key = _norm(name)
            if key in seen:
                continue
            seen.add(key)
            self.products[key] = Product(
                name=name,
                brand="The Ordinary",
                price=_safe_float(row.get("price", "")),
                link=(row.get("link") or "").strip(),
                ingredients_raw=(row.get("ingredients") or "").strip(),
                source="ordinary",
            )

    def _load_sephora_products(self) -> None:
        """Load ``prod_sephora_full.csv``."""
        seen: set[str] = set()
        for row in _read_csv("prod_sephora_full.csv"):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            key = _norm(name)
            if key in seen:
                continue
            seen.add(key)
            self.products[key] = Product(
                name=name,
                brand=(row.get("brand") or "").strip(),
                price=_safe_float(row.get("price", "")),
                link=(row.get("link") or "").strip(),
                ingredients_raw=(row.get("ingredients") or "").strip(),
                source="sephora",
                loves=_safe_float(row.get("loves", "")),
            )

    def _load_junction_ordinary(self) -> None:
        """Load ``chem_to_prod.csv`` — Chemical ↔ The Ordinary products."""
        for row in _read_csv("chem_to_prod.csv"):
            chem = _norm((row.get("chem_name") or "").strip())
            prod = _norm((row.get("prod_name") or "").strip())
            if not chem or not prod:
                continue
            self.chem_to_products.setdefault(chem, [])
            if prod not in self.chem_to_products[chem]:
                self.chem_to_products[chem].append(prod)
            self.product_to_chems.setdefault(prod, [])
            if chem not in self.product_to_chems[prod]:
                self.product_to_chems[prod].append(chem)

    def _load_junction_sephora(self) -> None:
        """Load ``chem_to_sephora_prod.csv`` — Chemical ↔ Sephora products."""
        for row in _read_csv("chem_to_sephora_prod.csv"):
            chem = _norm((row.get("chem_name") or "").strip())
            prod = _norm((row.get("prod_name") or "").strip())
            if not chem or not prod:
                continue
            self.chem_to_products.setdefault(chem, [])
            if prod not in self.chem_to_products[chem]:
                self.chem_to_products[chem].append(prod)
            self.product_to_chems.setdefault(prod, [])
            if chem not in self.product_to_chems[prod]:
                self.product_to_chems[prod].append(chem)

    def _attach_chemicals_to_products(self) -> None:
        """Rebuild Product objects with their ``chemical_names`` populated."""
        updated: dict[str, Product] = {}
        for key, prod in self.products.items():
            chems = tuple(self.product_to_chems.get(key, []))
            updated[key] = Product(
                name=prod.name,
                brand=prod.brand,
                price=prod.price,
                link=prod.link,
                ingredients_raw=prod.ingredients_raw,
                source=prod.source,
                loves=prod.loves,
                chemical_names=chems,
            )
        self.products = updated

    def _finalize(self) -> None:
        """Build convenience indexes after all data is loaded."""
        self.all_symptoms = sorted(self.symptom_to_chems.keys())


# ---------------------------------------------------------------------------
# Module-level singleton (thread-safe, lazy)
# ---------------------------------------------------------------------------

_store: DataStore | None = None
_lock = threading.Lock()


def get_store() -> DataStore:
    """Return the singleton :class:`DataStore`, creating it on first call."""
    global _store  # noqa: PLW0603
    if _store is None:
        with _lock:
            if _store is None:
                _store = DataStore()
    return _store
