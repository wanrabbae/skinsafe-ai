import json
import unittest
from pathlib import Path

from PIL import Image
from pydantic import ValidationError

from app.local_model import LocalProductRanker, _is_facewash_product
from app.ml_features import normalize_ingredient_name
from app.schemas import RecommendRequest


class LocalModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.ranker = LocalProductRanker()

    def test_indonesian_concern_alias_returns_evidence(self) -> None:
        result = self.ranker.recommend(
            concerns=["jerawat"],
            skin_type="oily",
            sensitivity_level="medium",
            limit=5,
        )
        self.assertEqual(result.supported_concerns, ["acne"])
        self.assertGreaterEqual(len(result.products), 1)
        for product in result.products:
            self.assertIn("acne", product.matching_concerns)
            self.assertTrue(product.matched_ingredients)
            self.assertIn(product.confidence, {"medium", "low"})

    def test_recommendations_only_include_facewash_products(self) -> None:
        result = self.ranker.recommend(
            concerns=["acne", "redness"],
            skin_type="sensitive",
            sensitivity_level="high",
            limit=20,
        )
        self.assertTrue(result.products)
        self.assertTrue(all(_is_facewash_product(item.product) for item in result.products))

    def test_facewash_filter_rejects_other_cleanser_formats(self) -> None:
        accepted = (
            "Aloe Vera Facial Wash",
            "Low pH Gel Cleanser",
            "Gentle Cleansing Foam",
        )
        rejected = (
            "Brightening Serum",
            "Daily Moisturizer",
            "Hydrating Body Cleanser",
            "Cleansing Oil",
            "Cleansing Balm",
            "Cleansing Milk",
            "Cleansing Water",
            "Cleansing Mask",
            "Makeup Brush Cleanser",
            "Scalp Cleanser",
        )
        self.assertTrue(all(_is_facewash_product({"name": name}) for name in accepted))
        self.assertTrue(all(not _is_facewash_product({"name": name}) for name in rejected))

    def test_pregnancy_recommendations_exclude_retinoids(self) -> None:
        result = self.ranker.recommend(
            concerns=["aging"],
            skin_type="sensitive",
            sensitivity_level="high",
            pregnancy_status="pregnant",
            limit=20,
        )
        blocked_terms = ("retinol", "retinal", "retinyl", "retinoate", "tretinoin", "adapalene")
        for recommendation in result.products:
            ingredient_names = " ".join(
                str(item.get("name") or "").lower()
                for item in recommendation.product.get("ingredients") or []
            )
            self.assertFalse(any(term in ingredient_names for term in blocked_terms))

    def test_brand_diversity_and_unique_product_identity(self) -> None:
        result = self.ranker.recommend(
            concerns=["dryness"],
            skin_type="dry",
            limit=6,
        )
        brands = [item.product["brand"].lower() for item in result.products]
        self.assertGreaterEqual(len(set(brands)), min(3, len(brands)))
        identities = {
            (item.product["brand"].lower(), item.product["name"].lower())
            for item in result.products
        }
        self.assertEqual(len(identities), len(result.products))

    def test_overall_scores_are_calibrated_and_differentiated(self) -> None:
        profiles = [
            (["dryness", "hydrating"], "dry", "low"),
            (["acne"], "oily", "medium"),
            (["redness"], "sensitive", "high"),
            (["dullness", "uneven skintone"], "normal", "medium"),
        ]
        for concerns, skin_type, sensitivity in profiles:
            with self.subTest(concerns=concerns):
                result = self.ranker.recommend(
                    concerns=concerns,
                    skin_type=skin_type,
                    sensitivity_level=sensitivity,
                    limit=10,
                )
                scores = [item.relevance_score for item in result.products]
                self.assertGreaterEqual(len(scores), 5)
                self.assertTrue(all(0 <= score <= 95 for score in scores))
                self.assertNotIn(100, scores)
                self.assertGreaterEqual(len(set(scores)), 5)
                for item in result.products:
                    self.assertEqual(item.score_breakdown["uncertaintyReserve"], 5.0)
                    self.assertIn("modelRelevance", item.score_breakdown)
                    self.assertIn("ingredientEvidence", item.score_breakdown)

    def test_dryness_profile_deprioritizes_strong_actives(self) -> None:
        result = self.ranker.recommend(
            concerns=["dryness", "hydrating"],
            skin_type="dry",
            sensitivity_level="low",
            limit=501,
        )
        exfoliating_products = [
            item
            for item in result.products
            if any(
                active in normalize_ingredient_name(str(ingredient.get("name") or ""))
                for ingredient in item.product.get("ingredients") or []
                for active in ("glycolic acid", "lactic acid", "salicylic acid")
            )
        ]
        self.assertTrue(exfoliating_products)
        self.assertTrue(
            all(item.score_breakdown["safetyPenalty"] >= 8 for item in exfoliating_products)
        )

    def test_safety_penalty_reduces_overall_score(self) -> None:
        normal = self.ranker.recommend(
            concerns=["redness"],
            skin_type="normal",
            sensitivity_level="low",
            limit=50,
        )
        sensitive = self.ranker.recommend(
            concerns=["redness"],
            skin_type="sensitive",
            sensitivity_level="high",
            limit=50,
        )
        normal_by_name = {
            (item.product["brand"], item.product["name"]): item
            for item in normal.products
        }
        penalized = [
            item
            for item in sensitive.products
            if (item.product["brand"], item.product["name"]) in normal_by_name
            and item.score_breakdown["safetyPenalty"]
            > normal_by_name[(item.product["brand"], item.product["name"])].score_breakdown[
                "safetyPenalty"
            ]
        ]
        self.assertTrue(penalized)
        for item in penalized:
            baseline = normal_by_name[(item.product["brand"], item.product["name"])]
            self.assertLess(item.relevance_score, baseline.relevance_score)

    def test_budget_does_not_invent_missing_prices(self) -> None:
        result = self.ranker.recommend(
            concerns=["dryness"],
            skin_type="dry",
            budget_max=100_000,
            limit=5,
        )
        self.assertEqual(result.products, [])

    def test_negative_limit_is_rejected_by_contract(self) -> None:
        with self.assertRaises(ValidationError):
            RecommendRequest(concerns=["acne"], skin_type="oily", limit=-1)

    def test_training_artifacts_include_history_and_valid_jpeg(self) -> None:
        ai_root = Path(__file__).resolve().parents[1]
        model = json.loads((ai_root / "models" / "recommender-v1.json").read_text(encoding="utf-8"))
        image = ai_root / "images" / model["modelVersion"] / "training-metrics.jpg"
        history = model["trainingHistory"]
        self.assertEqual(len(history), model["epochs"])
        self.assertLess(history[-1]["validationLoss"], history[0]["validationLoss"])
        self.assertGreater(history[-1]["validationF1"], history[0]["validationF1"])
        self.assertIn("macroNdcgAt10", model["aggregateMetrics"])
        self.assertIn("macroRecallAt10", model["aggregateMetrics"])
        self.assertIn("macroAveragePrecisionAt10", model["aggregateMetrics"])
        self.assertIn("macroF1", model["aggregateBrandHoldoutMetrics"])
        self.assertTrue(set(model["trainingBrands"]).isdisjoint(model["brandHoldoutBrands"]))
        self.assertTrue(set(model["validationBrands"]).isdisjoint(model["brandHoldoutBrands"]))
        self.assertEqual(len(model["modelFingerprint"]), 64)
        with Image.open(image) as chart:
            self.assertEqual(chart.format, "JPEG")
            self.assertEqual(chart.size, (1400, 680))

    def test_data_quality_report_exposes_coverage_and_brand_bias(self) -> None:
        ai_root = Path(__file__).resolve().parents[1]
        report = json.loads((ai_root / "models" / "data-quality-report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["products"], self.ranker.product_count)
        self.assertGreater(report["uniqueProductIngredientNames"], report["knownUniqueIngredientNames"])
        self.assertTrue(report["releaseWarnings"])

    def test_bpom_trust_weighs_25_percent_of_overall(self) -> None:
        from app.local_model import _overall_score

        kwargs = dict(
            model_score=0.8,
            evidence_coverage=1.0,
            evidence_strength=1.0,
            has_explicit_intent=True,
            intent_penalty=0.0,
            safety_penalty=0.0,
        )
        verified, verified_breakdown = _overall_score(bpom_trust=1.0, **kwargs)
        neutral, neutral_breakdown = _overall_score(bpom_trust=0.6, **kwargs)
        self.assertEqual(verified_breakdown["bpomTrust"], 25.0)
        self.assertEqual(neutral_breakdown["bpomTrust"], 15.0)
        self.assertGreater(verified, neutral)

    def test_bpom_trust_mapping_from_sidecar(self) -> None:
        original = self.ranker._bpom_status
        try:
            self.ranker._bpom_status = {"p": {"found": True, "active": True}}
            self.assertEqual(self.ranker._bpom_trust({"slug": "p"})[0], 1.0)
            self.ranker._bpom_status = {"p": {"found": True, "active": False}}
            self.assertEqual(self.ranker._bpom_trust({"slug": "p"})[0], 0.1)
            self.ranker._bpom_status = {"p": {"found": False}}
            self.assertEqual(self.ranker._bpom_trust({"slug": "p"})[0], 0.3)
            self.assertEqual(self.ranker._bpom_trust({"slug": "unknown"})[0], 0.6)
        finally:
            self.ranker._bpom_status = original

    def test_unverified_products_use_neutral_bpom_trust(self) -> None:
        original = self.ranker._bpom_status
        try:
            self.ranker._bpom_status = {}
            result = self.ranker.recommend(concerns=["acne"], skin_type="oily", limit=5)
            self.assertTrue(result.products)
            for item in result.products:
                self.assertEqual(item.score_breakdown["bpomTrust"], 15.0)
        finally:
            self.ranker._bpom_status = original

    def test_conservative_inci_aliases_share_a_canonical_name(self) -> None:
        self.assertEqual(normalize_ingredient_name("Vitamin B3 (Niacinamide)"), "niacinamide")
        self.assertEqual(normalize_ingredient_name("Ascorbic Acid"), "vitamin c")


if __name__ == "__main__":
    unittest.main()
