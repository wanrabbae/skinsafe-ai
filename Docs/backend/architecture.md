# Backend Architecture

## Layers

```text
Route Handler
  → request schema + auth guard
  → application use case
  → repository / storage / AI client ports
  → database, object storage, FastAPI
```

Route handler harus tipis. Ia membaca request, memanggil satu use case, lalu memetakan result/error ke HTTP. Business flow berada di server-only module seperti `src/server/use-cases`; query persistence di `src/server/repositories`; komunikasi FastAPI di `src/server/clients/ai-service.ts`.

Untuk skeleton MVP, modul dapat dimulai kecil dan dipisah hanya saat route nyata bertambah. Jangan mengimpor server module dari Client Component.

## Responsibility split

| Next.js backend | FastAPI AI service |
|---|---|
| public REST contract | internal analysis contract |
| auth, ownership, rate limit | extraction, normalization, rules, scoring |
| presigned/private upload | provider adapters |
| scan state and retries | evidence-rich analysis result |
| persistence and history | stateless computation |
| retention/deletion | model/rule/dataset version metadata |

## Deployment topology

Web dan AI service dideploy sebagai dua process/container. Database dan object storage dapat memakai managed service. AI service hanya dapat diakses dari private network atau menggunakan short-lived/service token. Background processing memakai queue bila platform request timeout lebih pendek daripada target analisis 10–20 detik; untuk hackathon, in-process async call boleh dipakai hanya jika timeout platform terukur cukup.

## Configuration

Server-only variables:

- `DATABASE_URL`
- `OBJECT_STORAGE_*`
- `AI_SERVICE_URL`
- `AI_SERVICE_TOKEN`
- `UPLOAD_MAX_BYTES`
- `SCAN_RETENTION_DAYS`
- provider credentials jika upload langsung dari backend

Validasi config saat startup/build server. Secret tidak memiliki default produksi.
