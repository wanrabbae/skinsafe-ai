# REST API Contract

Base path: `/api/v1`. Media type: `application/json`, kecuali endpoint upload yang menerima `multipart/form-data`. Timestamp menggunakan ISO 8601 UTC. ID adalah UUID opaque.

## Conventions

- Collection berupa plural nouns: `/scans`, `/profiles`, `/ingredients`.
- Mutation menerima `Idempotency-Key` untuk request yang aman di-retry.
- List menggunakan cursor: `?limit=20&cursor=...`; response `{ data, page: { nextCursor } }`.
- `PUT` mengganti resource penuh, `PATCH` mengubah sebagian, `POST` membuat command/resource.
- API tidak mengembalikan internal stack trace atau provider raw response.

## Health

### `GET /api/v1/health`

`200`: `{ "status": "ok", "service": "skinsafe-web", "version": "..." }`. Endpoint liveness tidak memeriksa dependency mahal.

## Profiles

### `POST /api/v1/profiles`

Membuat profil untuk session saat ini.

```json
{
  "skinType": "sensitive",
  "sensitivityLevel": "high",
  "conditions": ["damaged_barrier", "active_acne"],
  "concerns": ["acne", "redness"],
  "goals": ["barrier_repair"],
  "pregnancyStatus": "none",
  "currentRoutine": [
    { "productName": "Example cleanser", "activeIngredients": ["salicylic_acid"] }
  ]
}
```

`201`: `{ "data": { "id": "uuid", ... } }`.

### `GET /api/v1/profiles/current`

`200` current profile; `404 PROFILE_NOT_FOUND` bila belum ada.

### `PATCH /api/v1/profiles/current`

Mengubah field yang dikirim dan memperbarui `updatedAt`.

## Scans

### `POST /api/v1/scans`

Mode image: multipart dengan `inputMethod`, `profileId`, dan `images[]`. Mode manual: JSON dengan `inputMethod: "manual"`, `bpomNumber`, `claimsText`, dan `ingredientsText`.

`202 Accepted`:

```json
{
  "data": {
    "scanId": "uuid",
    "status": "queued",
    "statusUrl": "/api/v1/scans/uuid/status"
  }
}
```

### `GET /api/v1/scans/{scanId}/status`

```json
{
  "data": {
    "scanId": "uuid",
    "status": "extracting",
    "step": "extract_product_data",
    "progress": 25,
    "updatedAt": "2026-07-16T08:00:00Z"
  }
}
```

Terminal state: `completed`, `needs_input`, `failed`, `cancelled`. `progress` adalah coarse hint dan tidak dijamin monoton jika job di-retry.

### `PATCH /api/v1/scans/{scanId}/input`

Mengisi field yang tidak terbaca. Hanya valid untuk `needs_input`; menghasilkan `202` dan mengembalikan scan ke `queued`.

### `POST /api/v1/scans/{scanId}/retry`

Retry idempotent untuk failure yang retryable. `409` jika state tidak mendukung retry.

### `GET /api/v1/scans/{scanId}/report`

`200` report completed; `202` bila masih diproses; `409 SCAN_NEEDS_INPUT`; `404` untuk ID tidak ada atau bukan milik caller.

### `GET /api/v1/scans`

History dengan `limit`, `cursor`, optional `status`, dan sort terbaru dahulu.

### `DELETE /api/v1/scans/{scanId}`

Menghapus record dan menjadwalkan penghapusan object upload. `204` saat berhasil.

## Ingredients

### `GET /api/v1/ingredients/{slug}`

Mengembalikan nama, alias, category, benefits, risks, goodFor, avoidIf, evidence summary, dan dataset version. `404 INGREDIENT_NOT_FOUND` bila tidak dikenal.

## Compare

### `GET /api/v1/comparisons?left={scanId}&right={scanId}`

Mengembalikan dua summary dan normalized comparison dimensions. Hanya report milik caller yang dapat dibandingkan.
