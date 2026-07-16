# AI Service Architecture

## Components

```text
FastAPI router
  → request validation + service auth
  → analysis orchestrator
      ├─ input loader / image validation
      ├─ OCR or vision adapter
      ├─ product field extractor
      ├─ text and ingredient normalizer
      ├─ BPOM verifier
      ├─ overclaim detector
      ├─ ingredient safety engine
      ├─ skin compatibility engine
      ├─ routine conflict engine
      ├─ scoring + hard safety gates
      └─ recommendation composer
  → typed analysis response
```

## Dependency direction

Domain rules dan scoring adalah pure Python dan tidak bergantung pada FastAPI, database, HTTP client, atau vendor SDK. Provider adapters mengimplementasikan interface sempit dan mengubah provider response menjadi internal extraction schema.

```text
API → application orchestrator → domain rules
                         └──────→ provider/data adapters
```

AI service tidak menjadi system of record. Ia boleh memuat read-only dataset ke memory saat startup, tetapi tidak menyimpan user profile, scan history, atau report. Next.js menyimpan snapshot response beserta versi engine.

Local model artifact memakai JSON portable dan dimuat read-only saat startup.
Inference tidak melakukan network call. Model score diterapkan sebelum
deterministic profile dan safety reranking.

## Suggested source layout

```text
Apps/ai-service/app/
  main.py
  api/routes.py
  core/config.py
  schemas/analysis.py
  services/orchestrator.py
  providers/ocr.py
  domain/extraction.py
  domain/normalization.py
  domain/bpom.py
  domain/overclaim.py
  domain/ingredients.py
  domain/compatibility.py
  domain/conflicts.py
  domain/scoring.py
  domain/recommendation.py
  data/*.json
tests/
```

Layout dapat tumbuh menuju struktur ini; skeleton tidak perlu membuat module kosong yang belum dipakai.

## Runtime

FastAPI 0.139.0 dengan Python target 3.14; source menjaga kompatibilitas >=3.12. Gunakan ASGI server dari `fastapi[standard]`. Request analysis memiliki hard timeout dan cancellation handling agar provider call tidak terus berjalan setelah caller berhenti.
