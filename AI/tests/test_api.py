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


if __name__ == "__main__":
    unittest.main()
