"""Deterministic Indonesian skin-profile intake for narrative and A-D answers."""

from __future__ import annotations

import re
from collections.abc import Iterable

from .ml_features import canonicalize_concerns, normalize_text
from .schemas import (
    Confidence,
    ProfileIntakeRequest,
    ProfileIntakeResult,
    ProfileRedFlag,
    QuestionnaireOption,
    QuestionnaireQuestion,
    QuestionnaireResponse,
    ResolvedSkinProfile,
)


QUESTIONNAIRE_VERSION = "2026.07.1"
QUESTIONNAIRE = QuestionnaireResponse(
    version=QUESTIONNAIRE_VERSION,
    questions=[
        QuestionnaireQuestion(
            id="skin_feel",
            prompt="Dua jam setelah membersihkan wajah, kulitmu biasanya bagaimana?",
            options=[
                QuestionnaireOption(value="A", label="Kering", description="Terasa tertarik, kasar, atau mengelupas."),
                QuestionnaireOption(value="B", label="Normal", description="Terasa nyaman dan tidak terlalu berminyak."),
                QuestionnaireOption(value="C", label="Berminyak", description="Cepat mengilap di hampir seluruh wajah."),
                QuestionnaireOption(value="D", label="Kombinasi", description="T-zone berminyak tetapi pipi normal atau kering."),
            ],
        ),
        QuestionnaireQuestion(
            id="reactivity",
            prompt="Seberapa sering kulit bereaksi terhadap produk baru?",
            options=[
                QuestionnaireOption(value="A", label="Jarang", description="Hampir tidak pernah perih, gatal, atau merah."),
                QuestionnaireOption(value="B", label="Kadang", description="Sesekali bereaksi pada active atau fragrance."),
                QuestionnaireOption(value="C", label="Sering", description="Mudah perih, gatal, atau memerah."),
                QuestionnaireOption(value="D", label="Barrier terganggu", description="Saat ini perih, sangat kering, atau mengelupas."),
            ],
        ),
        QuestionnaireQuestion(
            id="primary_concern",
            prompt="Masalah kulit yang paling ingin kamu tangani dulu?",
            options=[
                QuestionnaireOption(value="A", label="Jerawat", description="Komedo, breakout, atau jerawat aktif."),
                QuestionnaireOption(value="B", label="Kering/dehidrasi", description="Kurang lembap, kasar, atau terasa tertarik."),
                QuestionnaireOption(value="C", label="Kemerahan", description="Mudah merah, tidak nyaman, atau iritasi."),
                QuestionnaireOption(value="D", label="Kusam/noda", description="Kusam, noda hitam, atau warna tidak merata."),
            ],
        ),
        QuestionnaireQuestion(
            id="safety_status",
            prompt="Pilih status yang penting untuk filter keamanan bahan.",
            options=[
                QuestionnaireOption(value="A", label="Tidak hamil/menyusui", description="Tidak sedang hamil atau menyusui."),
                QuestionnaireOption(value="B", label="Hamil", description="Sedang hamil."),
                QuestionnaireOption(value="C", label="Menyusui", description="Sedang menyusui."),
                QuestionnaireOption(value="D", label="Belum ingin menjawab", description="Rekomendasi ditunda sampai status dikonfirmasi."),
            ],
        ),
    ],
)

_NEGATIONS = {"tidak", "bukan", "enggak", "nggak", "ga", "gak", "tanpa", "belum"}
_SKIN_PHRASES = {
    "combination": ("kulit kombinasi", "kombinasi", "t zone berminyak", "tzone berminyak", "pipi kering tapi", "berminyak di t zone"),
    "dry": ("kulit kering", "kering", "terasa tertarik", "terasa ketarik", "mudah mengelupas"),
    "oily": ("kulit berminyak", "berminyak", "cepat berminyak", "mudah berminyak", "seluruh wajah mengilap"),
    "normal": ("kulit normal", "kulit seimbang"),
}
_SENSITIVITY_PHRASES = ("kulit sensitif", "mudah iritasi", "mudah perih", "mudah gatal", "mudah merah")
_CONCERN_PHRASES = {
    "acne": ("jerawat", "jerawatan", "komedo", "breakout", "acne"),
    "aging": ("kerutan", "garis halus", "anti aging", "aging"),
    "discomfort": ("iritasi", "perih", "gatal", "tidak nyaman"),
    "dryness": ("kulit kering", "kering", "dehidrasi", "mengelupas", "terasa tertarik"),
    "dullness": ("kusam",),
    "exfoliator/cleanser": ("butuh exfoliasi", "butuh eksfoliasi", "mencari cleanser", "mencari pembersih"),
    "hydrating": ("kurang lembap", "kurang lembab", "butuh hidrasi", "butuh kelembapan"),
    "oiliness": ("berminyak", "minyak berlebih", "sebum"),
    "redness": ("kemerahan", "mudah merah", "merah"),
    "rough": ("tekstur kasar", "kulit kasar", "tekstur tidak rata"),
    "sun protectant": ("sunscreen", "tabir surya", "perlindungan uv", "spf"),
    "uneven skintone": ("noda hitam", "flek", "warna kulit tidak merata", "hyperpigmentation"),
}
_CONDITION_PHRASES = {
    "damaged_barrier": ("barrier rusak", "barrier terganggu", "skin barrier rusak", "over exfoliation"),
    "eczema": ("eksim", "eczema"),
    "rosacea": ("rosacea",),
}
_ACTIVE_PHRASES = {
    "retinol": ("retinol", "retinal", "retinoid"),
    "tretinoin": ("tretinoin",),
    "adapalene": ("adapalene",),
    "salicylic acid": ("salicylic acid", "bha"),
    "glycolic acid": ("glycolic acid", "aha"),
    "lactic acid": ("lactic acid",),
    "benzoyl peroxide": ("benzoyl peroxide",),
    "ascorbic acid": ("vitamin c", "ascorbic acid"),
    "niacinamide": ("niacinamide",),
}
_RED_FLAGS = (
    ("BREATHING_OR_FACIAL_SWELLING", ("sesak napas", "sulit bernapas", "bibir bengkak", "wajah bengkak", "mata bengkak"), "Cari pertolongan medis darurat sekarang."),
    ("SEVERE_SKIN_REACTION", ("kulit melepuh", "luka terbuka", "bernanah", "pendarahan", "nyeri hebat"), "Hentikan produk yang dicurigai dan segera hubungi tenaga medis."),
)


def questionnaire() -> QuestionnaireResponse:
    return QUESTIONNAIRE


def _has_phrase(text: str, phrase: str) -> bool:
    for match in re.finditer(rf"(?<!\w){re.escape(phrase)}(?!\w)", text):
        prior_words = text[: match.start()].split()[-3:]
        if not _NEGATIONS.intersection(prior_words):
            return True
    return False


def _matched_phrases(text: str, phrases: Iterable[str]) -> list[str]:
    return [phrase for phrase in phrases if _has_phrase(text, phrase)]


def _append_unique(values: list[str], additions: Iterable[str]) -> None:
    for value in additions:
        if value not in values:
            values.append(value)


def resolve_profile(request: ProfileIntakeRequest) -> ProfileIntakeResult:
    text = normalize_text(request.narrative or "")
    evidence: dict[str, list[str]] = {}
    contradictions: list[str] = []
    clarifications: list[str] = []

    answer_skin = {"A": "dry", "B": "normal", "C": "oily", "D": "combination"}.get(request.answers.get("skin_feel", ""))
    narrative_skin: str | None = None
    for skin_type, phrases in _SKIN_PHRASES.items():
        matches = _matched_phrases(text, phrases)
        if matches:
            narrative_skin = skin_type
            evidence.setdefault("skinType", []).extend(f'narasi: "{item}"' for item in matches)
            break
    if not narrative_skin and _matched_phrases(text, _SENSITIVITY_PHRASES):
        narrative_skin = "sensitive"
        evidence.setdefault("skinType", []).append("narasi menyebut kulit sensitif")
    skin_type = answer_skin or narrative_skin
    if answer_skin:
        evidence.setdefault("skinType", []).append(f"questionnaire skin_feel={request.answers['skin_feel']}")
    if answer_skin and narrative_skin and narrative_skin not in {answer_skin, "sensitive"}:
        contradictions.append(f"Tipe kulit dari questionnaire ({answer_skin}) berbeda dari narasi ({narrative_skin}).")

    reactivity = request.answers.get("reactivity")
    sensitivity_level = {"A": "low", "B": "medium", "C": "high", "D": "high"}.get(reactivity, "medium")
    sensitive_matches = _matched_phrases(text, _SENSITIVITY_PHRASES)
    if sensitive_matches:
        sensitivity_level = "high"
        evidence.setdefault("sensitivityLevel", []).extend(f'narasi: "{item}"' for item in sensitive_matches)
    elif any(_has_phrase(text, phrase) for phrase in ("tidak sensitif", "jarang iritasi", "tidak mudah iritasi")):
        sensitivity_level = "low"
        evidence.setdefault("sensitivityLevel", []).append("narasi menyatakan tidak sensitif")
    if reactivity:
        evidence.setdefault("sensitivityLevel", []).append(f"questionnaire reactivity={reactivity}")

    conditions = list(dict.fromkeys(normalize_text(item).replace(" ", "_") for item in request.conditions if item.strip()))
    for condition, phrases in _CONDITION_PHRASES.items():
        matches = _matched_phrases(text, phrases)
        if matches:
            _append_unique(conditions, [condition])
            evidence.setdefault("conditions", []).extend(f'narasi: "{item}"' for item in matches)
    if reactivity == "D":
        _append_unique(conditions, ["damaged_barrier"])
        evidence.setdefault("conditions", []).append("questionnaire reactivity=D")

    concerns, _ = canonicalize_concerns(request.selected_concerns)
    primary = request.answers.get("primary_concern")
    primary_map = {
        "A": ("acne",),
        "B": ("dryness", "hydrating"),
        "C": ("redness", "discomfort"),
        "D": ("dullness", "uneven skintone"),
    }
    if primary:
        _append_unique(concerns, primary_map[primary])
        evidence.setdefault("concerns", []).append(f"questionnaire primary_concern={primary}")
    for concern, phrases in _CONCERN_PHRASES.items():
        matches = _matched_phrases(text, phrases)
        if matches:
            _append_unique(concerns, [concern])
            evidence.setdefault("concerns", []).extend(f'narasi: "{item}"' for item in matches)

    current_ingredients = [item.strip() for item in request.current_ingredients if item.strip()]
    for active, phrases in _ACTIVE_PHRASES.items():
        matches = _matched_phrases(text, phrases)
        if matches:
            _append_unique(current_ingredients, [active])
            evidence.setdefault("currentIngredients", []).extend(f'narasi: "{item}"' for item in matches)

    answer_pregnancy = {"A": "none", "B": "pregnant", "C": "breastfeeding", "D": None}.get(request.answers.get("safety_status", ""))
    narrative_pregnancy: str | None = None
    if _has_phrase(text, "hamil") or _has_phrase(text, "sedang hamil"):
        narrative_pregnancy = "pregnant"
    elif _has_phrase(text, "menyusui") or _has_phrase(text, "sedang menyusui"):
        narrative_pregnancy = "breastfeeding"
    elif any(phrase in text for phrase in ("tidak hamil", "tidak sedang hamil", "tidak menyusui")):
        narrative_pregnancy = "none"
    pregnancy_status = request.pregnancy_status or answer_pregnancy or narrative_pregnancy
    if request.pregnancy_status:
        evidence.setdefault("pregnancyStatus", []).append("status dipilih secara eksplisit")
    elif request.answers.get("safety_status"):
        evidence.setdefault("pregnancyStatus", []).append(f"questionnaire safety_status={request.answers['safety_status']}")
    elif narrative_pregnancy:
        evidence.setdefault("pregnancyStatus", []).append("status ditemukan pada narasi")
    known_pregnancy_values = {value for value in (request.pregnancy_status, answer_pregnancy, narrative_pregnancy) if value}
    if len(known_pregnancy_values) > 1:
        contradictions.append("Status hamil/menyusui tidak konsisten antar-input.")

    red_flags: list[ProfileRedFlag] = []
    for code, phrases, action in _RED_FLAGS:
        matches = _matched_phrases(text, phrases)
        if matches:
            red_flags.append(
                ProfileRedFlag(
                    code=code,
                    message=f"Narasi menyebut gejala yang perlu evaluasi tenaga medis: {', '.join(matches)}.",
                    action=action,
                )
            )

    if skin_type is None:
        clarifications.append("Bagaimana kondisi kulitmu dua jam setelah mencuci wajah: kering, normal, berminyak, atau kombinasi?")
    if not concerns:
        clarifications.append("Masalah kulit apa yang paling ingin kamu tangani terlebih dahulu?")
    if pregnancy_status is None:
        clarifications.append("Apakah kamu sedang hamil atau menyusui? Jawaban ini diperlukan untuk filter keamanan bahan.")
    if "sensitivityLevel" not in evidence:
        clarifications.append("Apakah kulitmu sering perih, gatal, atau merah saat mencoba produk baru?")
    if contradictions:
        clarifications.append("Konfirmasi kembali jawaban yang tidak konsisten sebelum menerima rekomendasi.")

    score = 0
    score += 25 if skin_type else 0
    score += 15 if "sensitivityLevel" in evidence else 5
    score += 25 if concerns else 0
    score += 25 if pregnancy_status else 0
    score += 10 if current_ingredients else 0
    score -= 20 * len(contradictions)
    score -= 50 if red_flags else 0
    score = max(0, min(100, score))
    level = "high" if score >= 80 else "medium" if score >= 55 else "low"
    can_recommend = bool(skin_type and concerns and pregnancy_status) and not contradictions and not red_flags

    return ProfileIntakeResult(
        profile=ResolvedSkinProfile(
            skin_type=skin_type,
            sensitivity_level=sensitivity_level,
            conditions=conditions,
            concerns=concerns,
            pregnancy_status=pregnancy_status,
            current_ingredients=current_ingredients,
        ),
        confidence=Confidence(
            level=level,
            score=score,
            limitations=["Profil diinterpretasikan secara lokal dari jawaban user dan bukan diagnosis medis."],
        ),
        field_evidence=evidence,
        contradictions=contradictions,
        clarification_questions=clarifications,
        red_flags=red_flags,
        can_recommend=can_recommend,
    )
