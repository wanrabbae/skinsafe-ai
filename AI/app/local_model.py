"""Local, explainable recommendation inference for SkinSafe AI."""

from __future__ import annotations

import json
import math
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .data_loader import DataStore, get_store
from .ml_features import (
    canonicalize_concerns,
    concerns_from_functions,
    concerns_from_product_name,
    normalize_ingredient_name,
    predict_probability,
    product_features,
)


_AI_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_MODEL_PATH = _AI_ROOT / "models" / "recommender-v1.json"
_DEFAULT_CATALOG_PATH = _AI_ROOT / "data" / "local_product_catalog.json"
_SCORING_VERSION = "overall-compatibility-2026.07.2"
_MAX_OVERALL_SCORE = 0.95

_PROHIBITED_TERMS = {
    "mercury",
    "merkuri",
    "mercuric chloride",
    "ammoniated mercury",
    "hydroquinone",
}
_PREGNANCY_AVOID_TERMS = {
    "retinol",
    "retinal",
    "retinaldehyde",
    "retinoic acid",
    "tretinoin",
    "adapalene",
    "isotretinoin",
    "retinyl",
    "hydroxypinacolone retinoate",
    "hydroquinone",
}
_RETINOID_TERMS = {
    "retinol",
    "retinal",
    "retinaldehyde",
    "retinoic acid",
    "tretinoin",
    "adapalene",
    "retinyl palmitate",
    "retinyl",
    "hydroxypinacolone retinoate",
}
_EXFOLIANT_TERMS = {
    "glycolic acid",
    "lactic acid",
    "mandelic acid",
    "salicylic acid",
    "alpha hydroxy acid",
    "beta hydroxy acid",
    "gluconolactone",
}
_FRAGRANCE_TERMS = {"fragrance", "parfum", "perfume", "essential oil"}


@dataclass(slots=True)
class LocalRecommendation:
    product: dict[str, Any]
    model_score: float
    relevance_score: float
    confidence: str
    matched_ingredients: list[str] = field(default_factory=list)
    matching_concerns: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    cautions: list[str] = field(default_factory=list)
    score_breakdown: dict[str, float] = field(default_factory=dict)


@dataclass(slots=True)
class LocalRecommendationResult:
    products: list[LocalRecommendation]
    supported_concerns: list[str]
    unsupported_concerns: list[str]
    model_version: str
    scoring_version: str
    limitations: list[str]


def _number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _contains_term(name: str, terms: set[str]) -> bool:
    return any(name == term or term in name for term in terms)


def _ingredient_names(product: dict[str, Any]) -> list[str]:
    return [
        normalize_ingredient_name(str(ingredient.get("name") or ""))
        for ingredient in product.get("ingredients") or []
        if ingredient.get("name")
    ]


def _has_function(product: dict[str, Any], phrase: str) -> bool:
    for ingredient in product.get("ingredients") or []:
        for function in ingredient.get("functions") or []:
            if phrase in normalize_ingredient_name(str(function)):
                return True
    return False


def _overall_score(
    *,
    model_score: float,
    evidence_coverage: float,
    evidence_strength: float,
    has_explicit_intent: bool,
    intent_penalty: float,
    safety_penalty: float,
) -> tuple[float, dict[str, float]]:
    """Combine relevance evidence and safety without implying certainty."""
    contributions = {
        "modelRelevance": model_score * 0.65,
        "concernCoverage": evidence_coverage * 0.15,
        "ingredientEvidence": evidence_strength * 0.10,
        "explicitProductIntent": 0.05 if has_explicit_intent else 0.0,
    }
    score = min(
        _MAX_OVERALL_SCORE,
        max(0.0, sum(contributions.values()) - intent_penalty - safety_penalty),
    )
    breakdown = {
        key: round(value * 100, 2)
        for key, value in contributions.items()
    }
    breakdown["safetyPenalty"] = round(safety_penalty * 100, 2)
    breakdown["intentMismatchPenalty"] = round(intent_penalty * 100, 2)
    breakdown["uncertaintyReserve"] = round((1.0 - _MAX_OVERALL_SCORE) * 100, 2)
    return score, breakdown


class LocalProductRanker:
    """Loads a trained JSON artifact and ranks the local product catalog."""

    def __init__(
        self,
        model_path: Path = _DEFAULT_MODEL_PATH,
        catalog_path: Path = _DEFAULT_CATALOG_PATH,
        store: DataStore | None = None,
    ) -> None:
        self._store = store or get_store()
        self._model = json.loads(model_path.read_text(encoding="utf-8"))
        self._catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        if self._model.get("schemaVersion") != 1 or self._catalog.get("schemaVersion") != 1:
            raise ValueError("Unsupported local recommendation artifact schema")
        if not self._model.get("concerns") or not self._catalog.get("products"):
            raise ValueError("Local recommendation artifacts are empty")
        if self._model.get("trainedAt") != self._catalog.get("generatedAt"):
            raise ValueError("Model and catalog artifacts were not generated together")
        if self._model.get("expectedCatalogFingerprint") != self._catalog.get("catalogFingerprint"):
            raise ValueError("Model and catalog fingerprints do not match")

        self.model_version = str(self._model["modelVersion"])
        self.scoring_version = _SCORING_VERSION
        self.catalog_version = str(self._catalog["catalogVersion"])
        self.limitations = list(self._model.get("limitations") or []) + list(self._catalog.get("limitations") or [])
        self._dimension = int(self._model["featureDimension"])
        if any(
            len(concern_model.get("weights") or []) != self._dimension
            for concern_model in self._model["concerns"].values()
        ):
            raise ValueError("Local model weight dimensions are invalid")
        self._chemical_symptoms = {
            key: set(self._store.symptoms_for_chemical(key))
            for key in self._store.chemicals
        }

    @property
    def product_count(self) -> int:
        return len(self._catalog["products"])

    def _probabilities(self, product: dict[str, Any], concerns: list[str]) -> dict[str, float]:
        features = product_features(product, self._dimension)
        probabilities: dict[str, float] = {}
        for concern in concerns:
            model = self._model["concerns"].get(concern)
            if not model:
                continue
            probabilities[concern] = predict_probability(
                model["weights"],
                float(model["bias"]),
                features,
            )
        return probabilities

    def _evidence(
        self,
        product: dict[str, Any],
        concerns: list[str],
    ) -> tuple[list[str], list[str], float]:
        matched_ingredients: list[str] = []
        matched_concerns: list[str] = []
        evidence_weights: list[float] = []
        for position, ingredient in enumerate(product.get("ingredients") or []):
            name = str(ingredient.get("name") or "").strip()
            normalized_name = normalize_ingredient_name(name)
            ingredient_concerns = set(self._chemical_symptoms.get(normalized_name, set()))
            ingredient_concerns.update(concerns_from_functions(ingredient.get("functions") or []))
            overlap = [concern for concern in concerns if concern in ingredient_concerns]
            if overlap:
                if name and name not in matched_ingredients:
                    matched_ingredients.append(name)
                    evidence_weights.append(1.0 / math.log2(position + 2))
                for concern in overlap:
                    if concern not in matched_concerns:
                        matched_concerns.append(concern)
        ideal_weight = sum(1.0 / math.log2(position + 2) for position in range(5))
        evidence_strength = min(1.0, sum(evidence_weights[:5]) / ideal_weight)
        return matched_ingredients[:5], matched_concerns, evidence_strength

    def _safety_adjustment(
        self,
        product: dict[str, Any],
        *,
        concerns: list[str],
        skin_type: str,
        sensitivity_level: str,
        conditions: list[str],
        pregnancy_status: str,
        current_ingredients: list[str],
        avoid_ingredients: list[str],
    ) -> tuple[float, list[str], bool]:
        names = _ingredient_names(product)
        cautions: list[str] = []
        penalty = 0.0

        avoid_terms = {normalize_ingredient_name(item) for item in avoid_ingredients if item.strip()}
        if "fragrance" in avoid_terms:
            avoid_terms.update(_FRAGRANCE_TERMS)
        avoids_fragrance = "fragrance" in avoid_terms
        if avoid_terms and (
            any(_contains_term(name, avoid_terms) for name in names)
            or (avoids_fragrance and _has_function(product, "perfuming"))
        ):
            return 1.0, ["Kandidat dikeluarkan oleh avoid list personal user."], True

        prohibited = [name for name in names if _contains_term(name, _PROHIBITED_TERMS)]
        if prohibited:
            return 1.0, ["Kandidat dikeluarkan karena bahan pada prohibited safety list."], True

        pregnancy_avoid = [name for name in names if _contains_term(name, _PREGNANCY_AVOID_TERMS)]
        if pregnancy_status in {"pregnant", "breastfeeding"} and pregnancy_avoid:
            return 1.0, ["Kandidat dikeluarkan oleh pregnancy safety gate."], True

        retinoid = any(_contains_term(name, _RETINOID_TERMS) for name in names)
        exfoliant = any(_contains_term(name, _EXFOLIANT_TERMS) for name in names) or _has_function(product, "exfoliant")
        fragrance = any(_contains_term(name, _FRAGRANCE_TERMS) for name in names) or _has_function(product, "perfuming")

        irritancy_values = [
            value
            for ingredient in product.get("ingredients") or []
            if (value := _number(ingredient.get("irritancy"))) is not None
        ]
        comedogenicity_values = [
            value
            for ingredient in product.get("ingredients") or []
            if (value := _number(ingredient.get("comedogenicity"))) is not None
        ]
        icky_count = sum(
            normalize_ingredient_name(str(ingredient.get("rating") or "")) == "icky"
            for ingredient in product.get("ingredients") or []
        )

        if sensitivity_level == "high" or skin_type == "sensitive":
            if fragrance:
                penalty += 0.14
                cautions.append("Mengandung fragrance/perfuming; lakukan patch test pada kulit sensitif.")
            if retinoid or exfoliant:
                penalty += 0.18
                cautions.append("Mengandung active kuat; mulai perlahan dan jangan menumpuk active serupa.")
            if irritancy_values and max(irritancy_values) >= 3:
                penalty += 0.12
                cautions.append("Ada ingredient dengan skor irritancy tinggi pada dataset sumber.")

        if "damaged_barrier" in conditions and (retinoid or exfoliant):
            penalty += 0.35
            cautions.append("Tidak diprioritaskan saat skin barrier sedang terganggu.")

        dry_skin_goal = any(concern in concerns for concern in {"dryness", "hydrating"})
        if dry_skin_goal and (retinoid or exfoliant):
            penalty += 0.08
            cautions.append("Active kuat tidak diprioritaskan saat kebutuhan utama adalah mengatasi kulit kering.")

        if (skin_type == "oily" or "acne" in concerns) and comedogenicity_values:
            high_comedogenic = sum(value >= 3 for value in comedogenicity_values)
            if high_comedogenic:
                penalty += min(0.18, high_comedogenic * 0.04)
                cautions.append("Beberapa ingredient memiliki potensi comedogenic; respons tiap orang dapat berbeda.")

        if icky_count:
            penalty += min(0.12, icky_count * 0.015)

        current_names = [normalize_ingredient_name(item) for item in current_ingredients]
        current_retinoid = any(_contains_term(name, _RETINOID_TERMS) for name in current_names)
        current_exfoliant = any(_contains_term(name, _EXFOLIANT_TERMS) for name in current_names)
        if (retinoid and current_exfoliant) or (exfoliant and current_retinoid):
            penalty += 0.28
            cautions.append("Berpotensi menumpuk retinoid dan exfoliant dengan rutinitas saat ini.")

        return min(0.9, penalty), cautions, False

    def recommend(
        self,
        *,
        concerns: list[str],
        skin_type: str,
        sensitivity_level: str = "medium",
        conditions: list[str] | None = None,
        pregnancy_status: str = "none",
        current_ingredients: list[str] | None = None,
        avoid_ingredients: list[str] | None = None,
        excluded_products: list[str] | None = None,
        budget_max: float | None = None,
        limit: int = 10,
    ) -> LocalRecommendationResult:
        supported, unsupported = canonicalize_concerns(concerns)
        if not supported:
            return LocalRecommendationResult(
                products=[],
                supported_concerns=[],
                unsupported_concerns=unsupported,
                model_version=self.model_version,
                scoring_version=self.scoring_version,
                limitations=self.limitations,
            )

        excluded_identities = {item.strip().casefold() for item in excluded_products or [] if item.strip()}
        candidates: list[LocalRecommendation] = []
        for product in self._catalog["products"]:
            identity = f"{product.get('brand') or ''}::{product.get('name') or ''}".casefold()
            if identity in excluded_identities:
                continue
            price = _number(product.get("price"))
            if budget_max is not None and (price is None or price > budget_max):
                continue

            probabilities = self._probabilities(product, supported)
            if not probabilities:
                continue
            thresholds = {
                concern: float(self._model["concerns"][concern]["threshold"])
                for concern in probabilities
            }
            if not any(probabilities[concern] >= thresholds[concern] for concern in probabilities):
                continue

            model_score = sum(probabilities.values()) / len(probabilities)
            matched_ingredients, matching_concerns, evidence_strength = self._evidence(product, supported)
            if not matching_concerns:
                # A probability without traceable ingredient/function evidence is
                # not enough for a consumer-health recommendation.
                continue

            penalty, cautions, excluded = self._safety_adjustment(
                product,
                concerns=supported,
                skin_type=skin_type,
                sensitivity_level=sensitivity_level,
                conditions=conditions or [],
                pregnancy_status=pregnancy_status,
                current_ingredients=current_ingredients or [],
                avoid_ingredients=avoid_ingredients or [],
            )
            if excluded:
                continue

            evidence_coverage = len(matching_concerns) / len(supported)
            product_intents = concerns_from_product_name(str(product.get("name") or ""))
            intent_overlap = product_intents.intersection(supported)
            if supported == ["oiliness"] and "oiliness" not in intent_overlap:
                # The corpus has no oil-control function annotation. For this
                # sparse label, explicit product intent prevents noisy links
                # from ranking unrelated products.
                continue
            intent_penalty = 0.10 if product_intents and not intent_overlap else 0.0
            relevance, score_breakdown = _overall_score(
                model_score=model_score,
                evidence_coverage=evidence_coverage,
                evidence_strength=evidence_strength,
                has_explicit_intent=bool(intent_overlap),
                intent_penalty=intent_penalty,
                safety_penalty=penalty,
            )
            metric_f1 = sum(
                float(self._model["concerns"][concern]["metrics"]["f1"])
                for concern in probabilities
            ) / len(probabilities)
            confidence = "medium" if metric_f1 >= 0.75 and matched_ingredients else "low"
            reasons = [
                f"Model lokal mencocokkan produk dengan: {', '.join(matching_concerns)}.",
                f"Evidence ingredient utama: {', '.join(matched_ingredients)}.",
            ]
            if intent_overlap:
                reasons.append(f"Nama produk secara eksplisit menargetkan: {', '.join(sorted(intent_overlap))}.")
            candidates.append(
                LocalRecommendation(
                    product=product,
                    model_score=round(model_score * 100, 2),
                    relevance_score=round(relevance * 100, 2),
                    confidence=confidence,
                    matched_ingredients=matched_ingredients,
                    matching_concerns=matching_concerns,
                    reasons=reasons,
                    cautions=cautions,
                    score_breakdown=score_breakdown,
                )
            )

        candidates.sort(key=lambda item: (-item.relevance_score, item.product["brand"], item.product["name"]))
        selected: list[LocalRecommendation] = []
        brand_counts: dict[str, int] = {}
        selected_slugs: set[str] = set()
        selected_identities: set[str] = set()
        for candidate in candidates:
            brand = str(candidate.product.get("brand") or "unknown").lower()
            identity = f"{brand}::{str(candidate.product.get('name') or '').lower()}"
            if brand_counts.get(brand, 0) >= 2:
                continue
            if identity in selected_identities:
                continue
            selected.append(candidate)
            selected_slugs.add(str(candidate.product.get("slug") or ""))
            selected_identities.add(identity)
            brand_counts[brand] = brand_counts.get(brand, 0) + 1
            if len(selected) >= limit:
                break
        if len(selected) < limit:
            for candidate in candidates:
                slug = str(candidate.product.get("slug") or "")
                brand = str(candidate.product.get("brand") or "unknown").lower()
                identity = f"{brand}::{str(candidate.product.get('name') or '').lower()}"
                if slug in selected_slugs or identity in selected_identities:
                    continue
                selected.append(candidate)
                selected_slugs.add(slug)
                selected_identities.add(identity)
                if len(selected) >= limit:
                    break
        return LocalRecommendationResult(
            products=selected,
            supported_concerns=supported,
            unsupported_concerns=unsupported,
            model_version=self.model_version,
            scoring_version=self.scoring_version,
            limitations=self.limitations,
        )


_ranker: LocalProductRanker | None = None
_ranker_lock = threading.Lock()


def get_local_ranker() -> LocalProductRanker:
    global _ranker  # noqa: PLW0603
    if _ranker is None:
        with _ranker_lock:
            if _ranker is None:
                _ranker = LocalProductRanker()
    return _ranker
