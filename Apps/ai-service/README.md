# SkinSafe AI Service

FastAPI 0.139.0 service for internal skincare analysis. Python 3.14 is the production target; source supports Python 3.12–3.14.

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e .
fastapi dev app/main.py
```

Endpoints:

- `GET /health/live`
- `GET /health/ready`
- `POST /internal/v1/analyses`

Set `AI_SERVICE_TOKEN` outside local development. API docs are available at `http://localhost:8000/docs`.

The current analyzer is a deterministic baseline for wiring and tests. Replace mock BPOM lookup and seed rules with reviewed datasets before treating reports as production output. See `../../Docs/AI`.
