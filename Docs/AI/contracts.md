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

## POST /internal/v1/recommendations

Menerima concerns, skinType, optional sensitivityLevel, conditions,
pregnancyStatus, currentIngredients, budgetMax, dan limit. Response menyertakan
ranked products, overallScore, relevanceScore, modelVersion, scoringVersion,
modelScore, scoreBreakdown, confidence, reasons, cautions, limitations, dan
education. `overallScore` adalah hasil gabungan model relevance, concern
coverage, evidence position, explicit product intent, dan deterministic
penalty. Nilainya maksimum 95 karena uncertainty reserve. `relevanceScore`
sementara menjadi alias backward-compatible untuk `overallScore`. Produk tanpa
traceable ingredient evidence tidak ditampilkan.

Karena katalog model belum memiliki harga, request dengan budgetMax dapat
menghasilkan daftar kosong; service tidak mengarang harga.

## GET /internal/v1/ingredients/{ingredient_name}

Mengembalikan canonical match, confidence, category, benefits, cautions,
compatibility, frequency, concern terkait, dan deterministic literacy cards
dari chem_full.csv. Unknown ingredient mengembalikan 404.

## GET /internal/v1/profile-intake/questions

Mengembalikan questionnaire berversi dengan empat pertanyaan. Setiap
pertanyaan selalu memiliki pilihan `A`, `B`, `C`, dan `D`; PWA tidak boleh
mengubah semantic pilihan tanpa menaikkan versi questionnaire.

## POST /internal/v1/profile-recommendations

Menerima narasi atau jawaban A-D. Narasi tetap harus menyertakan status safety:

```json
{
  "narrative": "Kulitku cepat berminyak dan sering jerawatan",
  "pregnancyStatus": "none",
  "currentIngredients": ["salicylic acid"],
  "limit": 5
}
```

Response memuat `resolution` dengan profile, confidence, field evidence,
contradictions, clarification questions, red flags, dan `canRecommend`.
`recommendations` bernilai `null` ketika status hamil/menyusui belum jelas,
profil belum cukup, input kontradiktif, atau red flag ditemukan.
