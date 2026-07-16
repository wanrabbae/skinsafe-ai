import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ.pop("AI_SERVICE_TOKEN", None)
        self.client = TestClient(app)

    def test_liveness(self) -> None:
        response = self.client.get("/health/live")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "skinsafe-ai")

    def test_readiness_loads_local_model_and_datasets(self) -> None:
        response = self.client.get("/health/ready")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["model"], "local-recommender-2026.07.1")

    def test_manual_analysis_uses_camel_case_contract(self) -> None:
        response = self.client.post("/internal/v1/analyses", json={
            "scanId": str(uuid4()),
            "input": {"method": "manual", "ingredientsText": "Aqua, Glycerin"},
            "profile": {"skinType": "normal", "sensitivityLevel": "low", "pregnancyStatus": "none"},
        })
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "completed")
        self.assertIn("overallScore", body["report"])

    def test_local_recommendation_contract(self) -> None:
        response = self.client.post(
            "/internal/v1/recommendations",
            json={
                "concerns": ["jerawat"],
                "skinType": "oily",
                "sensitivityLevel": "medium",
                "pregnancyStatus": "none",
                "limit": 3,
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["modelVersion"], "local-recommender-2026.07.1")
        self.assertEqual(body["concernsUsed"], ["acne"])
        self.assertGreaterEqual(len(body["products"]), 1)
        self.assertTrue(body["products"][0]["reasons"])

    def test_ingredient_literacy_contract(self) -> None:
        response = self.client.get("/internal/v1/ingredients/Hyaluronic%20Acid")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["canonicalName"], "Hyaluronic Acid")
        self.assertEqual(body["category"], "moisturizer")
        self.assertTrue(body["education"])


if __name__ == "__main__":
    unittest.main()
