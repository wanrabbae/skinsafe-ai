"""Generate two reproducible end-to-end SCP personalization simulations."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.main import app


AI_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = AI_ROOT.parent
DEFAULT_OUTPUT = REPO_ROOT / "Docs" / "AI" / "personalization-random-simulation.md"
TRAINING_HISTORY = AI_ROOT / "images" / "local-recommender-2026.07.1" / "training-history.json"
MODEL_ARTIFACT = AI_ROOT / "models" / "recommender-v1.json"


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)


def _escape(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def _profile_delta(before: dict[str, Any], after: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        key: {"before": before.get(key), "after": after.get(key)}
        for key in sorted(set(before) | set(after))
        if before.get(key) != after.get(key)
    }


def _recommendation_payload(profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "concerns": profile["concerns"],
        "skinType": profile["skinType"],
        "sensitivityLevel": profile["sensitivityLevel"],
        "conditions": profile["conditions"],
        "pregnancyStatus": profile["pregnancyStatus"],
        "currentIngredients": profile["currentIngredients"],
        "avoidIngredients": profile["avoidIngredients"],
        "excludedProducts": profile["excludedProducts"],
        "limit": 3,
    }


def _run_simulation(client: TestClient, seed: int, feedback_outcome: str) -> dict[str, Any]:
    rng = random.Random(seed)
    generic = client.get("/internal/v1/profile-intake/questions")
    generic.raise_for_status()
    generic_rows: list[dict[str, str]] = []
    generic_answers: dict[str, str] = {}
    for question in generic.json()["questions"]:
        options = question["options"]
        if question["id"] == "safety_status":
            options = options[:3]  # Keep the random run eligible for recommendation.
        option = rng.choice(options)
        generic_answers[question["id"]] = option["value"]
        generic_rows.append(
            {
                "id": question["id"],
                "prompt": question["prompt"],
                "choice": option["value"],
                "label": option["label"],
            }
        )

    initial_response = client.post(
        "/internal/v1/profile-recommendations",
        json={"answers": generic_answers, "limit": 3},
    )
    initial_response.raise_for_status()
    initial_body = initial_response.json()
    assert initial_body["resolution"]["canRecommend"]
    initial_profile = initial_body["resolution"]["profile"]

    personalized_answers: dict[str, str] = {}
    personalized_rows: list[dict[str, str | int]] = []
    final_personalization: dict[str, Any] | None = None
    for step in range(1, 21):
        response = client.post(
            "/internal/v1/profile-personalization/questions",
            json={"profile": initial_profile, "answers": personalized_answers},
        )
        response.raise_for_status()
        body = response.json()
        assert len(body["questions"]) == 21 - step
        question = body["questions"][0]
        options = question["options"]
        if question["id"] == "reaction_symptoms" and personalized_answers.get("reaction_onset") != "D":
            options = options[:3]  # A known reaction cannot also be "Tidak ada".
        option = rng.choice(options)
        personalized_answers[question["id"]] = option["value"]
        personalized_rows.append(
            {
                "step": step,
                "id": question["id"],
                "prompt": question["prompt"],
                "why": question["whyAsked"],
                "choice": option["value"],
                "label": option["label"],
            }
        )

    completed = client.post(
        "/internal/v1/profile-personalization/questions",
        json={"profile": initial_profile, "answers": personalized_answers},
    )
    completed.raise_for_status()
    final_personalization = completed.json()
    assert final_personalization["completed"] and final_personalization["questions"] == []
    final_profile = final_personalization["profile"]

    recommendation_response = client.post(
        "/internal/v1/recommendations",
        json=_recommendation_payload(final_profile),
    )
    recommendation_response.raise_for_status()
    recommendation = recommendation_response.json()
    assert recommendation["products"], "randomized SCP unexpectedly produced no recommendation"
    product = recommendation["products"][0]

    adverse = feedback_outcome == "reaction"
    feedback_payload = {
        "profile": final_profile,
        "product": {
            "name": product["name"],
            "brand": product["brand"],
            "matchingChemicals": product["matchingChemicals"],
            "modelVersion": recommendation["modelVersion"],
        },
        "outcome": feedback_outcome,
        "usageDays": 8 if adverse else 28,
        "reactionSeverity": "moderate" if adverse else "none",
        "suspectedIngredients": [],
        "consentToLearning": True,
    }
    feedback_response = client.post("/internal/v1/profile-feedback", json=feedback_payload)
    feedback_response.raise_for_status()
    feedback = feedback_response.json()
    learned_profile = feedback["profile"]

    after_response = client.post(
        "/internal/v1/recommendations",
        json=_recommendation_payload(learned_profile),
    )
    after_response.raise_for_status()
    after = after_response.json()
    product_key = f"{product['brand']}::{product['name']}"
    after_keys = {f"{item['brand']}::{item['name']}" for item in after["products"]}
    behavior_check = (
        f"PASS: {product_key} tetap tercatat sebagai successful product."
        if not adverse and product_key in learned_profile["successfulProducts"]
        else f"PASS: {product_key} dikeluarkan dari recommendation berikutnya."
        if adverse and product_key not in after_keys
        else "FAIL: feedback belum memengaruhi recommendation sesuai harapan."
    )
    assert behavior_check.startswith("PASS")

    return {
        "seed": seed,
        "genericRows": generic_rows,
        "genericAnswers": generic_answers,
        "initialProfile": initial_profile,
        "personalizedRows": personalized_rows,
        "personalizedAnswers": personalized_answers,
        "finalProfile": final_profile,
        "personalizationDelta": _profile_delta(initial_profile, final_profile),
        "recommendedProduct": product,
        "feedbackPayload": feedback_payload,
        "feedbackResponse": feedback,
        "feedbackDelta": _profile_delta(final_profile, learned_profile),
        "behaviorCheck": behavior_check,
    }


def _training_summary() -> dict[str, Any]:
    history = json.loads(TRAINING_HISTORY.read_text(encoding="utf-8"))
    model = json.loads(MODEL_ARTIFACT.read_text(encoding="utf-8"))
    first, last = history[0], history[-1]
    best_loss = min(history, key=lambda row: row["validationLoss"])
    best_f1 = max(history, key=lambda row: row["validationF1"])
    snapshots = [row for row in history if row["epoch"] in {1, 5, 10, 20, 30, 40, 50, 55}]
    return {
        "modelVersion": model["modelVersion"],
        "epochs": len(history),
        "first": first,
        "bestValidationLoss": best_loss,
        "bestValidationF1": best_f1,
        "last": last,
        "trainLossReductionPct": round((first["trainLoss"] - last["trainLoss"]) / first["trainLoss"] * 100, 2),
        "validationLossReductionPct": round(
            (first["validationLoss"] - last["validationLoss"]) / first["validationLoss"] * 100, 2
        ),
        "finalGeneralizationGap": round(last["validationLoss"] - last["trainLoss"], 6),
        "aggregateMetrics": model["aggregateMetrics"],
        "brandHoldoutMetrics": model["aggregateBrandHoldoutMetrics"],
        "snapshots": snapshots,
    }


def _render_run(index: int, run: dict[str, Any]) -> list[str]:
    lines = [
        f"## Simulasi {index} — seed `{run['seed']}`",
        "",
        "Semua jawaban dipilih RNG. Safety status dibatasi A-C agar mencapai recommendation; dependent answer yang mustahil secara logis juga dikeluarkan dari kandidat.",
        "",
        "### 10 pertanyaan generik",
        "",
        "| # | ID | Pertanyaan | Random | Jawaban |",
        "|---:|---|---|:---:|---|",
    ]
    for number, row in enumerate(run["genericRows"], 1):
        lines.append(
            f"| {number} | `{row['id']}` | {_escape(row['prompt'])} | {row['choice']} | {_escape(row['label'])} |"
        )
    lines.extend(["", "SCP awal:", "", "```json", _json(run["initialProfile"]), "```", ""])
    lines.extend(
        [
            "### 20 pertanyaan personalisasi adaptif",
            "",
            "Urutan berikut adalah urutan aktual dari engine. Setelah setiap random answer, semua jawaban akumulatif dikirim ulang dan pertanyaan tersisa diprioritaskan ulang.",
            "",
            "| Step | ID | Pertanyaan aktual | Kenapa ditanya | Random | Jawaban |",
            "|---:|---|---|---|:---:|---|",
        ]
    )
    for row in run["personalizedRows"]:
        lines.append(
            f"| {row['step']} | `{row['id']}` | {_escape(row['prompt'])} | {_escape(row['why'])} | {row['choice']} | {_escape(row['label'])} |"
        )
    lines.extend(
        [
            "",
            "Perubahan SCP setelah personalisasi:",
            "",
            "```json",
            _json(run["personalizationDelta"]),
            "```",
            "",
            "SCP final:",
            "",
            "```json",
            _json(run["finalProfile"]),
            "```",
            "",
            "### Recommendation dan feedback learning",
            "",
            "Produk teratas sebelum feedback:",
            "",
            "```json",
            _json(run["recommendedProduct"]),
            "```",
            "",
            "Feedback yang diuji:",
            "",
            "```json",
            _json(run["feedbackPayload"]),
            "```",
            "",
            "Perubahan SCP dari feedback:",
            "",
            "```json",
            _json(run["feedbackDelta"]),
            "```",
            "",
            f"**{run['behaviorCheck']}**",
            "",
        ]
    )
    return lines


def _render_report(runs: list[dict[str, Any]], training: dict[str, Any]) -> str:
    lines = [
        "# Random Personalization and Training Inspection",
        "",
        "Report ini dihasilkan oleh engine FastAPI lokal melalui kontrak endpoint sebenarnya. Seed membuat random answers dapat direproduksi.",
        "",
        "Re-run dari folder `AI`: `.venv\\Scripts\\python -m evaluation.simulate_personalization --seeds 20260717 20260718`.",
        "",
    ]
    for index, run in enumerate(runs, 1):
        lines.extend(_render_run(index, run))

    lines.extend(
        [
            "## Epoch, train loss, dan validation metrics",
            "",
            "Personalisasi SCP memperbarui konteks user secara langsung dan tidak menjalankan training epoch per user. Tabel ini berasal dari artifact model recommender global yang dipakai runtime.",
            "",
            f"- Model: `{training['modelVersion']}`",
            f"- Total epoch: **{training['epochs']}**",
            f"- Train loss turun **{training['trainLossReductionPct']}%**.",
            f"- Validation loss turun **{training['validationLossReductionPct']}%**.",
            f"- Validation loss terbaik: **{training['bestValidationLoss']['validationLoss']}** pada epoch **{training['bestValidationLoss']['epoch']}**.",
            f"- Validation F1 terbaik: **{training['bestValidationF1']['validationF1']}** pada epoch **{training['bestValidationF1']['epoch']}**.",
            f"- Final generalization gap: **{training['finalGeneralizationGap']}**.",
            "",
            "Interpretasi: train dan validation loss sama-sama turun tanpa divergensi besar. Validation F1 sudah plateau sekitar epoch 38, sedangkan validation loss minimum di epoch 52; epoch 53-55 memberi improvement yang sangat kecil sehingga early stopping sekitar titik itu layak dipertimbangkan pada retraining berikutnya.",
            "",
            "| Epoch | Train loss | Validation loss | Validation F1 |",
            "|---:|---:|---:|---:|",
        ]
    )
    for row in training["snapshots"]:
        lines.append(
            f"| {row['epoch']} | {row['trainLoss']:.6f} | {row['validationLoss']:.6f} | {row['validationF1']:.4f} |"
        )
    lines.extend(
        [
            "",
            "Aggregate metrics:",
            "",
            "```json",
            _json(training["aggregateMetrics"]),
            "```",
            "",
            "Brand-holdout metrics:",
            "",
            "```json",
            _json(training["brandHoldoutMetrics"]),
            "```",
            "",
            "Kurva visual: [`AI/images/local-recommender-2026.07.1/training-metrics.jpg`](../../AI/images/local-recommender-2026.07.1/training-metrics.jpg).",
            "",
            "Metrik memakai weak labels dan bukan clinical accuracy. Learning signal ber-consent tetap harus melewati review/evaluation sebelum batch retraining global.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seeds", nargs=2, type=int, default=[20260717, 20260718])
    args = parser.parse_args()

    client = TestClient(app)
    runs = [
        _run_simulation(client, args.seeds[0], "improved"),
        _run_simulation(client, args.seeds[1], "reaction"),
    ]
    report = _render_report(runs, _training_summary())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"Wrote {args.output}")
    for index, run in enumerate(runs, 1):
        print(f"Simulation {index}: seed={run['seed']} {run['behaviorCheck']}")


if __name__ == "__main__":
    main()
