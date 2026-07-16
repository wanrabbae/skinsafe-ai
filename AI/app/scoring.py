"""Scoring and analysis orchestrator — enriched with the Core Engine.

This module retains the original deterministic baseline analysis
(overclaim detection, prohibited ingredient gates, weighted scoring)
while now also leveraging the Core Engine for:

- **Ingredient resolution** against the chemical knowledge base (fuzzy matching)
- **Per-ingredient safety analysis** (benefits, cautions, risk levels)
- **Skin compatibility scoring** (data-driven, not hardcoded)
- **Routine conflict detection** (incompatible combinations, MVP codes)
- **Enriched response** with ingredient_details and interaction_warnings
"""

from __future__ import annotations

import re

from .data_loader import get_store
from .engine import (
    IngredientAnalyzer,
    IngredientReport,
    RoutineConflictEngine,
    SkinCompatibilityEngine,
)
from .normalizer import IngredientNormalizer
from .schemas import (
    AnalysisRequest,
    CompletedAnalysis,
    Confidence,
    Finding,
    IngredientDetail,
    InteractionWarning,
    NeedsInputAnalysis,
    ProductSnapshot,
    Report,
    Versions,
)

# ---------------------------------------------------------------------------
# Constants (preserved from original)
# ---------------------------------------------------------------------------

OVERCLAIM_PATTERNS = {
    "medical_claim": re.compile(r"\b(menyembuhkan|mengobati|cure)\b", re.I),
    "instant_result": re.compile(r"\b(instan|instant|semalam|1 malam)\b", re.I),
    "absolute_claim": re.compile(r"\b(100%|pasti|tanpa efek samping)\b", re.I),
}
PROHIBITED = {"mercury", "merkuri", "hydroquinone"}
STRONG_ACTIVES = {"retinol", "retinoic acid", "salicylic acid", "glycolic acid"}

# ---------------------------------------------------------------------------
# Engine singletons — initialized lazily on first analyze() call
# ---------------------------------------------------------------------------

_normalizer: IngredientNormalizer | None = None
_analyzer: IngredientAnalyzer | None = None
_compat_engine: SkinCompatibilityEngine | None = None
_conflict_engine: RoutineConflictEngine | None = None


def _get_engines() -> tuple[IngredientNormalizer, IngredientAnalyzer, SkinCompatibilityEngine, RoutineConflictEngine]:
    """Return (or lazily create) the engine singletons."""
    global _normalizer, _analyzer, _compat_engine, _conflict_engine  # noqa: PLW0603
    if _normalizer is None:
        store = get_store()
        _normalizer = IngredientNormalizer(store=store)
        _analyzer = IngredientAnalyzer(store=store)
        _compat_engine = SkinCompatibilityEngine()
        _conflict_engine = RoutineConflictEngine()
    assert _normalizer is not None
    assert _analyzer is not None
    assert _compat_engine is not None
    assert _conflict_engine is not None
    return _normalizer, _analyzer, _compat_engine, _conflict_engine


# ---------------------------------------------------------------------------
# Public helpers (preserved from original)
# ---------------------------------------------------------------------------


def versions() -> Versions:
    return Versions(engine="0.2.0", ruleset="2026.07.1", ingredient_dataset="seed-2026.07.1", bpom_dataset="mock-2026.07.1")


def normalize_ingredients(raw: str) -> list[str]:
    return [item.strip().lower() for item in re.split(r"[,;]", raw) if item.strip()]


def band(score: int) -> str:
    if score >= 85: return "recommended"
    if score >= 70: return "generally_ok"
    if score >= 50: return "use_with_caution"
    if score >= 30: return "high_caution"
    return "avoid"


# ---------------------------------------------------------------------------
# Core analysis function — enriched with engine data
# ---------------------------------------------------------------------------


def analyze(request: AnalysisRequest) -> CompletedAnalysis | NeedsInputAnalysis:
    """Run the full analysis pipeline.

    This function preserves the original deterministic baseline while
    enriching results with data from the Core Engine knowledge base.
    """
    raw = (request.input.ingredients_text or "").strip()
    if not raw:
        return NeedsInputAnalysis(
            scan_id=request.scan_id,
            missing_fields=["ingredientsText"],
            instructions=["Isi daftar bahan atau unggah foto label yang lebih jelas."],
            versions=versions(),
        )

    # --- Stage 3: Normalization (original) ---
    ingredients = normalize_ingredients(raw)

    # --- Core Engine: Resolve & analyze ingredients ---
    normalizer, analyzer, compat_engine, conflict_engine = _get_engines()

    resolved_list = normalizer.resolve_list(ingredients)
    reports = analyzer.analyze_list(
        resolved_list,
        user_skin_type=request.profile.skin_type,
        user_concerns=request.profile.concerns,
    )

    # --- Original deterministic checks (preserved) ---
    findings: list[Finding] = []
    applied_gates: list[str] = []
    prohibited = sorted(PROHIBITED.intersection(ingredients))
    strong = sorted(STRONG_ACTIVES.intersection(ingredients))

    if prohibited:
        findings.append(Finding(
            code="PROHIBITED_INGREDIENT",
            severity="critical",
            message="Terdeteksi bahan berisiko tinggi pada seed ruleset.",
            evidence=prohibited,
        ))
        applied_gates.append("prohibited_ingredient_avoid")

    # --- Overclaim detection (preserved) ---
    claims = [value.strip() for value in re.split(r"[\n;]", request.input.claims_text or "") if value.strip()]
    overclaim_hits = [code for code, pattern in OVERCLAIM_PATTERNS.items() if pattern.search(request.input.claims_text or "")]
    for code in overclaim_hits:
        findings.append(Finding(
            code=code.upper(),
            severity="high",
            message="Klaim perlu diverifikasi dan tidak boleh dianggap sebagai hasil pasti.",
            evidence=claims,
        ))

    # --- Engine-enriched findings ---
    sensitive_context = request.profile.sensitivity_level == "high" or "damaged_barrier" in request.profile.conditions

    # Add findings from ingredient analysis
    for report in reports:
        if report.risk_level == "high_risk":
            findings.append(Finding(
                code="HIGH_RISK_INGREDIENT",
                severity="critical",
                message=f"{report.name}: bahan berisiko tinggi. {report.caution_notes}",
                evidence=[report.name],
            ))
        elif report.risk_level == "caution" and sensitive_context:
            findings.append(Finding(
                code="CAUTION_INGREDIENT_SENSITIVE",
                severity="caution",
                message=f"{report.name}: memerlukan perhatian pada kulit sensitif. {report.caution_notes}",
                evidence=[report.name],
            ))

    # Strong active + sensitive context (preserved with engine awareness)
    if strong and sensitive_context:
        findings.append(Finding(
            code="STRONG_ACTIVE_SENSITIVE_CONTEXT",
            severity="caution",
            message="Strong active memerlukan perhatian pada kulit sensitif atau skin barrier yang terganggu.",
            evidence=strong,
        ))

    # --- Sub-score computation (enriched) ---

    # BPOM trust (preserved — still mock-based)
    bpom = 30 if request.input.bpom_number else 20

    # Ingredient safety — now data-driven
    high_risk_count = sum(1 for r in reports if r.risk_level == "high_risk")
    caution_count = sum(1 for r in reports if r.risk_level == "caution")
    beneficial_count = sum(1 for r in reports if r.risk_level == "beneficial")
    # Prohibited still hard-penalize
    ingredient = max(0, 100 - len(prohibited) * 100 - high_risk_count * 30 - caution_count * 10 + beneficial_count * 3)
    ingredient = min(100, ingredient)

    # Overclaim (preserved)
    overclaim_raw = min(100, len(overclaim_hits) * 30)

    # Skin compatibility — now engine-driven
    compat_result = compat_engine.evaluate(
        reports,
        skin_type=request.profile.skin_type,
        sensitivity_level=request.profile.sensitivity_level,
        conditions=request.profile.conditions,
    )
    compatibility = compat_result.score

    # Routine conflict — now engine-driven
    routine_actives: list[str] = []
    for item in request.profile.current_routine:
        routine_actives.extend(item.active_ingredients)

    conflict_result = conflict_engine.detect(
        reports,
        routine_ingredients=routine_actives,
        conditions=request.profile.conditions,
    )
    routine_raw = conflict_result.score

    # Add conflict findings
    for conflict in conflict_result.conflicts:
        findings.append(Finding(
            code=conflict.code,
            severity=conflict.severity,
            message=conflict.message,
            evidence=conflict.involved_ingredients,
        ))

    # Confidence — enriched with resolution coverage
    base_confidence = 85 if request.input.method == "manual" else 65
    resolved_count = sum(1 for r in resolved_list if r.canonical_name is not None)
    total_count = len(resolved_list)
    resolution_ratio = resolved_count / total_count if total_count > 0 else 0
    # Resolution coverage factor (30% of confidence per docs)
    coverage_adjustment = int((resolution_ratio - 0.7) * 30)  # baseline at 70% coverage
    confidence_score = max(0, min(100, base_confidence + coverage_adjustment))

    # --- Weighted overall score (formula from docs) ---
    overall = round(
        0.25 * bpom
        + 0.25 * ingredient
        + 0.20 * (100 - overclaim_raw)
        + 0.15 * compatibility
        + 0.10 * (100 - routine_raw)
        + 0.05 * confidence_score,
    )
    status = band(overall)

    # --- Hard safety gates (preserved) ---
    if prohibited:
        status = "avoid"
        overall = min(overall, 29)

    # --- Build enriched response ---
    confidence_level = "high" if confidence_score >= 85 else "medium" if confidence_score >= 60 else "low"
    recommendation = (
        "Hindari produk dan verifikasi bahan serta status regulasinya."
        if status == "avoid"
        else "Tinjau temuan dan lakukan patch test sebelum menambahkan produk ke rutinitas."
    )

    # Build ingredient details from engine reports
    ingredient_details = [
        IngredientDetail(
            name=report.name,
            canonical_name=report.resolved.canonical_name,
            match_confidence=report.resolved.confidence,
            match_type=report.resolved.match_type,
            chemical_type=report.type_category if report.type_category != "unknown" else None,
            risk_level=report.risk_level,
            benefits_summary=report.benefits_summary or None,
            relevant_symptoms=report.relevant_symptoms,
            compatibility_notes=report.compatibility_notes or None,
            caution_notes=report.caution_notes or None,
            usage_frequency=report.usage_frequency or None,
        )
        for report in reports
    ]

    # Build interaction warnings from conflict engine
    interaction_warnings = [
        InteractionWarning(
            code=c.code,
            severity=c.severity,
            message=c.message,
            involved_ingredients=c.involved_ingredients,
        )
        for c in conflict_result.conflicts
    ]

    return CompletedAnalysis(
        scan_id=request.scan_id,
        product=ProductSnapshot(
            bpom_number=request.input.bpom_number,
            claims=claims,
            ingredients_raw=raw,
            ingredients=ingredients,
        ),
        report=Report(
            overall_score=overall,
            status=status,
            confidence=Confidence(
                level=confidence_level,
                score=confidence_score,
                limitations=["BPOM memakai mock dataset dan belum diverifikasi live."],
            ),
            sub_scores={
                "bpomTrust": bpom,
                "ingredientSafety": ingredient,
                "overclaimRaw": overclaim_raw,
                "skinCompatibility": compatibility,
                "routineConflictRaw": routine_raw,
                "dataConfidence": confidence_score,
            },
            findings=findings,
            applied_gates=applied_gates,
            recommendation=recommendation,
            ingredient_details=ingredient_details,
            interaction_warnings=interaction_warnings,
        ),
        versions=versions(),
    )
