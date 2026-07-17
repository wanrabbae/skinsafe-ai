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

### Ingredient detail signals

`report.ingredientDetails[]` menyertakan sinyal INCIDecoder per bahan (nullable, terisi bila bahan ada di signal layer — lihat `Docs/AI/knowledge-and-rules.md`):

```json
{
  "name": "Coconut Oil",
  "riskLevel": "caution",
  "irritancy": 0,
  "comedogenicity": 4,
  "functions": ["emollient", "perfuming"],
  "rating": "goodie"
}
```

`method` menerima superset `manual|camera|screenshot|packaging_photo|ingredient_photo` — Apps saat ini hanya mengirim `manual`/`camera` dari flow scan; nilai foto lain tersedia untuk kebutuhan mendatang tanpa menaikkan versi endpoint.

## Schema compatibility

Penambahan optional field bersifat backward-compatible. Rename, type change, atau semantic change memerlukan versi endpoint baru. Contract test dijalankan dari kedua repo/module sebelum deployment.

## POST /internal/v1/recommendations

Menerima concerns, skinType, optional sensitivityLevel, conditions,
pregnancyStatus, currentIngredients, `avoidIngredients`, `excludedProducts`,
budgetMax, dan limit. `avoidIngredients` mengeluarkan kandidat yang mengandung
bahan pada avoid list personal; `excludedProducts` memakai identitas
`Brand::Product Name` dari feedback sebelumnya. Response menyertakan
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

Mengembalikan questionnaire berversi dengan sepuluh pertanyaan generik yang
sama untuk semua user. Sepuluh pertanyaan membentuk SCP awal: tipe dan
reaktivitas kulit, concern utama, durasi/severity concern, barrier, kompleksitas
routine, penggunaan active, lingkungan, dan status safety. Setiap
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

Branch setelah SCP awal tidak membutuhkan endpoint khusus untuk tombol. Pilihan
"Sudah sesuai" memakai `resolution.profile` dan recommendation yang sudah ada;
pilihan "Perlu personalisasi" memulai endpoint berikut.

## POST /internal/v1/profile-personalization/questions

Dipanggil saat user memilih "Perlu personalisasi" setelah menyetujui SCP awal.
AI service tetap stateless: backend mengirim SCP terakhir dan seluruh jawaban
personalisasi yang sudah terkumpul. Response menerapkan jawaban ke SCP lalu
mengurutkan ulang pertanyaan tersisa. Dengan begitu pertanyaan pertama pada
response berikutnya selalu menjadi pertanyaan terbaik berdasarkan konteks SCP
terbaru, bukan urutan form statis.

Request pertama:

```json
{
  "profile": {
    "skinType": "sensitive",
    "sensitivityLevel": "high",
    "conditions": ["damaged_barrier"],
    "concerns": ["acne", "redness"],
    "pregnancyStatus": "none",
    "currentIngredients": [],
    "avoidIngredients": [],
    "excludedProducts": [],
    "contextSignals": {}
  },
  "answers": {}
}
```

Response pertama memuat tepat 20 pertanyaan personalisasi:

```json
{
  "version": "scp-personalization-2026.07.1",
  "profile": {},
  "questions": [
    {
      "id": "concern_area",
      "prompt": "Untuk jerawat, area mana yang paling sering terdampak?",
      "kind": "personalized",
      "whyAsked": "Memetakan lokasi concern agar SCP lebih spesifik.",
      "options": [
        { "value": "A", "label": "Satu area kecil", "description": "Hanya muncul pada satu area." }
      ]
    }
  ],
  "answeredCount": 0,
  "totalQuestions": 20,
  "completed": false,
  "profileUpdates": []
}
```

Setelah setiap jawaban, backend mengirim ulang SCP awal plus map jawaban
akumulatif, misalnya:

```json
{
  "profile": {},
  "answers": {
    "concern_area": "B",
    "fragrance_tolerance": "C"
  }
}
```

Response berisi SCP yang sudah diperbarui, `answeredCount: 2`, dan 18
pertanyaan tersisa dalam prioritas baru. Setelah seluruh 20 terjawab,
`questions` kosong dan `completed` bernilai `true`. Backend utama menyimpan SCP
hasil response ke user yang signed-in; AI service tidak menyimpan identitas atau
session user.

## POST /internal/v1/profile-feedback

Menerapkan outcome setelah user mencoba satu produk yang sebelumnya
direkomendasikan. Request selalu membawa snapshot SCP dan konteks produk agar
update benar-benar berbasis keduanya:

```json
{
  "profile": {
    "skinType": "oily",
    "sensitivityLevel": "medium",
    "concerns": ["acne"],
    "pregnancyStatus": "none",
    "feedbackCount": 0
  },
  "product": {
    "name": "Example Serum",
    "brand": "Example",
    "matchingChemicals": ["Niacinamide"],
    "modelVersion": "local-recommender-2026.07.1"
  },
  "outcome": "reaction",
  "usageDays": 10,
  "reactionSeverity": "moderate",
  "suspectedIngredients": ["fragrance"],
  "consentToLearning": true
}
```

`outcome` menerima `improved|no_change|worsened|reaction`. Response:

```json
{
  "profile": {
    "sensitivityLevel": "high",
    "conditions": ["damaged_barrier"],
    "avoidIngredients": ["fragrance"],
    "excludedProducts": ["Example::Example Serum"],
    "feedbackCount": 1
  },
  "action": "stop",
  "profileUpdates": [],
  "safetyMessage": null,
  "learningSignal": {
    "schemaVersion": "product-outcome-2026.07.1",
    "outcome": "reaction",
    "eligibleForOfflineTraining": true
  },
  "disclaimer": "Feedback memperbarui konteks personal, bukan diagnosis atau training model global secara langsung."
}
```

Reaksi severe menghasilkan `action: stop_and_seek_care`. Tanpa
`consentToLearning`, `learningSignal` selalu `null`. Dengan consent, signal
terdeidentifikasi diserahkan ke backend/data pipeline sebagai kandidat offline
training; signal tidak langsung mengubah bobot model production. SCP baru dapat
dikirim ke `/internal/v1/recommendations` melalui `avoidIngredients` dan
`excludedProducts`, sehingga produk yang terbukti tidak cocok tidak diulang.
