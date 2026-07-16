# Frontend Architecture

## Boundary

Frontend bertanggung jawab atas presentasi, interaksi, validasi cepat, dan cache UI. Frontend tidak menghitung safety score, menentukan BPOM status, atau menghasilkan keputusan medis. Seluruh hasil authoritative berasal dari REST API.

## Struktur aplikasi

Struktur saat ini (`ingredient`/`compare`/`health` module belum dibuat; termasuk desain target):

```text
Apps/src/
  app/
    page.tsx
    test/page.tsx
    test/hasil/page.tsx
    scan/page.tsx
    recommendation/page.tsx
    offline/page.tsx
    not-found.tsx
    layout.tsx
    manifest.ts
    components/{home,scan,test,recommendation,offline}/   # view/switcher per halaman (bukan di folder route)
    api/v1/profile-intake/{questions,recommendations}/route.ts
    api/v1/scans/analyze/route.ts
  modules/
    profile/{components,route,index.ts}                   # + profile-storage.ts (localStorage), profile-display.ts
    scan/{route,service,index.ts}
  shared/
    components/ui/
    components/{query-provider,mobile-navigation,service-worker-register}.tsx
    lib/{env.ts,utils.ts,query-client.ts}
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
