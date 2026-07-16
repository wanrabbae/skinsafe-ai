# Frontend Architecture

## Boundary

Frontend bertanggung jawab atas presentasi, interaksi, validasi cepat, dan cache UI. Frontend tidak menghitung safety score, menentukan BPOM status, atau menghasilkan keputusan medis. Seluruh hasil authoritative berasal dari REST API.

## Struktur aplikasi

```text
Apps/web/src/
  app/
    (marketing)/page.tsx
    (product)/profile/page.tsx
    (product)/scan/page.tsx
    (product)/scan/[scanId]/loading/page.tsx
    (product)/scan/[scanId]/report/page.tsx
    compare/page.tsx
    history/page.tsx
    ingredients/[name]/page.tsx
    api/v1/.../route.ts
    layout.tsx
    manifest.ts
  components/
    profile/
    scan/
    report/
    shared/
  lib/
    api-client.ts
    contracts.ts
    formatters.ts
  hooks/
  public/
    sw.js
```

Route groups boleh dipakai untuk organisasi tanpa mengubah URL. Komponen default adalah React Server Component. Tambahkan `"use client"` hanya pada komponen yang memerlukan event handler, browser API, atau local state.

## Rendering strategy

| Data | Strategi |
|---|---|
| Landing dan ingredient public | Server-rendered; metadata dapat diindeks |
| Profile form | Server shell + client form island |
| Scan form/camera | Client component karena File API dan media capture |
| Loading status | Client polling dengan backoff, berhenti pada terminal state |
| Report | Server-rendered ketika dibuka langsung; refresh manual untuk status stale |
| History | Server-rendered per request, pagination dari API |

Jangan cache response yang mengandung profil atau report pengguna secara publik. Gunakan `cache: "no-store"` untuk data privat dan manfaatkan cache browser hanya untuk static assets.

## Data flow

```text
Form/UI → typed API client → /api/v1 → normalized response
                                      │
UI state ← view model mapper ←────────┘
```

UI membaca discriminated union seperti `status: "queued" | "processing" | "completed" | "needs_input" | "failed"`. Hindari boolean terpisah seperti `isLoading`, `hasError`, dan `isDone` yang dapat menghasilkan state kontradiktif.

## Environment variables

- `NEXT_PUBLIC_APP_URL`: origin publik; satu-satunya variable publik yang diperlukan untuk MVP.
- `AI_SERVICE_URL`: server-only URL FastAPI.
- `AI_SERVICE_TOKEN`: server-only service credential.
- `DATABASE_URL` dan storage credentials: server-only.

Variable tanpa prefix `NEXT_PUBLIC_` tidak boleh diakses dari Client Component.
