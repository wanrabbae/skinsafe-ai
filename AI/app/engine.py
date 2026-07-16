"""Core Engine — ingredient analysis, skin compatibility, conflicts, and recommendations.

This module ties together the ``DataStore`` knowledge base and the
``IngredientNormalizer`` to provide four domain engines:

1. **IngredientAnalyzer** — per-ingredient safety/benefit analysis
2. **SkinCompatibilityEngine** — skin-type × ingredient compatibility scoring
3. **RoutineConflictEngine** — detects incompatible ingredient combinations
4. **ProductRecommender** — symptom-aware product recommendation

All engines are stateless functions operating on data from ``DataStore``.
They produce typed results consumed by the scoring and API layers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .data_loader import Chemical, DataStore, Product, get_store
from .normalizer import IngredientNormalizer, ResolvedIngredient

# ---------------------------------------------------------------------------
# Category constants — derived from chem_full.type values
# ---------------------------------------------------------------------------

_EXFOLIANT_KEYWORDS = {
    "exfoliant", "exfoliator", "aha", "bha", "peel", "chemical exfoliant",
    "glycolic acid", "lactic acid", "mandelic acid", "salicylic acid",
    "alpha hydroxy acid", "beta hydroxy acid", "gluconolactone",
}
_RETINOID_KEYWORDS = {
    "retinol", "retinoid", "retinoic", "retinal", "retinyl", "tretinoin", "adapalene",
    "hydroxypinacolone retinoate",
}
_STRONG_ACTIVE_KEYWORDS = _EXFOLIANT_KEYWORDS | _RETINOID_KEYWORDS | {
    "vitamin c", "l-ascorbic", "hydroquinone", "benzoyl peroxide", "azelaic acid",
}
_MOISTURIZER_KEYWORDS = {
    "moisturizer", "emollient", "humectant", "hydrat", "occlusive",
}
_ANTIOXIDANT_KEYWORDS = {
    "antioxidant", "vitamin c", "vitamin e", "coq10", "resveratrol",
}

# Skin type keywords for parsing the `target` field
_SKIN_TYPE_MAP = {
    "dry": ["dry", "dehydrated", "flaky"],
    "oily": ["oily", "excess oil", "sebum", "acne-prone"],
    "sensitive": ["sensitive", "reactive", "irritation-prone", "redness"],
    "combination": ["combination", "combo"],
    "normal": ["normal", "all skin", "all types", "regardless of skin type"],
}


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class IngredientReport:
    """Enriched analysis of a single ingredient."""

    name: str
    resolved: ResolvedIngredient
    chemical: Chemical | None
    risk_level: str  # beneficial | neutral | caution | high_risk | unresolved
    type_category: str
    benefits_summary: str
    relevant_symptoms: list[str] = field(default_factory=list)
    compatibility_notes: str = ""
    caution_notes: str = ""
    usage_frequency: str = ""


@dataclass(slots=True)
class CompatibilityResult:
    """Result of skin compatibility analysis."""

    score: int  # 0–100
    beneficial_ingredients: list[str] = field(default_factory=list)
    caution_ingredients: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ConflictResult:
    """Result of routine conflict detection."""

    score: int  # raw conflict score (0 = no conflicts, higher = worse)
    conflicts: list[ConflictFinding] = field(default_factory=list)


@dataclass(slots=True)
class ConflictFinding:
    """A single detected conflict between ingredients."""

    code: str
    severity: str  # "caution" | "high"
    message: str
    involved_ingredients: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ProductMatch:
    """A recommended product with match details."""

    product: Product
    matching_chemicals: list[str] = field(default_factory=list)
    matching_symptoms: list[str] = field(default_factory=list)
    relevance_score: float = 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _first_sentence(text: str) -> str:
    """Extract the first sentence from a text block."""
    if not text:
        return ""
    # Split on period followed by space or end of string
    match = re.match(r"^(.+?\.)\s", text)
    if match:
        return match.group(1)
    # If no sentence boundary, return first 200 chars
    return text[:200].strip()


def _text_contains_any(text: str, keywords: set[str] | list[str]) -> bool:
    """Check if text contains any of the keywords (case-insensitive)."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def _classify_type(chem_type: str, chem_name: str) -> str:
    """Classify a chemical into a broad category based on its type field."""
    combined = f"{chem_type} {chem_name}".lower()
    if any(kw in combined for kw in _RETINOID_KEYWORDS):
        return "retinoid"
    if any(kw in combined for kw in _EXFOLIANT_KEYWORDS):
        return "exfoliant"
    if any(kw in combined for kw in _ANTIOXIDANT_KEYWORDS):
        return "antioxidant"
    if any(kw in combined for kw in _MOISTURIZER_KEYWORDS):
        return "moisturizer"
    return chem_type.lower() if chem_type else "unknown"


def _skin_type_compatible(target_text: str, user_skin_type: str) -> str:
    """Check if target text mentions the user's skin type.

    Returns: "beneficial", "neutral", or "caution".
    """
    if not target_text or not user_skin_type:
        return "neutral"

    target_lower = target_text.lower()

    user_keywords = _SKIN_TYPE_MAP.get(user_skin_type.lower(), [])
    negative_phrases = ("not recommended", "may want to avoid", "should avoid", "isn't recommended")
    if any(phrase in target_lower for phrase in negative_phrases) and any(
        keyword in target_lower for keyword in user_keywords
    ):
        return "caution"

    # Check if the ingredient is marked as suitable for all skin types
    for kw in _SKIN_TYPE_MAP.get("normal", []):
        if kw in target_lower:
            return "beneficial"

    # Check if user's skin type is mentioned positively
    keywords = user_keywords
    for kw in keywords:
        if kw in target_lower:
            return "beneficial"

    return "neutral"


# ---------------------------------------------------------------------------
# 1. Ingredient Analyzer
# ---------------------------------------------------------------------------


class IngredientAnalyzer:
    """Analyzes individual ingredients against the knowledge base.

    For each ingredient it produces an :class:`IngredientReport` containing
    risk level, benefits, symptoms addressed, and compatibility notes.
    """

    def __init__(self, store: DataStore | None = None) -> None:
        self._store = store or get_store()

    def analyze(
        self,
        resolved: ResolvedIngredient,
        user_skin_type: str = "",
        user_concerns: list[str] | None = None,
    ) -> IngredientReport:
        """Analyze a single resolved ingredient."""
        if resolved.canonical_name is None:
            return IngredientReport(
                name=resolved.raw_name,
                resolved=resolved,
                chemical=None,
                risk_level="unresolved",
                type_category="unknown",
                benefits_summary="",
            )

        chem = self._store.get_chemical(resolved.canonical_name)
        if chem is None:
            return IngredientReport(
                name=resolved.raw_name,
                resolved=resolved,
                chemical=None,
                risk_level="unresolved",
                type_category="unknown",
                benefits_summary="",
            )

        # Determine risk level
        risk_level = self._assess_risk(chem, user_skin_type, user_concerns or [])

        # Find relevant symptoms
        symptoms = list(chem.symptoms)

        # Type classification
        type_cat = _classify_type(chem.type, chem.name)

        return IngredientReport(
            name=resolved.raw_name,
            resolved=resolved,
            chemical=chem,
            risk_level=risk_level,
            type_category=type_cat,
            benefits_summary=_first_sentence(chem.benefits),
            relevant_symptoms=symptoms,
            compatibility_notes=_first_sentence(chem.compatible),
            caution_notes=_first_sentence(chem.incompatible),
            usage_frequency=_first_sentence(chem.frequency),
        )

    def analyze_list(
        self,
        resolved_list: list[ResolvedIngredient],
        user_skin_type: str = "",
        user_concerns: list[str] | None = None,
    ) -> list[IngredientReport]:
        """Analyze a list of resolved ingredients."""
        return [
            self.analyze(r, user_skin_type, user_concerns)
            for r in resolved_list
        ]

    def _assess_risk(
        self,
        chem: Chemical,
        user_skin_type: str,
        user_concerns: list[str],
    ) -> str:
        """Assess risk level for a chemical given the user's profile."""
        name_lower = chem.name.lower()
        type_lower = chem.type.lower()
        incompatible_lower = chem.incompatible.lower()

        # High risk: ingredients that are widely cautioned
        if any(kw in name_lower for kw in ("hydroquinone", "mercury", "merkuri")):
            return "high_risk"

        # Caution: strong actives for sensitive skin
        is_strong = any(kw in f"{name_lower} {type_lower}" for kw in _STRONG_ACTIVE_KEYWORDS)
        if is_strong and user_skin_type.lower() in ("sensitive",):
            return "caution"

        # Check if target text suggests this is NOT for user's skin type
        target_compat = _skin_type_compatible(chem.target, user_skin_type)
        if target_compat == "caution":
            return "caution"

        # Check concerns overlap — beneficial if the chemical addresses user concerns
        if user_concerns:
            chem_symptoms = set(chem.symptoms)
            concern_match = any(
                concern.lower().replace("-", " ").replace("_", " ") in chem_symptoms
                for concern in user_concerns
            )
            if concern_match:
                return "beneficial"

        # Check if broadly beneficial based on target text
        if target_compat == "beneficial":
            return "beneficial"

        # Default
        return "neutral"


# ---------------------------------------------------------------------------
# 2. Skin Compatibility Engine
# ---------------------------------------------------------------------------


class SkinCompatibilityEngine:
    """Evaluates how compatible a set of ingredients is with a user's skin profile."""

    def evaluate(
        self,
        reports: list[IngredientReport],
        skin_type: str,
        sensitivity_level: str = "medium",
        conditions: list[str] | None = None,
    ) -> CompatibilityResult:
        """Compute a skin compatibility score (0–100) for the ingredient set."""
        if not reports:
            return CompatibilityResult(score=85)

        score = 85  # baseline
        beneficial: list[str] = []
        caution: list[str] = []
        notes: list[str] = []

        resolved_count = 0
        for report in reports:
            if report.chemical is None:
                continue
            resolved_count += 1

            chem = report.chemical
            compat = _skin_type_compatible(chem.target, skin_type)

            if compat == "beneficial":
                beneficial.append(report.name)
                score += 2  # small boost per beneficial ingredient

            if report.risk_level == "caution":
                caution.append(report.name)
                score -= 8
                notes.append(
                    f"{report.name}: perlu perhatian khusus untuk kulit {skin_type}."
                )
            elif report.risk_level == "high_risk":
                caution.append(report.name)
                score -= 20
                notes.append(
                    f"{report.name}: bahan berisiko tinggi, disarankan menghindari."
                )

        # Sensitivity modifier
        if sensitivity_level == "high":
            strong_count = sum(
                1 for r in reports
                if r.type_category in ("exfoliant", "retinoid") and r.chemical
            )
            if strong_count > 0:
                penalty = strong_count * 10
                score -= penalty
                notes.append(
                    f"Kulit sensitif tinggi: {strong_count} active ingredient kuat terdeteksi."
                )

        # Damaged barrier modifier
        if conditions and "damaged_barrier" in conditions:
            strong_actives = [
                r.name for r in reports
                if r.type_category in ("exfoliant", "retinoid") and r.chemical
            ]
            if strong_actives:
                score -= 15
                notes.append(
                    f"Skin barrier terganggu: hindari {', '.join(strong_actives)} sampai pulih."
                )

        return CompatibilityResult(
            score=max(0, min(100, score)),
            beneficial_ingredients=beneficial,
            caution_ingredients=caution,
            notes=notes,
        )


# ---------------------------------------------------------------------------
# 3. Routine Conflict Engine
# ---------------------------------------------------------------------------


class RoutineConflictEngine:
    """Detects conflicts between ingredients in the analyzed product and the user's routine.

    MVP conflict codes (from docs):
    - ``retinoid_exfoliant_frequency``
    - ``multiple_exfoliants``
    - ``strong_active_no_spf``
    - ``damaged_barrier_strong_active``
    - ``duplicate_active_load``
    """

    def detect(
        self,
        reports: list[IngredientReport],
        routine_ingredients: list[str] | None = None,
        conditions: list[str] | None = None,
    ) -> ConflictResult:
        """Detect conflicts and return a conflict score + findings."""
        conflicts: list[ConflictFinding] = []

        # Categorize resolved ingredients
        retinoids: list[str] = []
        exfoliants: list[str] = []
        strong_actives: list[str] = []

        for report in reports:
            normalized_name = report.name.lower().replace("_", " ").replace("-", " ")
            inferred_retinoid = any(keyword in normalized_name for keyword in _RETINOID_KEYWORDS)
            inferred_exfoliant = any(keyword in normalized_name for keyword in _EXFOLIANT_KEYWORDS)
            if report.type_category == "retinoid" or inferred_retinoid:
                retinoids.append(report.name)
                strong_actives.append(report.name)
            elif report.type_category == "exfoliant" or inferred_exfoliant:
                exfoliants.append(report.name)
                strong_actives.append(report.name)

            # Also check the incompatible field for cross-references
            if report.chemical and report.chemical.incompatible:
                incompat_lower = report.chemical.incompatible.lower()
                for other in reports:
                    if other is report or other.chemical is None:
                        continue
                    if other.chemical.name.lower() in incompat_lower:
                        conflicts.append(ConflictFinding(
                            code="INCOMPATIBLE_COMBINATION",
                            severity="caution",
                            message=(
                                f"{report.name} tidak disarankan digunakan bersamaan "
                                f"dengan {other.name}. {_first_sentence(report.chemical.incompatible)}"
                            ),
                            involved_ingredients=[report.name, other.name],
                        ))

        # MVP conflict: retinoid + exfoliant
        if retinoids and exfoliants:
            conflicts.append(ConflictFinding(
                code="RETINOID_EXFOLIANT_FREQUENCY",
                severity="high",
                message=(
                    f"Retinoid ({', '.join(retinoids)}) dan exfoliant ({', '.join(exfoliants)}) "
                    f"sebaiknya tidak digunakan bersamaan untuk menghindari iritasi berlebih."
                ),
                involved_ingredients=retinoids + exfoliants,
            ))

        # MVP conflict: multiple exfoliants
        if len(exfoliants) > 1:
            conflicts.append(ConflictFinding(
                code="MULTIPLE_EXFOLIANTS",
                severity="caution",
                message=(
                    f"Beberapa exfoliant terdeteksi ({', '.join(exfoliants)}). "
                    f"Penggunaan bersamaan dapat menyebabkan iritasi."
                ),
                involved_ingredients=exfoliants,
            ))

        # MVP conflict: damaged barrier + strong active
        if conditions and "damaged_barrier" in conditions and strong_actives:
            conflicts.append(ConflictFinding(
                code="DAMAGED_BARRIER_STRONG_ACTIVE",
                severity="high",
                message=(
                    f"Skin barrier terganggu — hindari active ingredients kuat "
                    f"({', '.join(strong_actives)}) sampai barrier pulih."
                ),
                involved_ingredients=strong_actives,
            ))

        # Check against current routine
        if routine_ingredients:
            routine_set = {
                r.lower().replace("_", " ").replace("-", " ").strip()
                for r in routine_ingredients
            }
            product_actives = {r.name.lower() for r in reports if r.type_category in ("retinoid", "exfoliant") and r.chemical}

            # Duplicate active load
            overlap = product_actives & routine_set
            if overlap:
                conflicts.append(ConflictFinding(
                    code="DUPLICATE_ACTIVE_LOAD",
                    severity="caution",
                    message=(
                        f"Active ingredient ({', '.join(overlap)}) sudah ada dalam rutinitas Anda. "
                        f"Penggunaan ganda dapat meningkatkan risiko iritasi."
                    ),
                    involved_ingredients=list(overlap),
                ))

            routine_retinoids = [
                name for name in routine_set
                if any(keyword in name for keyword in _RETINOID_KEYWORDS)
            ]
            routine_exfoliants = [
                name for name in routine_set
                if any(keyword in name for keyword in _EXFOLIANT_KEYWORDS)
            ]
            if (retinoids and routine_exfoliants) or (exfoliants and routine_retinoids):
                involved = retinoids + exfoliants + routine_retinoids + routine_exfoliants
                conflicts.append(ConflictFinding(
                    code="ROUTINE_RETINOID_EXFOLIANT",
                    severity="high",
                    message=(
                        "Produk dan rutinitas saat ini berpotensi menumpuk retinoid dengan exfoliant. "
                        "Pertimbangkan penggunaan pada waktu berbeda dan mulai secara perlahan."
                    ),
                    involved_ingredients=involved,
                ))

        # Deduplicate conflicts by code + involved ingredients
        seen_keys: set[str] = set()
        unique_conflicts: list[ConflictFinding] = []
        for conflict in conflicts:
            key = f"{conflict.code}:{'|'.join(sorted(conflict.involved_ingredients))}"
            if key not in seen_keys:
                seen_keys.add(key)
                unique_conflicts.append(conflict)

        # Compute raw conflict score
        score = 0
        for c in unique_conflicts:
            score += 30 if c.severity == "high" else 15

        return ConflictResult(
            score=min(100, score),
            conflicts=unique_conflicts,
        )


# ---------------------------------------------------------------------------
# 4. Product Recommender
# ---------------------------------------------------------------------------


class ProductRecommender:
    """Recommends products from the catalog based on symptoms, skin type, and budget.

    Pipeline:
    1. Map user concerns/symptoms → beneficial chemicals (via symptom index)
    2. Map those chemicals → products (via junction tables)
    3. Filter by budget
    4. Score and rank by number of matching chemicals + popularity
    5. Return top-N
    """

    def __init__(self, store: DataStore | None = None) -> None:
        self._store = store or get_store()

    def recommend(
        self,
        concerns: list[str],
        skin_type: str = "",
        budget_max: float | None = None,
        limit: int = 10,
    ) -> list[ProductMatch]:
        """Find and rank product recommendations."""
        if not concerns:
            return []

        # Step 1: Gather beneficial chemicals for user concerns
        targeted_chems: dict[str, list[str]] = {}  # chem_key → list of matching symptoms
        for concern in concerns:
            concern_norm = concern.lower().replace("-", " ").replace("_", " ")
            chem_keys = self._store.chemicals_for_symptom(concern_norm)
            for ck in chem_keys:
                targeted_chems.setdefault(ck, [])
                if concern_norm not in targeted_chems[ck]:
                    targeted_chems[ck].append(concern_norm)

        if not targeted_chems:
            return []

        # Step 2: Find products containing those chemicals
        product_scores: dict[str, ProductMatch] = {}

        for chem_key, symptoms in targeted_chems.items():
            chem = self._store.chemicals.get(chem_key)
            chem_display = chem.name if chem else chem_key

            prod_keys = self._store.products_for_chemical(chem_key)
            for pk in prod_keys:
                product = self._store.products.get(pk)
                if product is None:
                    continue

                # Budget filter
                if budget_max is not None and product.price > budget_max:
                    continue

                if pk not in product_scores:
                    product_scores[pk] = ProductMatch(product=product)

                pm = product_scores[pk]
                if chem_display not in pm.matching_chemicals:
                    pm.matching_chemicals.append(chem_display)
                for s in symptoms:
                    if s not in pm.matching_symptoms:
                        pm.matching_symptoms.append(s)

        # Step 3: Score each product
        for pm in product_scores.values():
            # Relevance = number of matching chemicals × 10 + popularity bonus
            chem_score = len(pm.matching_chemicals) * 10
            # Normalize loves to 0–5 bonus (max loves ~356000)
            popularity_bonus = min(5.0, (pm.product.loves / 100000) * 2)
            # Skin type bonus: +5 if product targets user's skin type
            skin_bonus = 0.0
            if skin_type:
                skin_lower = skin_type.lower()
                for chem_name in pm.matching_chemicals:
                    chem_obj = self._store.get_chemical(chem_name)
                    if chem_obj and _skin_type_compatible(chem_obj.target, skin_lower) == "beneficial":
                        skin_bonus = 5.0
                        break

            pm.relevance_score = round(chem_score + popularity_bonus + skin_bonus, 2)

        # Step 4: Sort and limit
        ranked = sorted(
            product_scores.values(),
            key=lambda pm: pm.relevance_score,
            reverse=True,
        )

        return ranked[:limit]
