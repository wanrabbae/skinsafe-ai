# Backend Security and Operations

## Upload security

- Allowlist MIME dan magic-byte sniffing; ekstensi file tidak dipercaya.
- Batas jumlah file, ukuran file, image dimensions, dan decompression ratio.
- Generate object key; abaikan nama/path dari user.
- Storage private, encrypted, dan signed URL singkat.
- Pertimbangkan malware scan sebelum external processing pada production.
- Strip metadata EXIF jika tidak diperlukan.

## API security

- Auth dan ownership check pada setiap resource.
- Rate limit per account/session dan IP untuk anonymous flow.
- Service-to-service auth, network allowlist, request timeout, dan response size limit.
- Strict schema yang menolak field tidak dikenal pada trust boundary.
- CORS same-origin untuk public API; internal AI tidak membuka browser CORS.
- Secret rotation dan redaction pada log.

## Privacy and retention

Dokumentasikan apakah gambar, profil, dan history disimpan. Default MVP: upload mentah dihapus setelah analisis atau maksimum retention pendek yang diumumkan. Sediakan deletion endpoint yang menghapus scan, report, dan object terkait. Jangan mengirim user identifier ke provider AI jika tidak diperlukan.

## Observability

Structured log fields: timestamp, level, service, requestId, scanId, route, status, durationMs, dependency, attempt, errorCode. Jangan log image bytes, raw ingredient photo URL, pregnancy status, atau provider prompts penuh.

Metrics minimum:

- request count/error/latency per route;
- scan queue depth dan stage duration;
- analysis success, needs-input, failure, retry rate;
- AI dependency latency/error;
- report completion p50/p95;
- upload deletion backlog.

Trace context diteruskan dari Next.js ke FastAPI melalui `traceparent` atau `X-Request-Id`.

## Tests and release gate

- Unit: validators, state transition, owner guard, error mapping.
- Contract: Next↔FastAPI request/response schema.
- Integration: database transaction, upload lifecycle, idempotency.
- Security: unauthorized object access, oversized/polyglot upload, rate limit.
- E2E: successful manual scan dan OCR `needs_input` recovery.

Deployment menggunakan health checks, migration step terpisah, graceful shutdown, dan rollback-compatible schema changes.
