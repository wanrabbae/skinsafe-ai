"""Shared feature engineering for the local SkinSafe recommendation model.

The module intentionally uses only the Python standard library.  Training and
inference import the same functions, which prevents feature skew and keeps the
service independent from an external model or API provider.
"""

from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from collections import Counter
from collections.abc import Iterable, Mapping
from typing import Any


CANONICAL_CONCERNS = (
    "acne",
    "aging",
    "discomfort",
    "dryness",
    "dullness",
    "exfoliator/cleanser",
    "hydrating",
    "oiliness",
    "redness",
    "rough",
    "sun protectant",
    "uneven skintone",
)

CONCERN_ALIASES: dict[str, str] = {
    "acne": "acne",
    "jerawat": "acne",
    "breakout": "acne",
    "aging": "aging",
    "anti aging": "aging",
    "anti-aging": "aging",
    "wrinkle": "aging",
    "wrinkles": "aging",
    "kerutan": "aging",
    "garis halus": "aging",
    "discomfort": "discomfort",
    "irritation": "discomfort",
    "iritasi": "discomfort",
    "sensitivity": "discomfort",
    "sensitif": "discomfort",
    "dryness": "dryness",
    "dry": "dryness",
    "kulit kering": "dryness",
    "dehydrated": "dryness",
    "dehidrasi": "dryness",
    "dullness": "dullness",
    "dull": "dullness",
    "kusam": "dullness",
    "exfoliator cleanser": "exfoliator/cleanser",
    "exfoliator/cleanser": "exfoliator/cleanser",
    "cleanser": "exfoliator/cleanser",
    "pembersih": "exfoliator/cleanser",
    "eksfoliasi": "exfoliator/cleanser",
    "hydrating": "hydrating",
    "hydration": "hydrating",
    "hidrasi": "hydrating",
    "kelembapan": "hydrating",
    "oiliness": "oiliness",
    "oily": "oiliness",
    "berminyak": "oiliness",
    "sebum": "oiliness",
    "redness": "redness",
    "kemerahan": "redness",
    "rough": "rough",
    "texture": "rough",
    "tekstur": "rough",
    "kasar": "rough",
    "sun protectant": "sun protectant",
    "sun-protectant": "sun protectant",
    "sunscreen": "sun protectant",
    "spf": "sun protectant",
    "uv": "sun protectant",
    "tabir surya": "sun protectant",
    "uneven skintone": "uneven skintone",
    "uneven skin tone": "uneven skintone",
    "hyperpigmentation": "uneven skintone",
    "dark spots": "uneven skintone",
    "noda hitam": "uneven skintone",
    "warna kulit tidak merata": "uneven skintone",
}


# These mappings generate weak labels for training only.  They are deliberately
# conservative: a product is not labelled for a concern from vague marketing
# words.  The trained model therefore learns ingredient/function associations,
# while final health-safety decisions remain in deterministic rules.
FUNCTION_TO_CONCERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("anti acne", ("acne",)),
    ("antimicrobial", ("acne",)),
    ("antibacterial", ("acne",)),
    ("moisturizer", ("dryness", "hydrating")),
    ("humectant", ("dryness", "hydrating")),
    ("emollient", ("dryness", "hydrating")),
    ("skin identical ingredient", ("dryness", "hydrating")),
    ("soothing", ("discomfort", "redness")),
    ("skin brightening", ("dullness", "uneven skintone")),
    ("antioxidant", ("dullness",)),
    ("cell communicating ingredient", ("aging",)),
    ("sunscreen", ("sun protectant",)),
    ("exfoliant", ("exfoliator/cleanser", "rough")),
    ("abrasive scrub", ("exfoliator/cleanser", "rough")),
    ("surfactant cleansing", ("exfoliator/cleanser",)),
)

PRODUCT_NAME_TO_CONCERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("acne", ("acne",)),
    ("blemish", ("acne",)),
    ("anti aging", ("aging",)),
    ("anti ageing", ("aging",)),
    ("wrinkle", ("aging",)),
    ("retinol", ("aging",)),
    ("firm", ("aging",)),
    ("lift", ("aging",)),
    ("youth", ("aging",)),
    ("hydrating", ("hydrating", "dryness")),
    ("hydration", ("hydrating", "dryness")),
    ("moistur", ("hydrating", "dryness")),
    ("bright", ("dullness", "uneven skintone")),
    ("dark spot", ("uneven skintone",)),
    ("sunscreen", ("sun protectant",)),
    ("spf", ("sun protectant",)),
    ("cleanser", ("exfoliator/cleanser",)),
    ("cleansing", ("exfoliator/cleanser",)),
    ("face wash", ("exfoliator/cleanser",)),
    ("micellar", ("exfoliator/cleanser",)),
    ("exfoliat", ("exfoliator/cleanser", "rough")),
    ("peel", ("exfoliator/cleanser", "rough")),
    ("calming", ("discomfort", "redness")),
    ("soothing", ("discomfort", "redness")),
    ("oil control", ("oiliness",)),
    ("sebum", ("oiliness",)),
)


_NON_WORD_RE = re.compile(r"[^a-z0-9%+]+")
_PAREN_RE = re.compile(r"\s*\([^)]*\)\s*")


def normalize_text(value: str) -> str:
    """Normalize human text into a stable matching/tokenization form."""
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("\u200b", " ").replace("_", " ").replace("-", " ")
    return _NON_WORD_RE.sub(" ", value.lower()).strip()


def normalize_ingredient_name(value: str) -> str:
    """Normalize an ingredient name without inventing an alias."""
    return normalize_text(_PAREN_RE.sub(" ", value or ""))


def canonicalize_concern(value: str) -> str | None:
    normalized = normalize_text(value)
    return CONCERN_ALIASES.get(normalized)


def canonicalize_concerns(values: Iterable[str]) -> tuple[list[str], list[str]]:
    supported: list[str] = []
    unsupported: list[str] = []
    for value in values:
        concern = canonicalize_concern(value)
        if concern is None:
            if value not in unsupported:
                unsupported.append(value)
        elif concern not in supported:
            supported.append(concern)
    return supported, unsupported


def concerns_from_functions(functions: Iterable[str]) -> set[str]:
    labels: set[str] = set()
    normalized_functions = [normalize_text(item) for item in functions]
    for function in normalized_functions:
        for phrase, concerns in FUNCTION_TO_CONCERNS:
            if phrase in function:
                labels.update(concerns)
    return labels


def concerns_from_product_name(value: str) -> set[str]:
    labels: set[str] = set()
    product_name = normalize_text(value)
    for phrase, concerns in PRODUCT_NAME_TO_CONCERNS:
        if phrase in product_name:
            labels.update(concerns)
    return labels


def derive_weak_labels(
    product: Mapping[str, Any],
    chemical_symptoms: Mapping[str, set[str]],
) -> set[str]:
    """Create auditable weak labels from ingredient links and function tags."""
    votes: Counter[str] = Counter()
    for ingredient in product.get("ingredients") or []:
        name = normalize_ingredient_name(str(ingredient.get("name") or ""))
        for concern in chemical_symptoms.get(name, set()):
            votes[concern] += 2
        for concern in concerns_from_functions(ingredient.get("functions") or []):
            votes[concern] += 1
    for concern in concerns_from_product_name(str(product.get("name") or "")):
        votes[concern] += 4

    thresholds = {
        "acne": 2,
        "aging": 2,
        "discomfort": 2,
        "dryness": 16,
        "dullness": 3,
        "exfoliator/cleanser": 2,
        "hydrating": 12,
        "oiliness": 1,
        "redness": 2,
        "rough": 2,
        "sun protectant": 1,
        "uneven skintone": 2,
    }
    return {
        concern
        for concern, count in votes.items()
        if concern in CANONICAL_CONCERNS and count >= thresholds[concern]
    }


def _feature_tokens(product: Mapping[str, Any]) -> list[str]:
    tokens: list[str] = []
    product_name = normalize_text(str(product.get("name") or ""))
    if product_name:
        tokens.append(f"product={product_name}")
        tokens.extend(f"product_word={word}" for word in product_name.split())
    for ingredient in product.get("ingredients") or []:
        name = normalize_ingredient_name(str(ingredient.get("name") or ""))
        if name:
            tokens.append(f"ingredient={name}")
            tokens.extend(f"ingredient_word={word}" for word in name.split())
        for function in ingredient.get("functions") or []:
            normalized_function = normalize_text(str(function))
            if normalized_function:
                tokens.append(f"function={normalized_function}")
                tokens.extend(f"function_word={word}" for word in normalized_function.split())
        rating = normalize_text(str(ingredient.get("rating") or ""))
        if rating:
            tokens.append(f"rating={rating}")

    for highlight in product.get("highlights") or []:
        normalized_highlight = normalize_text(str(highlight))
        if normalized_highlight:
            tokens.append(f"highlight={normalized_highlight}")

    return tokens


def _hash_feature(token: str, dimension: int) -> tuple[int, float]:
    digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
    value = int.from_bytes(digest, "little")
    index = value % dimension
    sign = -1.0 if value & (1 << 63) else 1.0
    return index, sign


def product_features(product: Mapping[str, Any], dimension: int) -> dict[int, float]:
    """Return an L2-normalized sparse signed-hash feature vector."""
    counts: dict[int, float] = {}
    for token in _feature_tokens(product):
        index, sign = _hash_feature(token, dimension)
        counts[index] = counts.get(index, 0.0) + sign

    if not counts:
        return {}

    values = {index: math.copysign(math.log1p(abs(value)), value) for index, value in counts.items()}
    norm = math.sqrt(sum(value * value for value in values.values())) or 1.0
    return {index: value / norm for index, value in values.items()}


def sigmoid(value: float) -> float:
    if value >= 0:
        z = math.exp(-value)
        return 1.0 / (1.0 + z)
    z = math.exp(value)
    return z / (1.0 + z)


def predict_probability(weights: list[float], bias: float, features: Mapping[int, float]) -> float:
    score = bias + sum(weights[index] * value for index, value in features.items())
    return sigmoid(score)
