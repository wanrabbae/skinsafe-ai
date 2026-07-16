import unittest

from pydantic import ValidationError

from app.profile_intake import resolve_profile
from app.schemas import ProfileIntakeRequest


class ProfileIntakeTests(unittest.TestCase):
    def test_narrative_extracts_profile_with_negation(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                narrative=(
                    "Kulitku cepat berminyak dan sering jerawatan. Aku tidak sensitif, "
                    "tidak sedang hamil, dan malam hari memakai salicylic acid."
                )
            )
        )
        self.assertEqual(result.profile.skin_type, "oily")
        self.assertEqual(result.profile.sensitivity_level, "low")
        self.assertEqual(result.profile.pregnancy_status, "none")
        self.assertIn("acne", result.profile.concerns)
        self.assertIn("salicylic acid", result.profile.current_ingredients)
        self.assertTrue(result.can_recommend)

    def test_complete_questionnaire_resolves_profile(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                answers={
                    "skin_feel": "D",
                    "reactivity": "D",
                    "primary_concern": "C",
                    "safety_status": "A",
                }
            )
        )
        self.assertEqual(result.profile.skin_type, "combination")
        self.assertEqual(result.profile.sensitivity_level, "high")
        self.assertIn("damaged_barrier", result.profile.conditions)
        self.assertEqual(result.profile.concerns, ["redness", "discomfort"])
        self.assertTrue(result.can_recommend)

    def test_unknown_safety_status_requests_clarification(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                answers={
                    "skin_feel": "A",
                    "reactivity": "B",
                    "primary_concern": "B",
                    "safety_status": "D",
                }
            )
        )
        self.assertIsNone(result.profile.pregnancy_status)
        self.assertFalse(result.can_recommend)
        self.assertTrue(any("hamil" in question for question in result.clarification_questions))

    def test_conflicting_skin_inputs_block_recommendation(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                narrative="Kulitku sangat kering dan kusam. Aku tidak hamil.",
                answers={"skin_feel": "C", "reactivity": "B"},
            )
        )
        self.assertEqual(result.profile.skin_type, "oily")
        self.assertTrue(result.contradictions)
        self.assertFalse(result.can_recommend)

    def test_red_flag_blocks_product_ranking(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                narrative="Kulit berminyak dan jerawatan, tetapi sekarang bibir bengkak dan sulit bernapas.",
                pregnancy_status="none",
            )
        )
        self.assertFalse(result.can_recommend)
        self.assertEqual(result.red_flags[0].code, "BREATHING_OR_FACIAL_SWELLING")

    def test_negated_red_flag_is_not_triggered(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                narrative="Kulitku kering dan kusam, tidak sesak napas dan tidak ada wajah bengkak.",
                pregnancy_status="none",
            )
        )
        self.assertEqual(result.red_flags, [])

    def test_unknown_question_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            ProfileIntakeRequest(answers={"made_up": "A"})


if __name__ == "__main__":
    unittest.main()
