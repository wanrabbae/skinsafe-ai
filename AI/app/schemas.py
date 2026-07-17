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
    kind: Literal["generic", "personalized"] = "generic"
    why_asked: str | None = None


class QuestionnaireResponse(Schema):
    version: str
    questions: list[QuestionnaireQuestion]
    mode: Literal["generic", "personalized"] = "generic"


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
        supported_questions = {
            "skin_feel",
            "reactivity",
            "primary_concern",
            "concern_duration",
            "concern_severity",
            "barrier_status",
            "routine_complexity",
            "active_usage",
            "environment",
            "safety_status",
        }
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
    concern_duration: Literal["recent", "persistent", "long_term"] | None = None
    concern_severity: Literal["mild", "moderate", "high"] | None = None
    routine_complexity: Literal["none", "basic", "active", "complex"] | None = None
    environmental_factors: list[str] = Field(default_factory=list)
    product_preferences: list[str] = Field(default_factory=list)
    avoid_ingredients: list[str] = Field(default_factory=list)
    excluded_products: list[str] = Field(default_factory=list)
    successful_products: list[str] = Field(default_factory=list)
    context_signals: dict[str, str] = Field(default_factory=dict)
    feedback_count: int = Field(default=0, ge=0)


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


PERSONALIZATION_QUESTION_IDS = (
    "concern_area",
    "concern_frequency",
    "concern_trigger",
    "reaction_onset",
    "reaction_symptoms",
    "recovery_time",
    "cleanser_afterfeel",
    "midday_skin",
    "moisturizer_texture",
    "fragrance_tolerance",
    "sunscreen_tolerance",
    "active_frequency",
    "exfoliant_use",
    "retinoid_use",
    "routine_layers",
    "routine_consistency",
    "climate_exposure",
    "sleep_stress",
    "desired_pace",
    "patch_test",
)


class ProfilePersonalizationRequest(Schema):
    profile: ResolvedSkinProfile
    answers: dict[str, QuestionChoice] = Field(default_factory=dict, max_length=20)

    @model_validator(mode="after")
    def validate_answers(self) -> "ProfilePersonalizationRequest":
        unknown = sorted(set(self.answers) - set(PERSONALIZATION_QUESTION_IDS))
        if unknown:
            raise ValueError(f"unknown personalization answers: {', '.join(unknown)}")
        return self


class ProfilePersonalizationResponse(Schema):
    version: str
    profile: ResolvedSkinProfile
    questions: list[QuestionnaireQuestion]
    answered_count: int = Field(ge=0, le=20)
    total_questions: int = 20
    completed: bool
    profile_updates: list[str] = Field(default_factory=list)


class AnalysisInput(Schema):
    method: Literal["manual", "camera", "screenshot", "packaging_photo", "ingredient_photo"]
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
    irritancy: int | None = None
    comedogenicity: int | None = None
    functions: list[str] = []
    rating: str | None = None


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
    avoid_ingredients: list[str] = Field(default_factory=list, max_length=30)
    excluded_products: list[str] = Field(default_factory=list, max_length=50)
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


class FeedbackProduct(Schema):
    name: str = Field(min_length=1, max_length=300)
    brand: str = Field(min_length=1, max_length=200)
    matching_chemicals: list[str] = Field(default_factory=list, max_length=30)
    model_version: str | None = None


class ProductFeedbackRequest(Schema):
    profile: ResolvedSkinProfile
    product: FeedbackProduct
    outcome: Literal["improved", "no_change", "worsened", "reaction"]
    usage_days: int = Field(ge=1, le=730)
    reaction_severity: Literal["none", "mild", "moderate", "severe"] = "none"
    suspected_ingredients: list[str] = Field(default_factory=list, max_length=12)
    consent_to_learning: bool = False

    @model_validator(mode="after")
    def validate_reaction_context(self) -> "ProductFeedbackRequest":
        if self.reaction_severity != "none" and self.outcome not in {"worsened", "reaction"}:
            raise ValueError("reactionSeverity requires a worsened or reaction outcome")
        return self


class FeedbackLearningSignal(Schema):
    schema_version: str
    outcome: Literal["improved", "no_change", "worsened", "reaction"]
    usage_days: int
    reaction_severity: Literal["none", "mild", "moderate", "severe"]
    product_name: str
    product_brand: str
    matching_chemicals: list[str] = Field(default_factory=list)
    model_version: str | None = None
    skin_type: str | None = None
    concerns: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    eligible_for_offline_training: bool = False


class ProductFeedbackResponse(Schema):
    profile: ResolvedSkinProfile
    action: Literal["continue", "monitor", "stop", "stop_and_seek_care"]
    profile_updates: list[str] = Field(default_factory=list)
    safety_message: str | None = None
    learning_signal: FeedbackLearningSignal | None = None
    disclaimer: str = "Feedback memperbarui konteks personal, bukan diagnosis atau training model global secara langsung."


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
