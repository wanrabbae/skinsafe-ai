"""Auditable data-quality summary generated with every recommender training run."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path
from typing import Any

from app.ml_features import normalize_ingredient_name


def build_data_quality_report(products: list[dict[str, Any]], chem_data_dir: Path) -> dict[str, Any]:
    with (chem_data_dir / "chem_full.csv").open(encoding="utf-8", newline="") as handle:
        reviewed_ingredients = {
            normalize_ingredient_name(row.get("name") or "")
            for row in csv.DictReader(handle)
            if row.get("name")
        }

    ingredient_counts: Counter[str] = Counter()
    brand_counts: Counter[str] = Counter()
    for product in products:
        brand_counts[str(product.get("brand") or "unknown")] += 1
        for ingredient in product.get("ingredients") or []:
            name = normalize_ingredient_name(str(ingredient.get("name") or ""))
            if name:
                ingredient_counts[name] += 1

    known = set(ingredient_counts).intersection(reviewed_ingredients)
    known_occurrences = sum(count for name, count in ingredient_counts.items() if name in known)
    total_occurrences = sum(ingredient_counts.values())
    dominant_brand, dominant_count = brand_counts.most_common(1)[0]
    return {
        "schemaVersion": 1,
        "reviewStatus": "engineering-audit-not-clinical-validation",
        "products": len(products),
        "brands": len(brand_counts),
        "reviewedIngredientNames": len(reviewed_ingredients),
        "uniqueProductIngredientNames": len(ingredient_counts),
        "knownUniqueIngredientNames": len(known),
        "uniqueIngredientCoverage": round(len(known) / max(1, len(ingredient_counts)), 4),
        "ingredientOccurrences": total_occurrences,
        "knownIngredientOccurrences": known_occurrences,
        "ingredientOccurrenceCoverage": round(known_occurrences / max(1, total_occurrences), 4),
        "dominantBrand": {
            "name": dominant_brand,
            "products": dominant_count,
            "share": round(dominant_count / max(1, len(products)), 4),
        },
        "topBrands": [
            {"name": name, "products": count}
            for name, count in brand_counts.most_common(10)
        ],
        "topUnresolvedIngredients": [
            {"name": name, "occurrences": count}
            for name, count in ingredient_counts.most_common()
            if name not in reviewed_ingredients
        ][:50],
        "releaseWarnings": [
            "Ingredient coverage below 50%; unknown ingredients must reduce confidence."
            if len(known) / max(1, len(ingredient_counts)) < 0.5
            else "Ingredient coverage is above the initial 50% gate.",
            "A single brand exceeds 35% of the catalog; use brand-grouped evaluation and diversity limits."
            if dominant_count / max(1, len(products)) > 0.35
            else "No brand exceeds the initial 35% dominance gate.",
        ],
    }
