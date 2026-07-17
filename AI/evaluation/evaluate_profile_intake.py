"""Evaluate profile intake against an editable engineering golden set."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from app.profile_intake import resolve_profile  # noqa: E402
from app.schemas import ProfileIntakeRequest  # noqa: E402


DEFAULT_CASES = Path(__file__).with_name("profile-intake-golden.json")
DEFAULT_OUTPUT = AI_ROOT / "models" / "profile-intake-evaluation.json"


def evaluate(cases: list[dict[str, Any]]) -> dict[str, Any]:
    exact_fields = 0
    exact_field_total = 0
    concern_hits = 0
    concern_total = 0
    safety_hits = 0
    failures: list[dict[str, Any]] = []
    for case in cases:
        result = resolve_profile(ProfileIntakeRequest.model_validate(case["input"]))
        actual = result.model_dump(by_alias=True)
        expected = case["expected"]
        case_errors: list[str] = []
        for field in ("skinType", "sensitivityLevel", "pregnancyStatus"):
            if field not in expected:
                continue
            exact_field_total += 1
            if actual["profile"].get(field) == expected[field]:
                exact_fields += 1
            else:
                case_errors.append(field)
        expected_concerns = set(expected.get("concerns") or [])
        actual_concerns = set(actual["profile"]["concerns"])
        concern_hits += len(expected_concerns.intersection(actual_concerns))
        concern_total += len(expected_concerns)
        actual_flags = {item["code"] for item in actual["redFlags"]}
        expected_flags = set(expected.get("redFlagCodes") or [])
        safety_correct = actual["canRecommend"] == expected["canRecommend"] and actual_flags == expected_flags
        safety_hits += int(safety_correct)
        if not safety_correct:
            case_errors.append("safety")
        expected_conditions = set(expected.get("conditions") or [])
        if not expected_conditions.issubset(actual["profile"]["conditions"]):
            case_errors.append("conditions")
        if not expected_concerns.issubset(actual_concerns):
            case_errors.append("concerns")
        if case_errors:
            failures.append({"id": case["id"], "fields": sorted(set(case_errors))})
    return {
        "schemaVersion": 1,
        "reviewStatus": "engineering-reviewed-synthetic-not-clinical",
        "cases": len(cases),
        "fieldExactAccuracy": round(exact_fields / max(1, exact_field_total), 4),
        "concernRecall": round(concern_hits / max(1, concern_total), 4),
        "safetyGateAccuracy": round(safety_hits / max(1, len(cases)), 4),
        "failures": failures,
    }


def main() -> int:
    payload = json.loads(DEFAULT_CASES.read_text(encoding="utf-8"))
    report = evaluate(payload["cases"])
    DEFAULT_OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
