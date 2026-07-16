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
