import unittest

from evaluation.human_review import evaluate_reviews, validate_review


def review(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "reviewId": "R-1",
        "queryId": "Q-1",
        "reviewerId": "reviewer-pseudonym",
        "reviewerRole": "dermatologist",
        "productSlug": "product-a",
        "systemRank": 1,
        "systemRecommended": True,
        "relevanceGrade": 3,
        "safetyVerdict": "generally_ok",
        "evidenceRefs": ["guideline-1"],
    }
    payload.update(overrides)
    return payload


class HumanReviewTests(unittest.TestCase):
    def test_valid_reviews_produce_ranking_metrics(self) -> None:
        report = evaluate_reviews(
            [
                review(),
                review(reviewId="R-2", productSlug="product-b", systemRank=2, relevanceGrade=1),
            ]
        )
        self.assertEqual(report["macroNdcgAt10"], 1.0)
        self.assertEqual(report["validationErrors"], [])
        self.assertFalse(report["releaseReady"])
        self.assertFalse(report["releaseCriteria"]["atLeast100Reviews"])

    def test_critical_recommended_product_fails_release_gate(self) -> None:
        report = evaluate_reviews([review(safetyVerdict="avoid")])
        self.assertEqual(report["criticalFalseNegativeRate"], 1.0)
        self.assertFalse(report["releaseReady"])

    def test_pii_and_invalid_domain_role_are_rejected(self) -> None:
        errors = validate_review(review(reviewerRole="customer", email="person@example.test"))
        self.assertTrue(any("approved domain role" in error for error in errors))
        self.assertTrue(any("PII" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
