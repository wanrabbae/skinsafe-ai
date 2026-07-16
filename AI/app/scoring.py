import re

from .schemas import AnalysisRequest, CompletedAnalysis, Confidence, Finding, NeedsInputAnalysis, ProductSnapshot, Report, Versions

OVERCLAIM_PATTERNS = {
    "medical_claim": re.compile(r"\b(menyembuhkan|mengobati|cure)\b", re.I),
    "instant_result": re.compile(r"\b(instan|instant|semalam|1 malam)\b", re.I),
    "absolute_claim": re.compile(r"\b(100%|pasti|tanpa efek samping)\b", re.I),
}
PROHIBITED = {"mercury", "merkuri", "hydroquinone"}
STRONG_ACTIVES = {"retinol", "retinoic acid", "salicylic acid", "glycolic acid"}


def versions() -> Versions:
    return Versions(engine="0.1.0", ruleset="2026.07.1", ingredient_dataset="seed-2026.07.1", bpom_dataset="mock-2026.07.1")


def normalize_ingredients(raw: str) -> list[str]:
    return [item.strip().lower() for item in re.split(r"[,;]", raw) if item.strip()]


def band(score: int) -> str:
    if score >= 85: return "recommended"
    if score >= 70: return "generally_ok"
    if score >= 50: return "use_with_caution"
    if score >= 30: return "high_caution"
    return "avoid"


def analyze(request: AnalysisRequest) -> CompletedAnalysis | NeedsInputAnalysis:
    raw = (request.input.ingredients_text or "").strip()
    if not raw:
        return NeedsInputAnalysis(scan_id=request.scan_id, missing_fields=["ingredientsText"], instructions=["Isi daftar bahan atau unggah foto label yang lebih jelas."], versions=versions())

    ingredients = normalize_ingredients(raw)
    findings: list[Finding] = []
    applied_gates: list[str] = []
    prohibited = sorted(PROHIBITED.intersection(ingredients))
    strong = sorted(STRONG_ACTIVES.intersection(ingredients))

    if prohibited:
        findings.append(Finding(code="PROHIBITED_INGREDIENT", severity="critical", message="Terdeteksi bahan berisiko tinggi pada seed ruleset.", evidence=prohibited))
        applied_gates.append("prohibited_ingredient_avoid")

    claims = [value.strip() for value in re.split(r"[\n;]", request.input.claims_text or "") if value.strip()]
    overclaim_hits = [code for code, pattern in OVERCLAIM_PATTERNS.items() if pattern.search(request.input.claims_text or "")]
    for code in overclaim_hits:
        findings.append(Finding(code=code.upper(), severity="high", message="Klaim perlu diverifikasi dan tidak boleh dianggap sebagai hasil pasti.", evidence=claims))

    sensitive_context = request.profile.sensitivity_level == "high" or "damaged_barrier" in request.profile.conditions
    if strong and sensitive_context:
        findings.append(Finding(code="STRONG_ACTIVE_SENSITIVE_CONTEXT", severity="caution", message="Strong active memerlukan perhatian pada kulit sensitif atau skin barrier yang terganggu.", evidence=strong))

    bpom = 30 if request.input.bpom_number else 20
    ingredient = max(0, 100 - len(prohibited) * 100 - len(strong) * (15 if sensitive_context else 5))
    overclaim_raw = min(100, len(overclaim_hits) * 30)
    compatibility = 55 if strong and sensitive_context else 85
    routine_raw = 0
    confidence_score = 85 if request.input.method == "manual" else 65
    overall = round(.25 * bpom + .25 * ingredient + .20 * (100 - overclaim_raw) + .15 * compatibility + .10 * (100 - routine_raw) + .05 * confidence_score)
    status = band(overall)
    if prohibited:
        status = "avoid"
        overall = min(overall, 29)

    confidence_level = "high" if confidence_score >= 85 else "medium" if confidence_score >= 60 else "low"
    recommendation = "Hindari produk dan verifikasi bahan serta status regulasinya." if status == "avoid" else "Tinjau temuan dan lakukan patch test sebelum menambahkan produk ke rutinitas."

    return CompletedAnalysis(
        scan_id=request.scan_id,
        product=ProductSnapshot(bpom_number=request.input.bpom_number, claims=claims, ingredients_raw=raw, ingredients=ingredients),
        report=Report(
            overall_score=overall,
            status=status,
            confidence=Confidence(level=confidence_level, score=confidence_score, limitations=["BPOM memakai mock dataset dan belum diverifikasi live."]),
            sub_scores={"bpomTrust": bpom, "ingredientSafety": ingredient, "overclaimRaw": overclaim_raw, "skinCompatibility": compatibility, "routineConflictRaw": routine_raw, "dataConfidence": confidence_score},
            findings=findings,
            applied_gates=applied_gates,
            recommendation=recommendation,
        ),
        versions=versions(),
    )
