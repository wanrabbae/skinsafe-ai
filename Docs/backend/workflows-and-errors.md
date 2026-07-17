# Workflows and Error Contract

## Scan state machine

```text
queued → extracting → normalizing → evaluating → finalizing → completed
             │             │             │
             └─────────────┴─────────────┴→ needs_input → queued
             │                           └→ failed → queued (retry)
             └────────────────────────────→ cancelled
```

Hanya transition di atas yang valid. Worker mengambil job dengan lease/claim agar dua process tidak menganalisis scan yang sama. Completion disimpan dalam transaction: report revision dibuat lalu scan ditandai completed.

## Orchestration sequence

1. Validasi auth, profile ownership, content type, size, dan rate limit.
2. Simpan scan + upload metadata, lalu enqueue job.
3. Worker membuat signed input URL dan memanggil FastAPI dengan `scanId`, snapshot profile, dan input.
4. FastAPI mengembalikan `completed`, `needs_input`, atau typed failure.
5. Backend memvalidasi response schema, menyimpan product snapshot/report/version metadata.
6. Upload mentah dihapus sesuai retention policy; UI membaca status/report.

## Error envelope

```json
{
  "error": {
    "code": "OCR_EXTRACTION_FAILED",
    "message": "Teks bahan belum dapat dibaca.",
    "requestId": "req_...",
    "retryable": false,
    "fallbackAction": "manual_input",
    "fieldErrors": {
      "ingredientsText": ["Isi daftar bahan atau unggah foto yang lebih jelas."]
    }
  }
}
```

## Status mapping

| HTTP | Penggunaan |
|---|---|
| 400 | JSON/multipart malformed |
| 401 | session tidak ada/invalid |
| 403 | caller authenticated tetapi operation dilarang |
| 404 | resource tidak ada atau ownership disamarkan |
| 409 | state conflict, duplicate transition |
| 413 | upload terlalu besar |
| 415 | media type tidak didukung |
| 422 | semantic validation/field errors |
| 429 | rate limit |
| 502 | response AI/provider invalid |
| 503 | dependency sementara tidak tersedia |

Retry hanya untuk timeout, 429/5xx dependency, atau lease expiration. Validation, unsupported type, dan manual-input requirement tidak di-retry otomatis.
