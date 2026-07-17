import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


class EndpointContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def analysis_payload(self, **overrides: object) -> dict[str, object]:
        payload: dict[str, object] = {
            "scanId": str(uuid4()),
            "input": {"method": "manual", "ingredientsText": "Glycerin, Niacinamide"},
            "profile": {
                "skinType": "normal",
                "sensitivityLevel": "medium",
                "pregnancyStatus": "none",
                "conditions": [],
                "concerns": ["acne"],
                "currentRoutine": [],
            },
        }
        payload.update(overrides)
        return payload

    def test_health_happy_paths(self) -> None:
        live = self.client.get("/health/live")
        ready = self.client.get("/health/ready")
        self.assertEqual(live.status_code, 200)
        self.assertEqual(live.json()["status"], "ok")
        self.assertEqual(ready.status_code, 200)
        self.assertEqual(ready.json()["model"], "local-recommender-2026.07.1")

    def test_readiness_reports_model_failure(self) -> None:
        with patch("app.local_model.get_local_ranker", side_effect=ValueError("broken artifact")):
            response = self.client.get("/health/ready")
        self.assertEqual(response.status_code, 503)

    def test_protected_endpoints_require_valid_bearer_token(self) -> None:
        calls = [
            ("post", "/internal/v1/analyses", self.analysis_payload()),
            (
                "post",
                "/internal/v1/recommendations",
                {"concerns": ["acne"], "skinType": "oily"},
            ),
            ("get", "/internal/v1/ingredients/Niacinamide", None),
            (
                "post",
                "/internal/v1/profile-personalization/questions",
                {
                    "profile": {
                        "skinType": "oily",
                        "sensitivityLevel": "medium",
                        "pregnancyStatus": "none",
                        "concerns": ["acne"],
                    }
                },
            ),
            (
                "post",
                "/internal/v1/profile-feedback",
                {
                    "profile": {
                        "skinType": "oily",
                        "sensitivityLevel": "medium",
                        "pregnancyStatus": "none",
                        "concerns": ["acne"],
                    },
                    "product": {"name": "Example Serum", "brand": "Example"},
                    "outcome": "no_change",
                    "usageDays": 7,
                },
            ),
        ]
        with patch.dict(os.environ, {"AI_SERVICE_TOKEN": "expected-token"}):
            for method, url, payload in calls:
                with self.subTest(method=method, url=url):
                    request = getattr(self.client, method)
                    missing = request(url, json=payload) if payload else request(url)
                    invalid = (
                        request(url, json=payload, headers={"Authorization": "Bearer wrong"})
                        if payload
                        else request(url, headers={"Authorization": "Bearer wrong"})
                    )
                    valid = (
                        request(url, json=payload, headers={"Authorization": "Bearer expected-token"})
                        if payload
                        else request(url, headers={"Authorization": "Bearer expected-token"})
                    )
                    self.assertEqual(missing.status_code, 401)
                    self.assertEqual(invalid.status_code, 401)
                    self.assertNotEqual(valid.status_code, 401)

    def test_analysis_happy_path_has_evidence_and_literacy(self) -> None:
        response = self.client.post("/internal/v1/analyses", json=self.analysis_payload())
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "completed")
        self.assertTrue(body["report"]["ingredientDetails"])
        self.assertTrue(body["report"]["education"])
        self.assertEqual(body["versions"]["models"]["productRanker"], "local-recommender-2026.07.1")

    def test_analysis_preserves_parenthetical_ingredient(self) -> None:
        payload = self.analysis_payload(
            input={
                "method": "manual",
                "ingredientsText": "Water, Parfum (Limonene, Linalool), Glycerin",
            }
        )
        response = self.client.post("/internal/v1/analyses", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["product"]["ingredients"]), 3)

    def test_analysis_needs_input_for_missing_text_and_image_only(self) -> None:
        inputs = [
            {"method": "manual", "ingredientsText": "   "},
            {"method": "ingredient_photo", "imageUrls": ["https://example.test/label.jpg"]},
        ]
        for analysis_input in inputs:
            with self.subTest(analysis_input=analysis_input):
                response = self.client.post(
                    "/internal/v1/analyses",
                    json=self.analysis_payload(input=analysis_input),
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["status"], "needs_input")
                self.assertIn("ingredientsText", response.json()["missingFields"])

    def test_analysis_rejects_invalid_contracts(self) -> None:
        invalid_payloads = [
            self.analysis_payload(scanId="not-a-uuid"),
            self.analysis_payload(profile={"skinType": "unknown"}),
            self.analysis_payload(input={"method": "unsupported", "ingredientsText": "Water"}),
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                self.assertEqual(
                    self.client.post("/internal/v1/analyses", json=payload).status_code,
                    422,
                )

    def test_analysis_safety_edges(self) -> None:
        cases = [
            ("Mercurry", "none", "avoid", "PROHIBITED_INGREDIENT"),
            ("Retinol", "pregnant", "high_caution", "PREGNANCY_ACTIVE_CAUTION"),
            ("Xyzzyium, Fooextract", "none", "use_with_caution", None),
        ]
        for ingredients, pregnancy, expected_status, finding_code in cases:
            profile = self.analysis_payload()["profile"]
            assert isinstance(profile, dict)
            profile["pregnancyStatus"] = pregnancy
            payload = self.analysis_payload(
                input={"method": "manual", "ingredientsText": ingredients},
                profile=profile,
            )
            with self.subTest(ingredients=ingredients, pregnancy=pregnancy):
                body = self.client.post("/internal/v1/analyses", json=payload).json()
                self.assertEqual(body["report"]["status"], expected_status)
                if finding_code:
                    self.assertIn(finding_code, [finding["code"] for finding in body["report"]["findings"]])

    def test_analysis_flags_claims_and_invalid_bpom(self) -> None:
        payload = self.analysis_payload(
            input={
                "method": "manual",
                "ingredientsText": "Glycerin",
                "claimsText": "100% menyembuhkan jerawat dalam 1 malam tanpa efek samping",
                "bpomNumber": "invalid-number",
            }
        )
        response = self.client.post("/internal/v1/analyses", json=payload)
        codes = {finding["code"] for finding in response.json()["report"]["findings"]}
        self.assertTrue({"MEDICAL_CLAIM", "INSTANT_RESULT", "ABSOLUTE_CLAIM", "INVALID_BPOM_FORMAT"} <= codes)

    def test_analysis_detects_cross_routine_conflict(self) -> None:
        profile = self.analysis_payload()["profile"]
        assert isinstance(profile, dict)
        profile["currentRoutine"] = [{"productName": "Night serum", "activeIngredients": ["Retinol"]}]
        response = self.client.post(
            "/internal/v1/analyses",
            json=self.analysis_payload(
                input={"method": "manual", "ingredientsText": "Glycolic Acid"},
                profile=profile,
            ),
        )
        codes = {finding["code"] for finding in response.json()["report"]["findings"]}
        self.assertIn("ROUTINE_RETINOID_EXFOLIANT", codes)

    def test_recommendation_happy_path_supports_indonesian_aliases(self) -> None:
        response = self.client.post(
            "/internal/v1/recommendations",
            json={
                "concerns": ["jerawat", "kemerahan"],
                "skinType": "sensitive",
                "sensitivityLevel": "high",
                "limit": 5,
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["concernsUsed"], ["acne", "redness"])
        self.assertLessEqual(len(body["products"]), 5)
        self.assertTrue(all(product["reasons"] and product["matchingChemicals"] for product in body["products"]))

    def test_profile_questionnaire_contract_has_ten_generic_ad_options(self) -> None:
        response = self.client.get("/internal/v1/profile-intake/questions")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        questions = body["questions"]
        self.assertEqual(body["mode"], "generic")
        self.assertEqual(len(questions), 10)
        for question in questions:
            self.assertEqual([option["value"] for option in question["options"]], ["A", "B", "C", "D"])

    def test_personalization_contract_refines_scp_and_returns_remaining_questions(self) -> None:
        profile = {
            "skinType": "sensitive",
            "sensitivityLevel": "high",
            "pregnancyStatus": "none",
            "concerns": ["acne"],
        }
        initial = self.client.post(
            "/internal/v1/profile-personalization/questions",
            json={"profile": profile},
        )
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.json()["totalQuestions"], 20)
        self.assertEqual(len(initial.json()["questions"]), 20)
        self.assertTrue(all(question["kind"] == "personalized" for question in initial.json()["questions"]))

        learned = self.client.post(
            "/internal/v1/profile-personalization/questions",
            json={"profile": profile, "answers": {"fragrance_tolerance": "C"}},
        )
        self.assertEqual(learned.status_code, 200)
        body = learned.json()
        self.assertEqual(body["answeredCount"], 1)
        self.assertEqual(len(body["questions"]), 19)
        self.assertIn("fragrance", body["profile"]["avoidIngredients"])

    def test_product_feedback_updates_scp_and_emits_consented_learning_signal(self) -> None:
        response = self.client.post(
            "/internal/v1/profile-feedback",
            json={
                "profile": {
                    "skinType": "oily",
                    "sensitivityLevel": "medium",
                    "pregnancyStatus": "none",
                    "concerns": ["acne"],
                },
                "product": {
                    "name": "Example Serum",
                    "brand": "Example",
                    "matchingChemicals": ["Niacinamide"],
                    "modelVersion": "local-recommender-2026.07.1",
                },
                "outcome": "reaction",
                "usageDays": 10,
                "reactionSeverity": "severe",
                "suspectedIngredients": ["fragrance"],
                "consentToLearning": True,
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["action"], "stop_and_seek_care")
        self.assertIn("Example::Example Serum", body["profile"]["excludedProducts"])
        self.assertEqual(body["profile"]["feedbackCount"], 1)
        self.assertTrue(body["learningSignal"]["eligibleForOfflineTraining"])

    def test_narrative_profile_returns_recommendations_and_evidence(self) -> None:
        response = self.client.post(
            "/internal/v1/profile-recommendations",
            json={
                "narrative": (
                    "Kulitku berminyak, sering jerawatan dan kadang merah. "
                    "Aku tidak sensitif dan tidak sedang hamil."
                ),
                "limit": 4,
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["resolution"]["canRecommend"])
        self.assertEqual(body["resolution"]["profile"]["skinType"], "oily")
        self.assertLessEqual(len(body["recommendations"]["products"]), 4)
        self.assertTrue(body["resolution"]["fieldEvidence"])

    def test_questionnaire_profile_returns_safe_recommendations(self) -> None:
        response = self.client.post(
            "/internal/v1/profile-recommendations",
            json={
                "answers": {
                    "skin_feel": "D",
                    "reactivity": "C",
                    "primary_concern": "C",
                    "safety_status": "B",
                },
                "limit": 5,
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["resolution"]["profile"]["pregnancyStatus"], "pregnant")
        self.assertTrue(body["resolution"]["canRecommend"])
        blocked = ("retinol", "retinal", "retinyl", "retinoate", "tretinoin", "adapalene")
        for product in body["recommendations"]["products"]:
            evidence = " ".join(product["matchingChemicals"]).lower()
            self.assertFalse(any(term in evidence for term in blocked))

    def test_profile_red_flag_and_missing_fields_do_not_rank(self) -> None:
        payloads = [
            {
                "narrative": "Kulitku berminyak dan jerawatan, sekarang bibir bengkak dan sesak napas.",
                "pregnancyStatus": "none",
            },
            {"narrative": "Aku ingin skincare yang bagus."},
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                response = self.client.post("/internal/v1/profile-recommendations", json=payload)
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.json()["resolution"]["canRecommend"])
                self.assertIsNone(response.json()["recommendations"])

    def test_profile_intake_rejects_empty_or_unknown_answers(self) -> None:
        payloads = [{}, {"answers": {"unknown": "A"}}, {"answers": {"skin_feel": "E"}}]
        for payload in payloads:
            with self.subTest(payload=payload):
                response = self.client.post("/internal/v1/profile-recommendations", json=payload)
                self.assertEqual(response.status_code, 422)

    def test_recommendation_reports_unsupported_concerns(self) -> None:
        unsupported = self.client.post(
            "/internal/v1/recommendations",
            json={"concerns": ["teleportasi"], "skinType": "normal"},
        ).json()
        mixed = self.client.post(
            "/internal/v1/recommendations",
            json={"concerns": ["acne", "teleportasi"], "skinType": "oily", "limit": 2},
        ).json()
        self.assertEqual(unsupported["products"], [])
        self.assertEqual(unsupported["unsupportedConcerns"], ["teleportasi"])
        self.assertEqual(mixed["concernsUsed"], ["acne"])
        self.assertEqual(mixed["unsupportedConcerns"], ["teleportasi"])

    def test_recommendation_respects_products_learned_as_excluded(self) -> None:
        payload = {"concerns": ["acne"], "skinType": "oily", "limit": 3}
        baseline = self.client.post("/internal/v1/recommendations", json=payload).json()
        self.assertTrue(baseline["products"])
        first = baseline["products"][0]
        excluded = f"{first['brand']}::{first['name']}"

        filtered = self.client.post(
            "/internal/v1/recommendations",
            json={**payload, "excludedProducts": [excluded]},
        ).json()
        identities = {f"{product['brand']}::{product['name']}" for product in filtered["products"]}
        self.assertNotIn(excluded, identities)

    def test_recommendation_rejects_invalid_inputs(self) -> None:
        invalid_payloads = [
            {"concerns": [], "skinType": "normal"},
            {"concerns": ["acne"], "skinType": "unknown"},
            {"concerns": ["acne"], "skinType": "oily", "budgetMax": -1},
            {"concerns": ["acne"], "skinType": "oily", "limit": 0},
            {"concerns": ["acne"], "skinType": "oily", "limit": 51},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                self.assertEqual(
                    self.client.post("/internal/v1/recommendations", json=payload).status_code,
                    422,
                )

    def test_recommendation_does_not_invent_price_for_budget(self) -> None:
        response = self.client.post(
            "/internal/v1/recommendations",
            json={"concerns": ["dryness"], "skinType": "dry", "budgetMax": 100000},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["products"], [])
        self.assertTrue(response.json()["limitations"])

    def test_pregnancy_recommendation_excludes_retinoids(self) -> None:
        response = self.client.post(
            "/internal/v1/recommendations",
            json={
                "concerns": ["aging"],
                "skinType": "sensitive",
                "sensitivityLevel": "high",
                "pregnancyStatus": "pregnant",
                "limit": 20,
            },
        )
        blocked = ("retinol", "retinal", "retinyl", "retinoate", "tretinoin", "adapalene")
        for product in response.json()["products"]:
            evidence = " ".join(product["matchingChemicals"]).lower()
            self.assertFalse(any(term in evidence for term in blocked))

    def test_ingredient_knowledge_exact_fuzzy_and_unknown(self) -> None:
        exact = self.client.get("/internal/v1/ingredients/Hyaluronic%20Acid")
        fuzzy = self.client.get("/internal/v1/ingredients/Hyaluronic%20Acld")
        unknown = self.client.get("/internal/v1/ingredients/Xyzzyium")
        self.assertEqual(exact.status_code, 200)
        self.assertEqual(exact.json()["canonicalName"], "Hyaluronic Acid")
        self.assertEqual(fuzzy.status_code, 200)
        self.assertEqual(fuzzy.json()["matchType"], "fuzzy")
        self.assertEqual(unknown.status_code, 404)

    def test_malformed_json_returns_validation_error(self) -> None:
        response = self.client.post(
            "/internal/v1/recommendations",
            content="{not-json",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
