import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from app.personalization import personalize_profile
from app.profile_intake import resolve_profile
from app.schemas import ProfileIntakeRequest, ProfilePersonalizationRequest, ResolvedSkinProfile
from evaluation.evaluate_profile_intake import evaluate


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

    def test_colloquial_combination_skin_keeps_sensitivity_separate(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                narrative="Kulitku kombinasi dan mudah merah, tetapi aku tidak sedang hamil."
            )
        )
        self.assertEqual(result.profile.skin_type, "combination")
        self.assertEqual(result.profile.sensitivity_level, "high")
        self.assertIn("redness", result.profile.concerns)
        self.assertTrue(result.can_recommend)

    def test_complete_questionnaire_resolves_profile(self) -> None:
        result = resolve_profile(
            ProfileIntakeRequest(
                answers={
                    "skin_feel": "D",
                    "reactivity": "D",
                    "primary_concern": "C",
                    "concern_duration": "D",
                    "concern_severity": "C",
                    "barrier_status": "D",
                    "routine_complexity": "C",
                    "active_usage": "B",
                    "environment": "C",
                    "safety_status": "A",
                }
            )
        )
        self.assertEqual(result.profile.skin_type, "combination")
        self.assertEqual(result.profile.sensitivity_level, "high")
        self.assertIn("damaged_barrier", result.profile.conditions)
        self.assertEqual(result.profile.concerns, ["redness", "discomfort"])
        self.assertEqual(result.profile.concern_duration, "long_term")
        self.assertEqual(result.profile.concern_severity, "high")
        self.assertEqual(result.profile.routine_complexity, "active")
        self.assertEqual(result.profile.environmental_factors, ["sun_pollution"])
        self.assertEqual(result.profile.context_signals["active_usage"], "retinoid")
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

    def test_no_known_reaction_does_not_raise_sensitivity(self) -> None:
        result = personalize_profile(
            ProfilePersonalizationRequest(
                profile=ResolvedSkinProfile(
                    skin_type="normal",
                    sensitivity_level="medium",
                    pregnancy_status="none",
                    concerns=["acne"],
                ),
                answers={"reaction_symptoms": "D"},
            )
        )
        self.assertEqual(result.profile.sensitivity_level, "medium")

        adapted = personalize_profile(
            ProfilePersonalizationRequest(
                profile=result.profile,
                answers={"reaction_onset": "D"},
            )
        )
        prompts = {question.id: question.prompt for question in adapted.questions}
        self.assertIn("Di luar reaksi produk", prompts["reaction_symptoms"])
        self.assertIn("faktor apa pun", prompts["recovery_time"])

    def test_engineering_golden_set_has_no_regressions(self) -> None:
        path = Path(__file__).resolve().parents[1] / "evaluation" / "profile-intake-golden.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        report = evaluate(payload["cases"])
        self.assertEqual(report["failures"], [])
        self.assertEqual(report["safetyGateAccuracy"], 1.0)


if __name__ == "__main__":
    unittest.main()
