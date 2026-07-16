# Backend — Next.js REST API

Backend publik berada di aplikasi Next.js yang sama dengan frontend dan diimplementasikan dengan App Router Route Handlers di `Apps/web/src/app/api/v1`. Perannya adalah Backend for Frontend (BFF): validasi request, auth/session, persistence, upload, job orchestration, dan translasi contract AI internal menjadi contract produk yang stabil.

## Dokumen

- [architecture.md](./architecture.md): boundary, layering, deployment, dan dependency direction.
- [rest-api.md](./rest-api.md): endpoint, request/response, status code, pagination, idempotency.
- [data-model.md](./data-model.md): entity dan lifecycle data.
- [workflows-and-errors.md](./workflows-and-errors.md): scan workflow, state machine, error envelope.
- [security-and-operations.md](./security-and-operations.md): security, privacy, observability, testing, deployment.

## Backend invariants

- Public resources selalu diperiksa terhadap user/session owner.
- Browser tidak pernah memperoleh AI service credential atau storage admin credential.
- Score final dan evidence disimpan sebagai immutable analysis snapshot dengan versi engine.
- Retry tidak boleh membuat scan/report ganda.
- Semua response error memiliki `requestId` dan machine-readable `code`.
