"""Tests for the INCIDecoder signal layer (G1/G2/G4/G5).

Covers:
- SignalStore loading + cleaning (U+200B strip, scale parsing)
- IngredientAnalyzer scoring ingredients that are absent from chem_full.csv
- Signal-driven risk rules (comedogenicity/irritancy/rating)
- SkinCompatibilityEngine differentiation by skin profile
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.inci_signals import (
    IngredientSignal,
    SignalStore,
    _clean_function,
    _parse_scale,
    get_signals,
)
from app.engine import IngredientAnalyzer, SkinCompatibilityEngine, _classify
from app.normalizer import IngredientNormalizer


@pytest.fixture(scope="module")
def signals() -> SignalStore:
    return get_signals()


@pytest.fixture(scope="module")
def analyzer(signals: SignalStore) -> IngredientAnalyzer:
    return IngredientAnalyzer(signals=signals)


@pytest.fixture(scope="module")
def normalizer() -> IngredientNormalizer:
    return IngredientNormalizer()


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------


class TestSignalStore:
    def test_index_populated(self, signals: SignalStore) -> None:
        assert len(signals.by_name) > 500

    def test_clean_function_strips_zero_width(self) -> None:
        assert _clean_function("moisturizer/\u200bhumectant") == "moisturizer/humectant"

    def test_parse_scale(self) -> None:
        assert _parse_scale("3") == 3
        assert _parse_scale("0-2") == 2  # upper bound of a range
        assert _parse_scale(None) is None
        assert _parse_scale("") is None

    def test_known_comedogenic_ingredient(self, signals: SignalStore) -> None:
        """Coconut Oil is a well-known comedogenic ingredient."""
        sig = signals.get("Coconut Oil")
        assert sig is not None
        assert sig.comedogenicity is not None and sig.comedogenicity >= 2

    def test_functions_are_clean(self, signals: SignalStore) -> None:
        for sig in signals.by_name.values():
            for fn in sig.functions:
                assert "\u200b" not in fn
                assert fn == fn.strip().lower()

    def test_empty_signal_has_no_data(self) -> None:
        assert IngredientSignal().has_data is False
        assert IngredientSignal(rating="goodie").has_data is True


# ---------------------------------------------------------------------------
# G1 — coverage beyond chem_full.csv
# ---------------------------------------------------------------------------


class TestCoverageBeyondCsv:
    def test_signal_only_ingredient_is_resolved(
        self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer
    ) -> None:
        """An ingredient with a signal but no CSV entry must not be unresolved."""
        # find an ingredient present in signals but absent from the CSV
        target = None
        for name in analyzer._signals.by_name:  # noqa: SLF001 (test introspection)
            resolved = normalizer.resolve(name)
            if resolved.canonical_name is None and analyzer._signals.get(name).has_data:  # noqa: SLF001
                target = name
                break
        assert target is not None, "expected at least one signal-only ingredient"
        report = analyzer.analyze(normalizer.resolve(target))
        assert report.risk_level != "unresolved"
        assert report.chemical is None  # proves it came from the signal layer


# ---------------------------------------------------------------------------
# G2 — signal-driven risk rules
# ---------------------------------------------------------------------------


class TestSignalRiskRules:
    def test_comedogenic_caution_for_oily(
        self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer
    ) -> None:
        report = analyzer.analyze(
            normalizer.resolve("Coconut Oil"), user_skin_type="oily"
        )
        assert report.risk_level == "caution"

    def test_comedogenic_neutral_for_dry(
        self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer
    ) -> None:
        report = analyzer.analyze(
            normalizer.resolve("Coconut Oil"), user_skin_type="dry"
        )
        assert report.risk_level != "caution"


# ---------------------------------------------------------------------------
# G4 — classification via functions
# ---------------------------------------------------------------------------


class TestClassify:
    def test_exfoliant_from_functions(self) -> None:
        assert _classify("Some Acid", ("exfoliant", "buffering"), None) == "exfoliant"

    def test_retinoid_from_name(self) -> None:
        assert _classify("Retinol", (), None) == "retinoid"

    def test_moisturizer_from_functions(self) -> None:
        assert _classify("X", ("moisturizer/humectant",), None) == "moisturizer"


# ---------------------------------------------------------------------------
# G2/G5 — compatibility differentiation
# ---------------------------------------------------------------------------


class TestCompatibilityDifferentiation:
    def test_oily_penalized_vs_dry_for_comedogenic(
        self, analyzer: IngredientAnalyzer, normalizer: IngredientNormalizer
    ) -> None:
        engine = SkinCompatibilityEngine()
        resolved = normalizer.resolve_list(["Coconut Oil", "Water"])
        oily_reports = analyzer.analyze_list(resolved, user_skin_type="oily")
        dry_reports = analyzer.analyze_list(resolved, user_skin_type="dry")
        oily = engine.evaluate(oily_reports, skin_type="oily")
        dry = engine.evaluate(dry_reports, skin_type="dry")
        assert oily.score < dry.score
