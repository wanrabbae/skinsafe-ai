import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .schemas import AnalysisRequest, CompletedAnalysis, NeedsInputAnalysis
from .scoring import analyze

app = FastAPI(title="SkinSafe AI Service", version="0.1.0", docs_url="/docs", redoc_url=None)


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
    return {"status": "ready", "ruleset": "2026.07.1"}


@app.post("/internal/v1/analyses", response_model=CompletedAnalysis | NeedsInputAnalysis, dependencies=[Depends(require_service_token)])
def create_analysis(request: AnalysisRequest) -> CompletedAnalysis | NeedsInputAnalysis:
    return analyze(request)
