from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.title() for part in rest)


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RoutineItem(Schema):
    product_name: str
    active_ingredients: list[str] = []


class SkinProfile(Schema):
    skin_type: Literal["normal", "dry", "oily", "combination", "sensitive"]
    sensitivity_level: Literal["low", "medium", "high"]
    conditions: list[str] = []
    concerns: list[str] = []
    pregnancy_status: Literal["none", "pregnant", "breastfeeding"]
    current_routine: list[RoutineItem] = []


class AnalysisInput(Schema):
    method: Literal["screenshot", "packaging_photo", "ingredient_photo", "manual"]
    image_urls: list[str] = []
    bpom_number: str | None = None
    claims_text: str | None = None
    ingredients_text: str | None = None


class AnalysisOptions(Schema):
    locale: str = "id-ID"
    include_debug: bool = False


class AnalysisRequest(Schema):
    scan_id: UUID
    input: AnalysisInput
    profile: SkinProfile
    options: AnalysisOptions = Field(default_factory=AnalysisOptions)


class Finding(Schema):
    code: str
    severity: Literal["info", "caution", "high", "critical"]
    message: str
    evidence: list[str] = []


class Confidence(Schema):
    level: Literal["high", "medium", "low"]
    score: int = Field(ge=0, le=100)
    limitations: list[str] = []


class ProductSnapshot(Schema):
    bpom_number: str | None
    claims: list[str]
    ingredients_raw: str
    ingredients: list[str]


class Report(Schema):
    overall_score: int = Field(ge=0, le=100)
    status: Literal["recommended", "generally_ok", "use_with_caution", "high_caution", "avoid"]
    confidence: Confidence
    sub_scores: dict[str, int]
    findings: list[Finding]
    applied_gates: list[str]
    recommendation: str
    disclaimer: str = "Informasi edukatif, bukan diagnosis medis."
    ingredient_details: list["IngredientDetail"] = []
    interaction_warnings: list["InteractionWarning"] = []


class Versions(Schema):
    engine: str
    ruleset: str
    ingredient_dataset: str
    bpom_dataset: str
    models: dict[str, str] = {}


class CompletedAnalysis(Schema):
    status: Literal["completed"] = "completed"
    scan_id: UUID
    product: ProductSnapshot
    report: Report
    versions: Versions


class NeedsInputAnalysis(Schema):
    status: Literal["needs_input"] = "needs_input"
    scan_id: UUID
    missing_fields: list[str]
    instructions: list[str]
    versions: Versions


# ---------------------------------------------------------------------------
# Enrichment schemas — produced by the Core Engine
# ---------------------------------------------------------------------------


class IngredientDetail(Schema):
    """Per-ingredient analysis detail attached to a completed report."""

    name: str
    canonical_name: str | None = None
    match_confidence: float = 0.0
    match_type: str = "unresolved"
    chemical_type: str | None = None
    risk_level: str = "unresolved"
    benefits_summary: str | None = None
    relevant_symptoms: list[str] = []
    compatibility_notes: str | None = None
    caution_notes: str | None = None
    usage_frequency: str | None = None


class InteractionWarning(Schema):
    """A detected conflict or interaction between ingredients."""

    code: str
    severity: str
    message: str
    involved_ingredients: list[str] = []


# ---------------------------------------------------------------------------
# Recommendation schemas
# ---------------------------------------------------------------------------


class RecommendRequest(Schema):
    """Request body for the product recommendation endpoint."""

    concerns: list[str]
    skin_type: str
    budget_max: float | None = None
    limit: int = Field(default=10, le=50)


class RecommendedProduct(Schema):
    """A single product recommendation."""

    name: str
    brand: str
    price: float
    link: str
    source: str
    matching_chemicals: list[str] = []
    matching_symptoms: list[str] = []
    relevance_score: float = 0.0


class RecommendResponse(Schema):
    """Response from the product recommendation endpoint."""

    products: list[RecommendedProduct]
    concerns_used: list[str]
    chemicals_targeted: list[str]
    total_matched: int
