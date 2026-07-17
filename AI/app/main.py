import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .schemas import (
    AnalysisRequest,
    BpomSearchItem,
    BpomSearchResponse,
    CompletedAnalysis,
    EducationItem,
    IngredientKnowledgeResponse,
    NeedsInputAnalysis,
    ProfileIntakeRequest,
    ProfileRecommendationResponse,
    QuestionnaireResponse,
    RecommendedProduct,
    RecommendRequest,
    RecommendResponse,
)
from .scoring import analyze

app = FastAPI(title="SkinSafe AI Service", version="0.3.0", docs_url="/docs", redoc_url=None)


def require_service_token(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = os.getenv("AI_SERVICE_TOKEN")
    if not expected:
        return
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service credential")


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok", "service": "skinsafe-ai"}


@app.get("/health/ready")
def ready() -> dict[str, str]:
    try:
        from .data_loader import get_store
        from .local_model import get_local_ranker

        store = get_store()
        ranker = get_local_ranker()
        if not store.chemicals or not ranker.product_count:
            raise RuntimeError("required AI datasets are empty")
    except (OSError, ValueError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI datasets or model are not ready",
        ) from exc
    return {
        "status": "ready",
        "ruleset": "2026.07.2",
        "engine": "0.3.0",
        "model": ranker.model_version,
        "scoring": ranker.scoring_version,
    }


@app.post(
    "/internal/v1/analyses",
    response_model=CompletedAnalysis | NeedsInputAnalysis,
    dependencies=[Depends(require_service_token)],
)
def create_analysis(request: AnalysisRequest) -> CompletedAnalysis | NeedsInputAnalysis:
    return analyze(request)


@app.post(
    "/internal/v1/recommendations",
    response_model=RecommendResponse,
    dependencies=[Depends(require_service_token)],
)
def create_recommendations(request: RecommendRequest) -> RecommendResponse:
    """Rank local products with trained relevance plus deterministic safety."""
    return _build_recommendations(request)


def _build_recommendations(request: RecommendRequest) -> RecommendResponse:
    from .data_loader import get_store
    from .local_model import get_local_ranker

    store = get_store()
    ranker = get_local_ranker()
    local_result = ranker.recommend(
        concerns=request.concerns,
        skin_type=request.skin_type,
        sensitivity_level=request.sensitivity_level,
        conditions=request.conditions,
        pregnancy_status=request.pregnancy_status,
        current_ingredients=request.current_ingredients,
        budget_max=request.budget_max,
        limit=request.limit,
    )

    all_targeted_chems: list[str] = []
    for concern in local_result.supported_concerns:
        for chemical_key in store.chemicals_for_symptom(concern):
            chemical = store.get_chemical(chemical_key)
            display = chemical.name if chemical else chemical_key
            if display not in all_targeted_chems:
                all_targeted_chems.append(display)

    products: list[RecommendedProduct] = [
        RecommendedProduct(
            name=match.product["name"],
            brand=match.product["brand"],
            price=match.product.get("price"),
            link=match.product.get("sourceUrl", ""),
            source=match.product.get("source", "local"),
            matching_chemicals=match.matched_ingredients,
            matching_symptoms=match.matching_concerns,
            overall_score=match.relevance_score,
            relevance_score=match.relevance_score,
            model_score=match.model_score,
            confidence=match.confidence,
            reasons=match.reasons,
            cautions=match.cautions,
            score_breakdown=match.score_breakdown,
        )
        for match in local_result.products
    ]

    return RecommendResponse(
        products=products,
        concerns_used=local_result.supported_concerns,
        chemicals_targeted=all_targeted_chems,
        total_matched=len(products),
        model_version=local_result.model_version,
        scoring_version=local_result.scoring_version,
        unsupported_concerns=local_result.unsupported_concerns,
        limitations=local_result.limitations,
        education=[
            EducationItem(
                code="MODEL_RELEVANCE_NOT_MEDICAL_CERTAINTY",
                title="Cara membaca rekomendasi",
                message=(
                    "Overall score menggabungkan model relevance, coverage concern, posisi evidence ingredient, "
                    "intent produk, dan safety penalty. Skor bukan jaminan hasil atau bebas iritasi."
                ),
            ),
            EducationItem(
                code="PATCH_TEST",
                title="Lakukan patch test",
                message="Coba pada area kecil dan hentikan pemakaian bila muncul reaksi yang mengkhawatirkan.",
            ),
        ],
    )


@app.get(
    "/internal/v1/profile-intake/questions",
    response_model=QuestionnaireResponse,
    dependencies=[Depends(require_service_token)],
)
def get_profile_questions() -> QuestionnaireResponse:
    from .profile_intake import questionnaire

    return questionnaire()


@app.post(
    "/internal/v1/profile-recommendations",
    response_model=ProfileRecommendationResponse,
    dependencies=[Depends(require_service_token)],
)
def create_profile_recommendations(request: ProfileIntakeRequest) -> ProfileRecommendationResponse:
    from .profile_intake import resolve_profile

    resolution = resolve_profile(request)
    profile = resolution.profile
    if not resolution.can_recommend:
        return ProfileRecommendationResponse(resolution=resolution)

    assert profile.skin_type is not None
    assert profile.pregnancy_status is not None
    recommendations = _build_recommendations(
        RecommendRequest(
            concerns=profile.concerns,
            skin_type=profile.skin_type,
            sensitivity_level=profile.sensitivity_level,
            conditions=profile.conditions,
            pregnancy_status=profile.pregnancy_status,
            current_ingredients=profile.current_ingredients,
            budget_max=request.budget_max,
            limit=request.limit,
        )
    )
    return ProfileRecommendationResponse(
        resolution=resolution,
        recommendations=recommendations,
    )


@app.get(
    "/internal/v1/bpom/search",
    response_model=BpomSearchResponse,
    dependencies=[Depends(require_service_token)],
)
def search_bpom_products(q: str, limit: int = 10) -> BpomSearchResponse:
    """Search the BPOM registry by product name/brand via the configured proxy."""
    from .bpom import search_bpom_status

    reachable, items = search_bpom_status(q, limit)
    return BpomSearchResponse(
        query=q,
        results=[
            BpomSearchItem(
                number=item.number,
                product_name=item.product_name,
                registrant=item.registrant,
                status=item.status,
                active=item.active,
                composition=item.composition,
            )
            for item in items
        ],
        configured=bool(os.getenv("BPOM_SEARCH_URL")),
        reachable=reachable,
    )


@app.get(
    "/internal/v1/ingredients/{ingredient_name}",
    response_model=IngredientKnowledgeResponse,
    dependencies=[Depends(require_service_token)],
)
def get_ingredient_knowledge(ingredient_name: str) -> IngredientKnowledgeResponse:
    """Return evidence-backed ingredient literacy without a generative model."""
    from .data_loader import get_store
    from .engine import IngredientAnalyzer
    from .normalizer import IngredientNormalizer

    store = get_store()
    resolved = IngredientNormalizer(store=store).resolve(ingredient_name)
    report = IngredientAnalyzer(store=store).analyze(resolved)
    if report.chemical is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found in reviewed dataset",
        )

    education = [
        EducationItem(
            code="CONTEXT_MATTERS",
            title="Kecocokan bersifat kontekstual",
            message="Manfaat dan risiko ingredient bergantung pada konsentrasi, formulasi, frekuensi, serta kondisi kulit.",
            evidence=[report.name],
        )
    ]
    if report.type_category in {"retinoid", "exfoliant"}:
        education.append(
            EducationItem(
                code="INTRODUCE_ACTIVE_SLOWLY",
                title="Mulai active secara perlahan",
                message="Hindari menambah beberapa active kuat sekaligus dan gunakan perlindungan matahari yang sesuai.",
                evidence=[report.name],
            )
        )

    return IngredientKnowledgeResponse(
        query=ingredient_name,
        canonical_name=resolved.canonical_name,
        match_type=resolved.match_type,
        match_confidence=resolved.confidence,
        category=report.type_category,
        risk_level=report.risk_level,
        benefits=report.benefits_summary or None,
        cautions=report.caution_notes or None,
        compatible_with=report.compatibility_notes or None,
        usage_frequency=report.usage_frequency or None,
        relevant_concerns=report.relevant_symptoms,
        education=education,
        dataset_version="chem-full-2026.07.2",
    )
