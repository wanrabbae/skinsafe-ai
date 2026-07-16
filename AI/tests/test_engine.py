"""Comprehensive tests for the SkinSafe AI Core Engine.

Covers:
- DataStore loading and indexing
- IngredientNormalizer resolution (exact, alias, fuzzy, unresolved)
- IngredientAnalyzer risk assessment
- SkinCompatibilityEngine scoring
- RoutineConflictEngine detection
- ProductRecommender ranking
- Full analyze() integration
"""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

import pytest

# Ensure the app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.data_loader import DataStore, get_store
from app.normalizer import IngredientNormalizer, ResolvedIngredient, _split_ingredients
from app.engine import (
    IngredientAnalyzer,
    SkinCompatibilityEngine,
    RoutineConflictEngine,
    ProductRecommender,
)
from app.schemas import (
    AnalysisInput,
    AnalysisRequest,
    SkinProfile,
)
from app.scoring import analyze, band, normalize_ingredients


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(scope="module")
def store() -> DataStore:
    """Module-scoped DataStore for all tests."""
    return get_store()


@pytest.fixture(scope="module")
def normalizer(store: DataStore) -> IngredientNormalizer:
    return IngredientNormalizer(store=store)


@pytest.fixture(scope="module")
def analyzer(store: DataStore) -> IngredientAnalyzer:
    return IngredientAnalyzer(store=store)


# ============================================================================
# 1. DataStore Tests
# ============================================================================


class TestDataStore:
    def test_chemicals_loaded(self, store: DataStore) -> None:
        """chem_full.csv should load at least 90 unique chemicals."""
        assert len(store.chemicals) >= 90

    def test_no_empty_names(self, store: DataStore) -> None:
        """Empty name rows should be filtered out."""
        for key, chem in store.chemicals.items():
            assert key, "Chemical key should not be empty"
            assert chem.name, "Chemical name should not be empty"

    def test_no_duplicate_keys(self, store: DataStore) -> None:
        """Chemical dict keys should be unique (deduplicated)."""
        keys = list(store.chemicals.keys())
        assert len(keys) == len(set(keys))

    def test_products_loaded(self, store: DataStore) -> None:
        """Both product catalogs should be loaded."""
        assert len(store.products) >= 50
        # Check both sources exist
        sources = {p.source for p in store.products.values()}
        assert "ordinary" in sources
        assert "sephora" in sources

    def test_ordinary_brand(self, store: DataStore) -> None:
        """All Ordinary products should have brand='The Ordinary'."""
        for prod in store.products.values():
            if prod.source == "ordinary":
                assert prod.brand == "The Ordinary"

    def test_symptom_index(self, store: DataStore) -> None:
        """Symptom index should have entries."""
        assert len(store.all_symptoms) >= 5
        # Known symptoms from the data
        assert "dryness" in store.all_symptoms
        assert "acne" in store.all_symptoms

    def test_symptom_to_chems_populated(self, store: DataStore) -> None:
        """Each symptom should map to at least one chemical."""
        for symptom, chems in store.symptom_to_chems.items():
            assert len(chems) >= 1, f"Symptom '{symptom}' has no chemicals"

    def test_junction_tables_loaded(self, store: DataStore) -> None:
        """Chemical ↔ product mappings should exist."""
        assert len(store.chem_to_products) >= 10
        assert len(store.product_to_chems) >= 10

    def test_chemical_lookup(self, store: DataStore) -> None:
        """get_chemical should find known chemicals."""
        chem = store.get_chemical("Allantoin")
        assert chem is not None
        assert chem.name == "Allantoin"

    def test_chemical_lookup_case_insensitive(self, store: DataStore) -> None:
        """get_chemical should be case-insensitive."""
        chem = store.get_chemical("HYALURONIC ACID")
        assert chem is not None
        assert chem.name.lower() == "hyaluronic acid"

    def test_chemical_has_symptoms(self, store: DataStore) -> None:
        """Allantoin should have symptoms attached."""
        chem = store.get_chemical("Allantoin")
        assert chem is not None
        assert len(chem.symptoms) >= 1
        assert "dryness" in chem.symptoms

    def test_sun_protectant_normalized(self, store: DataStore) -> None:
        """'sun-protectant' and 'sun protectant' should map to the same key."""
        chems1 = store.chemicals_for_symptom("sun protectant")
        chems2 = store.chemicals_for_symptom("sun-protectant")
        assert chems1 == chems2

    def test_product_has_chemicals(self, store: DataStore) -> None:
        """Products loaded via junction tables should have chemical_names."""
        products_with_chems = [
            p for p in store.products.values() if p.chemical_names
        ]
        assert len(products_with_chems) >= 10


# ============================================================================
# 2. Normalizer Tests
# ============================================================================


class TestNormalizer:
    def test_exact_match(self, normalizer: IngredientNormalizer) -> None:
        """Exact match should return confidence=1.0."""
        result = normalizer.resolve("Retinol")
        assert result.canonical_name is not None
        assert result.match_type == "exact"
        assert result.confidence == 1.0

    def test_exact_match_case_insensitive(self, normalizer: IngredientNormalizer) -> None:
        result = normalizer.resolve("retinol")
        assert result.canonical_name is not None
        assert result.confidence == 1.0

    def test_exact_match_with_whitespace(self, normalizer: IngredientNormalizer) -> None:
        result = normalizer.resolve("  Hyaluronic Acid  ")
        assert result.canonical_name is not None
        assert result.confidence == 1.0

    def test_fuzzy_match(self, normalizer: IngredientNormalizer) -> None:
        """Slight misspelling should fuzzy-match."""
        result = normalizer.resolve("Hyaluronic Acld")  # 'l' instead of 'i'
        assert result.canonical_name is not None
        assert result.match_type == "fuzzy"
        assert 0.8 <= result.confidence < 1.0

    def test_unresolved(self, normalizer: IngredientNormalizer) -> None:
        """Completely unknown name should be unresolved."""
        result = normalizer.resolve("Xyzzyplugh-42")
        assert result.canonical_name is None
        assert result.match_type == "unresolved"
        assert result.confidence == 0.0

    def test_empty_string(self, normalizer: IngredientNormalizer) -> None:
        result = normalizer.resolve("")
        assert result.canonical_name is None
        assert result.match_type == "unresolved"

    def test_resolve_list(self, normalizer: IngredientNormalizer) -> None:
        results = normalizer.resolve_list(["Retinol", "Glycerin", "XYZZY"])
        assert len(results) == 3
        assert results[0].canonical_name is not None
        assert results[2].canonical_name is None

    def test_parse_and_resolve(self, normalizer: IngredientNormalizer) -> None:
        results = normalizer.parse_and_resolve("Retinol, Niacinamide, Water")
        assert len(results) == 3


class TestSplitIngredients:
    def test_comma_split(self) -> None:
        parts = _split_ingredients("A, B, C")
        assert parts == ["A", "B", "C"]

    def test_semicolon_split(self) -> None:
        parts = _split_ingredients("A; B; C")
        assert parts == ["A", "B", "C"]

    def test_parenthesis_preserved(self) -> None:
        parts = _split_ingredients("AHA (Alpha Hydroxy Acid), BHA")
        assert len(parts) == 2
        assert "AHA (Alpha Hydroxy Acid)" in parts[0]

    def test_empty_string(self) -> None:
        parts = _split_ingredients("")
        assert parts == []


# ============================================================================
# 3. IngredientAnalyzer Tests
# ============================================================================


class TestIngredientAnalyzer:
    def test_known_ingredient(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        resolved = normalizer.resolve("Retinol")
        report = analyzer.analyze(resolved, user_skin_type="normal")
        assert report.chemical is not None
        assert report.risk_level in ("beneficial", "neutral", "caution", "high_risk")
        assert report.type_category != "unknown"

    def test_unresolved_ingredient(self, analyzer: IngredientAnalyzer) -> None:
        resolved = ResolvedIngredient(raw_name="XYZZY", canonical_name=None, confidence=0.0, match_type="unresolved")
        report = analyzer.analyze(resolved)
        assert report.risk_level == "unresolved"
        assert report.chemical is None

    def test_beneficial_for_concern(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        """An ingredient that addresses user concerns should be 'beneficial'."""
        # Allantoin addresses "dryness"
        resolved = normalizer.resolve("Allantoin")
        report = analyzer.analyze(resolved, user_skin_type="dry", user_concerns=["dryness"])
        assert report.risk_level == "beneficial"
        assert "dryness" in report.relevant_symptoms

    def test_has_benefits_summary(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        resolved = normalizer.resolve("Aloe Vera")
        report = analyzer.analyze(resolved)
        assert report.benefits_summary  # should not be empty


# ============================================================================
# 4. SkinCompatibilityEngine Tests
# ============================================================================


class TestSkinCompatibility:
    def test_baseline_score(self) -> None:
        engine = SkinCompatibilityEngine()
        result = engine.evaluate([], skin_type="normal")
        assert result.score == 85  # baseline

    def test_beneficial_boosts_score(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        engine = SkinCompatibilityEngine()
        resolved = normalizer.resolve_list(["Hyaluronic Acid", "Glycerin"])
        reports = analyzer.analyze_list(resolved, user_skin_type="dry")
        result = engine.evaluate(reports, skin_type="dry")
        assert result.score >= 85  # should be at or above baseline

    def test_sensitive_penalty(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        engine = SkinCompatibilityEngine()
        resolved = normalizer.resolve_list(["Retinol", "Glycolic Acid"])
        reports = analyzer.analyze_list(resolved, user_skin_type="sensitive")
        result = engine.evaluate(reports, skin_type="sensitive", sensitivity_level="high")
        # Should have penalty for strong actives + sensitive skin
        assert result.score < 85


# ============================================================================
# 5. RoutineConflictEngine Tests
# ============================================================================


class TestRoutineConflicts:
    def test_no_conflicts_for_safe_ingredients(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        engine = RoutineConflictEngine()
        resolved = normalizer.resolve_list(["Glycerin", "Aloe Vera"])
        reports = analyzer.analyze_list(resolved)
        result = engine.detect(reports)
        # These should have no or few conflicts
        assert result.score < 30

    def test_damaged_barrier_conflict(self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer) -> None:
        engine = RoutineConflictEngine()
        resolved = normalizer.resolve_list(["Retinol", "Glycolic Acid"])
        reports = analyzer.analyze_list(resolved, user_skin_type="sensitive")
        result = engine.detect(reports, conditions=["damaged_barrier"])
        # Should detect damaged barrier + strong active conflict
        codes = [c.code for c in result.conflicts]
        assert "DAMAGED_BARRIER_STRONG_ACTIVE" in codes


# ============================================================================
# 6. ProductRecommender Tests
# ============================================================================


class TestProductRecommender:
    def test_recommend_for_dryness(self, store: DataStore) -> None:
        recommender = ProductRecommender(store=store)
        matches = recommender.recommend(concerns=["dryness"], limit=5)
        assert len(matches) >= 1
        # All matches should have at least one matching chemical
        for m in matches:
            assert len(m.matching_chemicals) >= 1

    def test_recommend_with_budget(self, store: DataStore) -> None:
        recommender = ProductRecommender(store=store)
        matches = recommender.recommend(concerns=["acne"], budget_max=15.0, limit=10)
        for m in matches:
            assert m.product.price <= 15.0

    def test_recommend_empty_concerns(self, store: DataStore) -> None:
        recommender = ProductRecommender(store=store)
        matches = recommender.recommend(concerns=[], limit=5)
        assert matches == []

    def test_recommend_relevance_sorted(self, store: DataStore) -> None:
        recommender = ProductRecommender(store=store)
        matches = recommender.recommend(concerns=["dryness", "aging"], limit=10)
        if len(matches) >= 2:
            # Should be sorted by relevance score descending
            for i in range(len(matches) - 1):
                assert matches[i].relevance_score >= matches[i + 1].relevance_score


# ============================================================================
# 7. Full Integration Tests
# ============================================================================


class TestAnalyzeIntegration:
    def _make_request(
        self,
        ingredients: str = "Hyaluronic Acid, Niacinamide, Glycerin",
        skin_type: str = "normal",
        sensitivity: str = "medium",
        conditions: list[str] | None = None,
        concerns: list[str] | None = None,
        claims: str = "",
        bpom: str | None = None,
    ) -> AnalysisRequest:
        return AnalysisRequest(
            scan_id=uuid4(),
            input=AnalysisInput(
                method="manual",
                ingredients_text=ingredients,
                claims_text=claims,
                bpom_number=bpom,
            ),
            profile=SkinProfile(
                skin_type=skin_type,
                sensitivity_level=sensitivity,
                conditions=conditions or [],
                concerns=concerns or [],
                pregnancy_status="none",
            ),
        )

    def test_basic_analysis(self) -> None:
        """Basic analysis should return CompletedAnalysis."""
        request = self._make_request()
        result = analyze(request)
        assert result.status == "completed"
        assert 0 <= result.report.overall_score <= 100
        assert result.report.status in ("recommended", "generally_ok", "use_with_caution", "high_caution", "avoid")

    def test_ingredient_details_populated(self) -> None:
        """Enriched response should include ingredient_details."""
        request = self._make_request(ingredients="Retinol, Hyaluronic Acid")
        result = analyze(request)
        assert result.status == "completed"
        assert len(result.report.ingredient_details) == 2

    def test_prohibited_still_forces_avoid(self) -> None:
        """Prohibited ingredients should still force status='avoid'."""
        request = self._make_request(ingredients="Mercury, Glycerin")
        result = analyze(request)
        assert result.status == "completed"
        assert result.report.status == "avoid"
        assert result.report.overall_score <= 29

    def test_overclaim_detection(self) -> None:
        """Overclaim patterns should still be detected."""
        request = self._make_request(
            ingredients="Glycerin",
            claims="Menyembuhkan jerawat dalam 1 malam",
        )
        result = analyze(request)
        assert result.status == "completed"
        finding_codes = [f.code for f in result.report.findings]
        assert "MEDICAL_CLAIM" in finding_codes
        assert "INSTANT_RESULT" in finding_codes

    def test_needs_input_when_no_ingredients(self) -> None:
        """Missing ingredients should return NeedsInputAnalysis."""
        request = self._make_request(ingredients="")
        result = analyze(request)
        assert result.status == "needs_input"

    def test_sensitive_skin_affects_compatibility(self) -> None:
        """Sensitive + high sensitivity should affect compatibility score."""
        normal_req = self._make_request(
            ingredients="Retinol, Glycolic Acid",
            skin_type="normal",
            sensitivity="low",
        )
        sensitive_req = self._make_request(
            ingredients="Retinol, Glycolic Acid",
            skin_type="sensitive",
            sensitivity="high",
            conditions=["damaged_barrier"],
        )
        normal_result = analyze(normal_req)
        sensitive_result = analyze(sensitive_req)
        assert normal_result.status == "completed"
        assert sensitive_result.status == "completed"
        # Sensitive should have lower compatibility
        assert (
            sensitive_result.report.sub_scores["skinCompatibility"]
            <= normal_result.report.sub_scores["skinCompatibility"]
        )

    def test_interaction_warnings_populated(self) -> None:
        """Products with incompatible ingredients should produce warnings."""
        request = self._make_request(
            ingredients="Retinol, Glycolic Acid",
            skin_type="sensitive",
            sensitivity="high",
            conditions=["damaged_barrier"],
        )
        result = analyze(request)
        assert result.status == "completed"
        # Should have at least one interaction warning
        assert len(result.report.interaction_warnings) >= 1


class TestBandFunction:
    """Test the band() scoring function."""

    def test_recommended(self) -> None:
        assert band(85) == "recommended"
        assert band(100) == "recommended"

    def test_generally_ok(self) -> None:
        assert band(70) == "generally_ok"
        assert band(84) == "generally_ok"

    def test_use_with_caution(self) -> None:
        assert band(50) == "use_with_caution"
        assert band(69) == "use_with_caution"

    def test_high_caution(self) -> None:
        assert band(30) == "high_caution"
        assert band(49) == "high_caution"

    def test_avoid(self) -> None:
        assert band(0) == "avoid"
        assert band(29) == "avoid"
