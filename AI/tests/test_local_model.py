import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from pydantic import ValidationError

from app.local_model import LocalProductRanker
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
            limit=10,
        )
        brands = [item.product["brand"].lower() for item in result.products]
        self.assertTrue(all(brands.count(brand) <= 2 for brand in set(brands)))
        identities = {
            (item.product["brand"].lower(), item.product["name"].lower())
            for item in result.products
        }
        self.assertEqual(len(identities), len(result.products))

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

    def test_training_artifacts_include_history_and_valid_svg(self) -> None:
        ai_root = Path(__file__).resolve().parents[1]
        model = json.loads((ai_root / "models" / "recommender-v1.json").read_text(encoding="utf-8"))
        image = ai_root / "images" / model["modelVersion"] / "training-metrics.svg"
        history = model["trainingHistory"]
        self.assertEqual(len(history), model["epochs"])
        self.assertLess(history[-1]["validationLoss"], history[0]["validationLoss"])
        self.assertGreater(history[-1]["validationF1"], history[0]["validationF1"])
        ET.parse(image)


if __name__ == "__main__":
    unittest.main()
