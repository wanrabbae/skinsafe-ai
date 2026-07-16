import unittest
from uuid import uuid4

from app.schemas import AnalysisRequest
from app.scoring import analyze, band


def request_with(ingredients: str | None) -> AnalysisRequest:
    return AnalysisRequest.model_validate({
        "scanId": str(uuid4()),
        "input": {"method": "manual", "ingredientsText": ingredients, "claimsText": "hasil instan"},
        "profile": {"skinType": "sensitive", "sensitivityLevel": "high", "conditions": ["damaged_barrier"], "concerns": [], "pregnancyStatus": "none", "currentRoutine": []},
    })


class ScoringTests(unittest.TestCase):
    def test_score_bands(self) -> None:
        self.assertEqual(band(85), "recommended")
        self.assertEqual(band(50), "use_with_caution")
        self.assertEqual(band(29), "avoid")

    def test_missing_ingredients_requests_input(self) -> None:
        self.assertEqual(analyze(request_with(None)).status, "needs_input")

    def test_prohibited_ingredient_forces_avoid(self) -> None:
        result = analyze(request_with("Aqua, Mercury"))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.report.status, "avoid")
        self.assertIn("prohibited_ingredient_avoid", result.report.applied_gates)


if __name__ == "__main__":
    unittest.main()
