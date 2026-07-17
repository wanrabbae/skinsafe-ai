"""Validate expert review JSONL and calculate release-gate metrics."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any


REVIEWER_ROLES = {"dermatologist", "formulator", "pharmacist"}
SAFETY_VERDICTS = {"recommended", "generally_ok", "use_with_caution", "high_caution", "avoid"}


def validate_review(review: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    required = {"reviewId", "queryId", "reviewerId", "reviewerRole", "productSlug", "systemRank", "relevanceGrade", "safetyVerdict", "evidenceRefs"}
    missing = sorted(required - set(review))
    if missing:
        errors.append(f"missing fields: {', '.join(missing)}")
        return errors
    if review["reviewerRole"] not in REVIEWER_ROLES:
        errors.append("reviewerRole is not an approved domain role")
    if review["safetyVerdict"] not in SAFETY_VERDICTS:
        errors.append("safetyVerdict is invalid")
    if not isinstance(review["systemRank"], int) or review["systemRank"] < 1:
        errors.append("systemRank must be a positive integer")
    if not isinstance(review["relevanceGrade"], int) or not 0 <= review["relevanceGrade"] <= 3:
        errors.append("relevanceGrade must be an integer from 0 to 3")
    if not isinstance(review["evidenceRefs"], list) or not review["evidenceRefs"]:
        errors.append("at least one evidence reference is required")
    forbidden = {"email", "phone", "name", "userId", "freeTextProfile"}.intersection(review)
    if forbidden:
        errors.append(f"PII/free text fields are forbidden: {', '.join(sorted(forbidden))}")
    return errors


def _ndcg(reviews: list[dict[str, Any]], k: int = 10) -> float:
    grades = [int(item["relevanceGrade"]) for item in sorted(reviews, key=lambda item: item["systemRank"])[:k]]
    dcg = sum((2**grade - 1) / math.log2(rank + 1) for rank, grade in enumerate(grades, start=1))
    ideal = sorted(grades, reverse=True)
    ideal_dcg = sum((2**grade - 1) / math.log2(rank + 1) for rank, grade in enumerate(ideal, start=1))
    return dcg / ideal_dcg if ideal_dcg else 0.0


def evaluate_reviews(reviews: list[dict[str, Any]]) -> dict[str, Any]:
    validation_errors: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    valid: list[dict[str, Any]] = []
    for index, review in enumerate(reviews, start=1):
        errors = validate_review(review)
        review_id = str(review.get("reviewId") or f"line-{index}")
        if review_id in seen_ids:
            errors.append("duplicate reviewId")
        seen_ids.add(review_id)
        if errors:
            validation_errors.append({"reviewId": review_id, "errors": errors})
        else:
            valid.append(review)

    by_query: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_candidate: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    critical = 0
    critical_missed = 0
    for review in valid:
        by_query[str(review["queryId"])].append(review)
        by_candidate[(str(review["queryId"]), str(review["productSlug"]))].append(review)
        if review["safetyVerdict"] in {"high_caution", "avoid"}:
            critical += 1
            critical_missed += int(bool(review.get("systemRecommended", True)))

    ndcg_scores = [_ndcg(items) for items in by_query.values()]
    reviewers = {str(item["reviewerId"]) for item in valid}
    agreement_pairs = [items for items in by_candidate.values() if len(items) > 1]
    exact_agreements = sum(
        len({item["relevanceGrade"] for item in items}) == 1
        and len({item["safetyVerdict"] for item in items}) == 1
        for items in agreement_pairs
    )
    macro_ndcg = round(sum(ndcg_scores) / len(ndcg_scores), 4) if ndcg_scores else None
    agreement = round(exact_agreements / len(agreement_pairs), 4) if agreement_pairs else None
    release_criteria = {
        "atLeast100Reviews": len(valid) >= 100,
        "atLeast25Queries": len(by_query) >= 25,
        "atLeast2Reviewers": len(reviewers) >= 2,
        "macroNdcgAt10AtLeast0.8": macro_ndcg is not None and macro_ndcg >= 0.8,
        "reviewerAgreementAtLeast0.8": agreement is not None and agreement >= 0.8,
        "zeroCriticalFalseNegatives": critical_missed == 0,
        "validSchema": not validation_errors,
    }
    return {
        "schemaVersion": 1,
        "reviewStatus": "human-domain-review",
        "reviews": len(valid),
        "queries": len(by_query),
        "reviewers": len(reviewers),
        "macroNdcgAt10": macro_ndcg,
        "criticalFalseNegativeRate": round(critical_missed / critical, 4) if critical else None,
        "exactReviewerAgreement": agreement,
        "validationErrors": validation_errors,
        "releaseCriteria": release_criteria,
        "releaseReady": all(release_criteria.values()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate reviewed SkinSafe recommendation judgments")
    parser.add_argument("input", type=Path, help="JSONL file containing de-identified expert reviews")
    parser.add_argument("--output", type=Path, default=Path("models/human-review-evaluation.json"))
    args = parser.parse_args()
    reviews = [json.loads(line) for line in args.input.read_text(encoding="utf-8").splitlines() if line.strip()]
    report = evaluate_reviews(reviews)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["releaseReady"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
