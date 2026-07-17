from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


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


QuestionChoice = Literal["A", "B", "C", "D"]


class QuestionnaireOption(Schema):
    value: QuestionChoice
    label: str
    description: str


class QuestionnaireQuestion(Schema):
    id: str
    prompt: str
    options: list[QuestionnaireOption]


class QuestionnaireResponse(Schema):
    version: str
    questions: list[QuestionnaireQuestion]


class ProfileIntakeRequest(Schema):
    narrative: str | None = Field(default=None, max_length=4000)
    answers: dict[str, QuestionChoice] = Field(default_factory=dict)
    selected_concerns: list[str] = Field(default_factory=list, max_length=12)
    conditions: list[str] = Field(default_factory=list, max_length=12)
    current_ingredients: list[str] = Field(default_factory=list, max_length=30)
    pregnancy_status: Literal["none", "pregnant", "breastfeeding"] | None = None
    budget_max: float | None = Field(default=None, ge=0)
    limit: int = Field(default=10, ge=1, le=20)

    @model_validator(mode="after")
    def validate_intake_source(self) -> "ProfileIntakeRequest":
        if not (self.narrative and self.narrative.strip()) and not self.answers:
            raise ValueError("narrative or questionnaire answers are required")
        supported_questions = {"skin_feel", "reactivity", "primary_concern", "safety_status"}
        unknown_questions = sorted(set(self.answers) - supported_questions)
        if unknown_questions:
            raise ValueError(f"unknown questionnaire answers: {', '.join(unknown_questions)}")
        return self


class ResolvedSkinProfile(Schema):
    skin_type: Literal["normal", "dry", "oily", "combination", "sensitive"] | None = None
    sensitivity_level: Literal["low", "medium", "high"] = "medium"
    conditions: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    pregnancy_status: Literal["none", "pregnant", "breastfeeding"] | None = None
    current_ingredients: list[str] = Field(default_factory=list)


class ProfileRedFlag(Schema):
    code: str
    message: str
    action: str


class ProfileIntakeResult(Schema):
    profile: ResolvedSkinProfile
    confidence: "Confidence"
    field_evidence: dict[str, list[str]] = Field(default_factory=dict)
    contradictions: list[str] = Field(default_factory=list)
    clarification_questions: list[str] = Field(default_factory=list)
    red_flags: list[ProfileRedFlag] = Field(default_factory=list)
    can_recommend: bool


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


class EducationItem(Schema):
    code: str
    title: str
    message: str
    evidence: list[str] = Field(default_factory=list)


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
    education: list[EducationItem] = Field(default_factory=list)


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

    concerns: list[str] = Field(min_length=1, max_length=12)
    skin_type: Literal["normal", "dry", "oily", "combination", "sensitive"]
    sensitivity_level: Literal["low", "medium", "high"] = "medium"
    conditions: list[str] = Field(default_factory=list)
    pregnancy_status: Literal["none", "pregnant", "breastfeeding"] = "none"
    current_ingredients: list[str] = Field(default_factory=list)
    budget_max: float | None = Field(default=None, ge=0)
    limit: int = Field(default=10, ge=1, le=50)


class RecommendedProduct(Schema):
    """A single product recommendation."""

    name: str
    brand: str
    price: float | None = None
    link: str
    source: str
    matching_chemicals: list[str] = []
    matching_symptoms: list[str] = []
    overall_score: float = 0.0
    relevance_score: float = 0.0
    model_score: float | None = None
    confidence: Literal["high", "medium", "low"] = "low"
    reasons: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    score_breakdown: dict[str, float] = Field(default_factory=dict)


class RecommendResponse(Schema):
    """Response from the product recommendation endpoint."""

    products: list[RecommendedProduct]
    concerns_used: list[str]
    chemicals_targeted: list[str]
    total_matched: int
    model_version: str | None = None
    scoring_version: str | None = None
    unsupported_concerns: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)


class ProfileRecommendationResponse(Schema):
    resolution: ProfileIntakeResult
    recommendations: RecommendResponse | None = None


class IngredientKnowledgeResponse(Schema):
    """Traceable ingredient literacy response for the PWA dictionary."""

    query: str
    canonical_name: str | None = None
    match_type: str
    match_confidence: float = Field(ge=0, le=1)
    category: str | None = None
    risk_level: str
    benefits: str | None = None
    cautions: str | None = None
    compatible_with: str | None = None
    usage_frequency: str | None = None
    relevant_concerns: list[str] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    dataset_version: str
    disclaimer: str = "Informasi edukatif, bukan diagnosis medis."


# ---------------------------------------------------------------------------
# BPOM search schemas
# ---------------------------------------------------------------------------


class BpomSearchItem(Schema):
    number: str | None = None
    product_name: str | None = None
    registrant: str | None = None
    status: str | None = None
    active: bool | None = None
    composition: str | None = None


class BpomSearchResponse(Schema):
    query: str
    results: list[BpomSearchItem] = Field(default_factory=list)
    configured: bool = True
    reachable: bool = True
    disclaimer: str = "Status registrasi bersumber dari registry BPOM (cekbpom)."
