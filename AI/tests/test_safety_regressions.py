import unittest
from uuid import uuid4

from app.engine import IngredientAnalyzer, RoutineConflictEngine
from app.normalizer import IngredientNormalizer
from app.schemas import AnalysisInput, AnalysisRequest, SkinProfile
from app.scoring import analyze, normalize_ingredients


class SafetyRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.normalizer = IngredientNormalizer()
        cls.analyzer = IngredientAnalyzer()

    def request(self, ingredients: str, pregnancy_status: str = "none") -> AnalysisRequest:
        return AnalysisRequest(
            scan_id=uuid4(),
            input=AnalysisInput(method="manual", ingredients_text=ingredients),
            profile=SkinProfile(
                skin_type="normal",
                sensitivity_level="medium",
                pregnancy_status=pregnancy_status,
            ),
        )

    def test_hyaluronic_acid_is_not_exfoliant(self) -> None:
        resolved = self.normalizer.resolve("Hyaluronic Acid")
        report = self.analyzer.analyze(resolved, user_skin_type="sensitive")
        self.assertEqual(report.type_category, "moisturizer")

    def test_hyaluronic_acid_does_not_conflict_with_retinol(self) -> None:
        reports = self.analyzer.analyze_list(
            self.normalizer.resolve_list(["Hyaluronic Acid", "Retinol"]),
            user_skin_type="sensitive",
        )
        codes = [finding.code for finding in RoutineConflictEngine().detect(reports).conflicts]
        self.assertNotIn("RETINOID_EXFOLIANT_FREQUENCY", codes)

    def test_product_exfoliant_conflicts_with_routine_retinol(self) -> None:
        reports = self.analyzer.analyze_list(self.normalizer.resolve_list(["Glycolic Acid"]))
        codes = [
            finding.code
            for finding in RoutineConflictEngine().detect(reports, routine_ingredients=["Retinol"]).conflicts
        ]
        self.assertIn("ROUTINE_RETINOID_EXFOLIANT", codes)

    def test_unknown_ingredients_cannot_receive_reassuring_band(self) -> None:
        result = analyze(self.request("Xyzzyium, Fooextract"))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.report.status, "use_with_caution")
        self.assertLess(result.report.confidence.score, 60)
        self.assertIn("low_confidence_max_use_with_caution", result.report.applied_gates)

    def test_close_prohibited_typo_is_caught(self) -> None:
        result = analyze(self.request("Mercurry"))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.report.status, "avoid")

    def test_pregnancy_retinol_gate(self) -> None:
        result = analyze(self.request("Retinol", pregnancy_status="pregnant"))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.report.status, "high_caution")
        self.assertLessEqual(result.report.overall_score, 49)
        self.assertIn("pregnancy_active_high_caution", result.report.applied_gates)

    def test_orchestrator_parser_preserves_parenthetical_commas(self) -> None:
        ingredients = normalize_ingredients("Water, Parfum (Limonene, Linalool), Glycerin")
        self.assertEqual(ingredients, ["water", "parfum (limonene, linalool)", "glycerin"])


if __name__ == "__main__":
    unittest.main()
