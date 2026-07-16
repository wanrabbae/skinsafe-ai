# Frontend Architecture

## Boundary

Frontend bertanggung jawab atas presentasi, interaksi, validasi cepat, dan cache UI. Frontend tidak menghitung safety score, menentukan BPOM status, atau menghasilkan keputusan medis. Seluruh hasil authoritative berasal dari REST API.

## Struktur aplikasi

```text
Apps/src/
  app/
    page.tsx
    profile/page.tsx
    scan/page.tsx
    history/page.tsx
    offline/page.tsx
    api/v1/health/route.ts
    layout.tsx
    manifest.ts
  modules/
    health/{route,service,index.ts}
    profile/{route,service,aggregator,actions,index.ts}
    scan/{route,service,aggregator,actions,index.ts}
    ingredient/{route,service,aggregator,actions,index.ts}
    compare/{route,service,aggregator,actions,index.ts}
  shared/
    components/ui/
    components/service-worker-register.tsx
    lib/{env.ts,utils.ts}
    prisma/client.ts
```

`app/` hanya memegang entry point framework. Logic dikelompokkan per domain di `modules/`; Route Handler fisik melakukan re-export tipis dari module terkait. Cross-module read hanya lewat public `index.ts`, sedangkan write tetap menjadi tanggung jawab service/actions pemilik entity. ESLint melarang deep import ke internal module lain.

Komponen dan infrastructure lintas domain berada di `shared/`. Komponen default adalah React Server Component. Tambahkan `"use client"` hanya pada komponen yang memerlukan event handler, browser API, atau local state.

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
