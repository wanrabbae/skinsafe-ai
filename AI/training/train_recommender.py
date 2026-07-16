"""Train and evaluate SkinSafe's local product relevance model.

No remote model, hosted embedding, or LLM API is used.  The trainer consumes
the repository's reviewed chemical relationships plus the local INCIDecoder
product fixtures, learns one logistic model per supported concern, and writes
portable JSON artifacts used by FastAPI.

Run from the repository root:

    py -3.12 AI/training/train_recommender.py
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


AI_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = AI_ROOT.parent
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from app.ml_features import (  # noqa: E402
    CANONICAL_CONCERNS,
    canonicalize_concern,
    derive_weak_labels,
    normalize_ingredient_name,
    predict_probability,
    product_features,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train SkinSafe local recommendation model")
    parser.add_argument("--scripts-dir", type=Path, default=REPO_ROOT / "scripts" / "incidecoder" / "data")
    parser.add_argument("--chem-data-dir", type=Path, default=AI_ROOT / "data")
    parser.add_argument("--output", type=Path, default=AI_ROOT / "models" / "recommender-v1.json")
    parser.add_argument("--catalog-output", type=Path, default=AI_ROOT / "data" / "local_product_catalog.json")
    parser.add_argument("--images-dir", type=Path, default=AI_ROOT / "images")
    parser.add_argument("--epochs", type=int, default=55)
    parser.add_argument("--dimension", type=int, default=768)
    parser.add_argument("--seed", type=int, default=20260716)
    return parser.parse_args()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_chemical_symptoms(data_dir: Path) -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = defaultdict(set)
    chemical_types: dict[str, str] = {}
    with (data_dir / "chem_full.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            chemical_types[normalize_ingredient_name(row.get("name") or "")] = normalize_ingredient_name(row.get("type") or "")
    with (data_dir / "symp_to_chem_names.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            name = normalize_ingredient_name(row.get("chem_name") or "")
            concern = canonicalize_concern(row.get("chem_symptoms") or "")
            chemical_type = chemical_types.get(name, "")
            if chemical_type == "preservative" or chemical_type.startswith("emulsifier") or chemical_type.startswith("foaming agent"):
                continue
            if name and concern:
                mapping[name].add(concern)
    return dict(mapping)


def sanitize_product(product: dict[str, Any], source_file: str) -> dict[str, Any]:
    ingredients: list[dict[str, Any]] = []
    for ingredient in product.get("ingredients") or []:
        name = str(ingredient.get("name") or "").strip()
        if not name:
            continue
        ingredients.append(
            {
                "name": name,
                "functions": [str(item).strip() for item in ingredient.get("functions") or [] if str(item).strip()],
                "rating": ingredient.get("rating"),
                "irritancy": ingredient.get("irritancy"),
                "comedogenicity": ingredient.get("comedogenicity"),
            }
        )

    return {
        "slug": str(product.get("slug") or "").strip(),
        "name": str(product.get("name") or product.get("productTitle") or "").strip(),
        "brand": str(product.get("brand") or "").strip(),
        "source": "incidecoder",
        "sourceUrl": str(product.get("sourceUrl") or "").strip(),
        "sourceFile": source_file,
        "price": None,
        "highlights": [str(item).strip() for item in product.get("highlights") or [] if str(item).strip()],
        "ingredients": ingredients,
    }


def load_products(scripts_dir: Path) -> tuple[list[dict[str, Any]], list[Path]]:
    products: list[dict[str, Any]] = []
    source_files = sorted(scripts_dir.glob("*.json"))
    seen_slugs: set[str] = set()

    for path in source_files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        for raw_product in payload.get("products") or []:
            product = sanitize_product(raw_product, path.name)
            slug = product["slug"]
            generic_name = product["name"].strip().lower() == product["brand"].strip().lower()
            normalized_name = product["name"].lower()
            non_skincare_terms = (
                "compact powder",
                "facial powder",
                "foundation",
                "concealer",
                "cushion",
                "mascara",
                "eyeliner",
                "eyebrow",
                "lash & brow",
                "lipstick",
                "lip tint",
                "toning device",
                "attachment bundle",
            )
            unsupported_category = product["brand"].strip().lower() == "nuface" or any(
                term in normalized_name for term in non_skincare_terms
            )
            if (
                not slug
                or not product["name"]
                or generic_name
                or unsupported_category
                or not product["ingredients"]
                or slug in seen_slugs
            ):
                continue
            seen_slugs.add(slug)
            products.append(product)

    products.sort(key=lambda item: item["slug"])
    return products, source_files


def is_validation_product(product: dict[str, Any]) -> bool:
    # Split by normalized product identity so duplicate names cannot leak across
    # train and validation even when they have different slugs.
    identity = f"{product['brand']}::{product['name']}".lower().encode("utf-8")
    bucket = int.from_bytes(hashlib.blake2b(identity, digest_size=2).digest(), "little") % 5
    return bucket == 0


def train_binary_model(
    samples: list[tuple[dict[int, float], int]],
    validation_samples: list[tuple[dict[int, float], int]],
    dimension: int,
    epochs: int,
    seed: int,
) -> tuple[list[float], float, list[dict[str, float | int]]]:
    weights = [0.0] * dimension
    bias = 0.0
    positives = sum(label for _, label in samples)
    negatives = len(samples) - positives
    positive_weight = min(8.0, negatives / max(1, positives))
    order = list(range(len(samples)))
    history: list[dict[str, float | int]] = []

    for epoch in range(epochs):
        random.Random(seed + epoch).shuffle(order)
        learning_rate = 0.18 / math.sqrt(1.0 + epoch * 0.35)
        l2 = 0.0008
        for sample_index in order:
            features, label = samples[sample_index]
            probability = predict_probability(weights, bias, features)
            sample_weight = positive_weight if label else 1.0
            error = (probability - label) * sample_weight
            for index, value in features.items():
                weights[index] -= learning_rate * (error * value + l2 * weights[index])
            bias -= learning_rate * error

        train_pairs = [(predict_probability(weights, bias, features), label) for features, label in samples]
        validation_pairs = [
            (predict_probability(weights, bias, features), label)
            for features, label in validation_samples
        ]
        history.append(
            {
                "epoch": epoch + 1,
                "trainLoss": round(binary_log_loss(train_pairs), 6),
                "validationLoss": round(binary_log_loss(validation_pairs), 6),
                "validationF1": confusion_at_threshold(validation_pairs, 0.5)["f1"],
            }
        )

    return weights, bias, history


def binary_log_loss(pairs: list[tuple[float, int]]) -> float:
    if not pairs:
        return 0.0
    total = 0.0
    for probability, label in pairs:
        probability = min(1.0 - 1e-12, max(1e-12, probability))
        total -= label * math.log(probability) + (1 - label) * math.log(1 - probability)
    return total / len(pairs)


def confusion_at_threshold(pairs: list[tuple[float, int]], threshold: float) -> dict[str, float | int]:
    true_positive = sum(probability >= threshold and label == 1 for probability, label in pairs)
    false_positive = sum(probability >= threshold and label == 0 for probability, label in pairs)
    false_negative = sum(probability < threshold and label == 1 for probability, label in pairs)
    true_negative = sum(probability < threshold and label == 0 for probability, label in pairs)
    precision = true_positive / max(1, true_positive + false_positive)
    recall = true_positive / max(1, true_positive + false_negative)
    f1 = 2 * precision * recall / max(1e-12, precision + recall)
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": true_positive,
        "fp": false_positive,
        "fn": false_negative,
        "tn": true_negative,
    }


def roc_auc(pairs: list[tuple[float, int]]) -> float:
    positives = [probability for probability, label in pairs if label]
    negatives = [probability for probability, label in pairs if not label]
    if not positives or not negatives:
        return 0.5
    wins = 0.0
    for positive in positives:
        for negative in negatives:
            wins += 1.0 if positive > negative else 0.5 if positive == negative else 0.0
    return wins / (len(positives) * len(negatives))


def choose_threshold(pairs: list[tuple[float, int]]) -> tuple[float, dict[str, float | int]]:
    best_threshold = 0.5
    best_metrics = confusion_at_threshold(pairs, best_threshold)
    for step in range(15, 86, 2):
        threshold = step / 100
        metrics = confusion_at_threshold(pairs, threshold)
        # Recall gets a small preference because missing a useful product is more
        # costly than presenting one extra candidate before deterministic filters.
        utility = float(metrics["f1"]) + 0.05 * float(metrics["recall"])
        best_utility = float(best_metrics["f1"]) + 0.05 * float(best_metrics["recall"])
        if utility > best_utility:
            best_threshold, best_metrics = threshold, metrics
    return best_threshold, best_metrics


def round_weights(weights: list[float]) -> list[float]:
    return [round(value, 7) for value in weights]


def aggregate_history(concern_models: dict[str, Any], epochs: int) -> list[dict[str, float | int]]:
    result: list[dict[str, float | int]] = []
    for epoch in range(epochs):
        rows = [model["history"][epoch] for model in concern_models.values()]
        result.append(
            {
                "epoch": epoch + 1,
                "trainLoss": round(sum(float(row["trainLoss"]) for row in rows) / len(rows), 6),
                "validationLoss": round(sum(float(row["validationLoss"]) for row in rows) / len(rows), 6),
                "validationF1": round(sum(float(row["validationF1"]) for row in rows) / len(rows), 4),
            }
        )
    return result


def _polyline(values: list[float], x: int, y: int, width: int, height: int, maximum: float) -> str:
    if len(values) == 1:
        return f"{x},{y + height}"
    return " ".join(
        f"{x + index * width / (len(values) - 1):.1f},{y + height - min(value, maximum) * height / maximum:.1f}"
        for index, value in enumerate(values)
    )


def write_training_images(model_payload: dict[str, Any], images_dir: Path) -> Path:
    model_dir = images_dir / str(model_payload["modelVersion"])
    model_dir.mkdir(parents=True, exist_ok=True)
    history = model_payload["trainingHistory"]
    train_loss = [float(row["trainLoss"]) for row in history]
    validation_loss = [float(row["validationLoss"]) for row in history]
    validation_f1 = [float(row["validationF1"]) for row in history]
    max_loss = max(train_loss + validation_loss + [1.0])
    concerns = list(model_payload["concerns"])
    concern_f1 = [float(model_payload["concerns"][name]["metrics"]["f1"]) for name in concerns]
    bar_width = 600 / len(concerns)

    bars = []
    labels = []
    for index, (name, score) in enumerate(zip(concerns, concern_f1, strict=True)):
        bar_height = score * 170
        bar_x = 660 + index * bar_width
        bars.append(
            f'<rect x="{bar_x:.1f}" y="{540 - bar_height:.1f}" width="{bar_width - 5:.1f}" height="{bar_height:.1f}" fill="#6d28d9"/>'
        )
        labels.append(
            f'<text x="{bar_x + 4:.1f}" y="555" font-size="10" transform="rotate(45 {bar_x + 4:.1f} 555)">{name}</text>'
        )

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="680" viewBox="0 0 1400 680">
<rect width="1400" height="680" fill="#fff"/>
<style>text{{font-family:Arial,sans-serif;fill:#1d1a24}} .axis{{stroke:#ccc3d7;stroke-width:1}}</style>
<text x="40" y="35" font-size="24" font-weight="700">SkinSafe training metrics</text>
<text x="40" y="60" font-size="13">{model_payload['modelVersion']} · {model_payload['trainedAt']}</text>
<text x="40" y="95" font-size="17" font-weight="700">Loss per epoch</text>
<line class="axis" x1="40" y1="300" x2="620" y2="300"/><line class="axis" x1="40" y1="110" x2="40" y2="300"/>
<polyline fill="none" stroke="#6d28d9" stroke-width="3" points="{_polyline(train_loss, 40, 110, 580, 190, max_loss)}"/>
<polyline fill="none" stroke="#ba1a1a" stroke-width="3" points="{_polyline(validation_loss, 40, 110, 580, 190, max_loss)}"/>
<text x="45" y="320" font-size="12">epoch 1</text><text x="565" y="320" font-size="12">epoch {len(history)}</text>
<text x="55" y="130" font-size="12" fill="#6d28d9">train loss</text><text x="145" y="130" font-size="12" fill="#ba1a1a">validation loss</text>
<text x="40" y="365" font-size="17" font-weight="700">Validation F1 @ 0.5</text>
<line class="axis" x1="40" y1="570" x2="620" y2="570"/><line class="axis" x1="40" y1="380" x2="40" y2="570"/>
<polyline fill="none" stroke="#15803d" stroke-width="3" points="{_polyline(validation_f1, 40, 380, 580, 190, 1.0)}"/>
<text x="45" y="590" font-size="12">epoch 1</text><text x="565" y="590" font-size="12">epoch {len(history)}</text>
<text x="660" y="95" font-size="17" font-weight="700">Final F1 by concern</text>
<line class="axis" x1="660" y1="540" x2="1260" y2="540"/><line class="axis" x1="660" y1="370" x2="660" y2="540"/>
{''.join(bars)}{''.join(labels)}
<text x="660" y="640" font-size="12">Macro F1: {model_payload['aggregateMetrics']['macroF1']} · Macro ROC-AUC: {model_payload['aggregateMetrics']['macroRocAuc']}</text>
</svg>'''
    image_path = model_dir / "training-metrics.svg"
    image_path.write_text(svg, encoding="utf-8")
    (model_dir / "training-history.json").write_text(
        json.dumps(history, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return image_path


def main() -> int:
    args = parse_args()
    if args.epochs < 1 or args.dimension < 64:
        raise SystemExit("epochs must be >=1 and dimension must be >=64")

    chemical_symptoms = load_chemical_symptoms(args.chem_data_dir)
    products, source_files = load_products(args.scripts_dir)
    if len(products) < 50:
        raise SystemExit(f"not enough products to train: {len(products)}")

    labelled_products: list[tuple[dict[str, Any], set[str], dict[int, float]]] = []
    for product in products:
        labels = derive_weak_labels(product, chemical_symptoms)
        features = product_features(product, args.dimension)
        if features:
            labelled_products.append((product, labels, features))

    train_rows = [row for row in labelled_products if not is_validation_product(row[0])]
    validation_rows = [row for row in labelled_products if is_validation_product(row[0])]
    if not validation_rows:
        raise SystemExit("validation split is empty")

    concern_models: dict[str, Any] = {}
    for concern_index, concern in enumerate(CANONICAL_CONCERNS):
        train_samples = [(features, int(concern in labels)) for _, labels, features in train_rows]
        validation_samples = [(features, int(concern in labels)) for _, labels, features in validation_rows]
        train_positive = sum(label for _, label in train_samples)
        validation_positive = sum(label for _, label in validation_samples)
        if train_positive < 5 or validation_positive < 2:
            continue

        weights, bias, history = train_binary_model(
            train_samples,
            validation_samples,
            dimension=args.dimension,
            epochs=args.epochs,
            seed=args.seed + concern_index * 1000,
        )
        validation_pairs = [
            (predict_probability(weights, bias, features), label)
            for features, label in validation_samples
        ]
        threshold, metrics = choose_threshold(validation_pairs)
        metrics["rocAuc"] = round(roc_auc(validation_pairs), 4)
        metrics["trainPositive"] = train_positive
        metrics["validationPositive"] = validation_positive
        metrics["validationTotal"] = len(validation_samples)
        concern_models[concern] = {
            "bias": round(bias, 7),
            "weights": round_weights(weights),
            "threshold": threshold,
            "metrics": metrics,
            "history": history,
        }

    if len(concern_models) < 8:
        raise SystemExit(f"only {len(concern_models)} concern models could be trained")

    macro_f1 = sum(model["metrics"]["f1"] for model in concern_models.values()) / len(concern_models)
    macro_auc = sum(model["metrics"]["rocAuc"] for model in concern_models.values()) / len(concern_models)
    source_checksums = {path.name: file_sha256(path) for path in source_files}
    source_checksums["chem_full.csv"] = file_sha256(args.chem_data_dir / "chem_full.csv")
    source_checksums["symp_to_chem_names.csv"] = file_sha256(args.chem_data_dir / "symp_to_chem_names.csv")

    trained_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    model_payload = {
        "schemaVersion": 1,
        "modelType": "hashed-multilabel-logistic-regression",
        "modelVersion": "local-recommender-2026.07.1",
        "trainedAt": trained_at,
        "featureDimension": args.dimension,
        "seed": args.seed,
        "epochs": args.epochs,
        "trainingProducts": len(train_rows),
        "validationProducts": len(validation_rows),
        "labelType": "weak-supervision-from-ingredient-functions-and-reviewed-links",
        "limitations": [
            "Label training bersifat weak supervision, bukan outcome klinis atau feedback dokter.",
            "Confidence model dibatasi maksimum medium sampai tersedia human-reviewed evaluation set.",
            "Harga produk INCIDecoder tidak tersedia dan tidak diprediksi oleh model.",
        ],
        "aggregateMetrics": {
            "macroF1": round(macro_f1, 4),
            "macroRocAuc": round(macro_auc, 4),
        },
        "trainingHistory": aggregate_history(concern_models, args.epochs),
        "sourceChecksums": source_checksums,
        "concerns": concern_models,
    }

    catalog_payload = {
        "schemaVersion": 1,
        "catalogVersion": "incidecoder-local-2026.07.1",
        "generatedAt": trained_at,
        "source": "Local repository fixtures originally collected from INCIDecoder",
        "limitations": [
            "Data katalog bukan verifikasi BPOM dan bukan ground truth klinis.",
            "Harga tidak tersedia; tautan sumber hanya untuk provenance.",
        ],
        "products": products,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.catalog_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    args.catalog_output.write_text(json.dumps(catalog_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    image_path = write_training_images(model_payload, args.images_dir)

    print(
        json.dumps(
            {
                "model": str(args.output),
                "catalog": str(args.catalog_output),
                "trainingImage": str(image_path),
                "products": len(products),
                "train": len(train_rows),
                "validation": len(validation_rows),
                "concerns": len(concern_models),
                "macroF1": round(macro_f1, 4),
                "macroRocAuc": round(macro_auc, 4),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
