# Internal FastAPI Contract

Base path: `/internal/v1`. Endpoint tidak diekspos ke browser. Semua request membawa `Authorization: Bearer <service-token>`, `X-Request-Id`, dan optional W3C `traceparent`.

## `GET /health/live`

Liveness process. Tidak memanggil provider atau database.

```json
{ "status": "ok", "service": "skinsafe-ai" }
```

## `GET /health/ready`

Memastikan ruleset/dataset berhasil dimuat. Provider eksternal tidak harus dipanggil pada setiap probe.

## `POST /internal/v1/analyses`

```json
{
  "scanId": "uuid",
  "input": {
    "method": "manual",
    "imageUrls": [],
    "bpomNumber": "NA18240123456",
    "claimsText": "Menyembuhkan jerawat dalam 1 malam",
    "ingredientsText": "Aqua, Glycerin, Salicylic Acid"
  },
  "profile": {
    "skinType": "sensitive",
    "sensitivityLevel": "high",
    "conditions": ["damaged_barrier"],
    "concerns": ["acne"],
    "pregnancyStatus": "none",
    "currentRoutine": []
  },
  "options": {
    "locale": "id-ID",
    "includeDebug": false
  }
}
```

Completed response:

```json
{
  "status": "completed",
  "scanId": "uuid",
  "product": {
    "name": null,
    "brand": null,
    "bpomNumber": "NA18240123456",
    "claims": ["Menyembuhkan jerawat dalam 1 malam"],
    "ingredientsRaw": "Aqua, Glycerin, Salicylic Acid",
    "ingredients": ["water", "glycerin", "salicylic_acid"]
  },
  "report": {
    "overallScore": 63,
    "status": "use_with_caution",
    "confidence": { "level": "medium", "score": 72, "limitations": [] },
    "subScores": {},
    "findings": [],
    "recommendation": {},
    "disclaimer": "Informasi edukatif, bukan diagnosis medis."
  },
  "versions": {
    "engine": "0.1.0",
    "ruleset": "2026.07.1",
    "ingredientDataset": "2026.07.1",
    "bpomDataset": "2026.07.1",
    "models": {}
  }
}
```

Needs-input response tetap `200` untuk hasil analysis command yang valid:

```json
{
  "status": "needs_input",
  "scanId": "uuid",
  "missingFields": ["ingredientsText"],
  "extractedDraft": { "bpomNumber": null, "claimsText": "..." },
  "instructions": ["Foto ulang daftar bahan dengan cahaya merata."],
  "versions": {}
}
```

HTTP 4xx/5xx hanya untuk request/service failure dan memakai envelope:

```json
{
  "error": {
    "code": "INVALID_ANALYSIS_INPUT",
    "message": "...",
    "requestId": "...",
    "retryable": false
  }
}
```

## Schema compatibility

Penambahan optional field bersifat backward-compatible. Rename, type change, atau semantic change memerlukan versi endpoint baru. Contract test dijalankan dari kedua repo/module sebelum deployment.
