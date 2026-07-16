import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .schemas import (
    AnalysisRequest,
    CompletedAnalysis,
    NeedsInputAnalysis,
    RecommendedProduct,
    RecommendRequest,
    RecommendResponse,
)
from .scoring import analyze

app = FastAPI(title="SkinSafe AI Service", version="0.2.0", docs_url="/docs", redoc_url=None)


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
    return {"status": "ready", "ruleset": "2026.07.1", "engine": "0.2.0"}


@app.post("/internal/v1/analyses", response_model=CompletedAnalysis | NeedsInputAnalysis, dependencies=[Depends(require_service_token)])
def create_analysis(request: AnalysisRequest) -> CompletedAnalysis | NeedsInputAnalysis:
    return analyze(request)


@app.post("/internal/v1/recommendations", response_model=RecommendResponse, dependencies=[Depends(require_service_token)])
def create_recommendations(request: RecommendRequest) -> RecommendResponse:
    """Product recommendation endpoint — finds products matching user concerns.

    Uses the Core Engine's ProductRecommender to traverse the symptom →
    chemical → product relationship graph and return ranked results.
    """
    from .data_loader import get_store
    from .engine import ProductRecommender

    store = get_store()
    recommender = ProductRecommender(store=store)

    matches = recommender.recommend(
        concerns=request.concerns,
        skin_type=request.skin_type,
        budget_max=request.budget_max,
        limit=request.limit,
    )

    # Collect all targeted chemicals for the response
    all_targeted_chems: list[str] = []
    for concern in request.concerns:
        concern_norm = concern.lower().replace("-", " ").replace("_", " ")
        chem_keys = store.chemicals_for_symptom(concern_norm)
        for ck in chem_keys:
            chem = store.get_chemical(ck)
            display = chem.name if chem else ck
            if display not in all_targeted_chems:
                all_targeted_chems.append(display)

    products = [
        RecommendedProduct(
            name=m.product.name,
            brand=m.product.brand,
            price=m.product.price,
            link=m.product.link,
            source=m.product.source,
            matching_chemicals=m.matching_chemicals,
            matching_symptoms=m.matching_symptoms,
            relevance_score=m.relevance_score,
        )
        for m in matches
    ]

    return RecommendResponse(
        products=products,
        concerns_used=request.concerns,
        chemicals_targeted=all_targeted_chems,
        total_matched=len(matches),
    )
