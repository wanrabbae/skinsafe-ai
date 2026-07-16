# Evaluation and Operations

## Evaluation sets

Bangun set terpisah untuk:

- OCR kemasan beresolusi/lighting/bahasa berbeda;
- ingredient list dengan alias, typo, parenthesis, dan unknown token;
- BPOM exact match, mismatch, absent, not found, revoked fixtures;
- overclaim paraphrase dan hard negative;
- profile compatibility dan routine conflict cases;
- pregnancy caution reviewed cases;
- adversarial text/prompt injection pada image/marketplace copy.

## Metrics

| Area | Metric |
|---|---|
| Extraction | field exact/F1, BPOM character accuracy, ingredient token recall |
| Normalization | canonical match precision/recall, unresolved rate |
| Overclaim | precision, recall, F1 per category |
| Safety rules | critical false-negative rate, false-positive rate |
| Scoring | band agreement dengan reviewer, calibration by confidence bucket |
| Operations | latency p50/p95, timeout, retry, needs-input rate, cost/scan |

Critical false negative lebih berat daripada score agreement. Tetapkan release gate: tidak ada regression pada prohibited ingredient dan revoked BPOM fixtures.

## Current local recommender baseline

local-recommender-2026.07.1 dilatih pada 373 dan divalidasi pada 128 produk
setelah pembersihan kategori non-skincare. Weak-label macro F1 0.9052, macro
ROC-AUC 0.9384, NDCG@10 1.0000, dan Recall@10 0.1546. Nilai ini bukan clinical
accuracy. Runtime confidence dibatasi
maksimum medium; model card per-concern berada di AI/models/MODEL_CARD.md.
Setiap training menulis history per epoch dan JPEG loss/F1 ke folder AI/images
agar overfitting dan regression dapat ditinjau tanpa dashboard eksternal.
Training juga menulis fingerprint model/katalog dan data-quality report. Parser
profil memiliki golden set sintetis terpisah; statusnya engineering-reviewed,
belum clinical-reviewed.

## Test layers

1. Pure unit tests untuk parser, rules, scoring, hard gates.
2. Dataset schema/quality tests.
3. Provider adapter contract tests dengan recorded sanitized fixtures.
4. FastAPI endpoint tests tanpa network provider.
5. Golden end-to-end analyses.
6. Shadow/canary comparison sebelum mengganti model atau ruleset besar.

## Runtime monitoring

Log structured: requestId, scanId, stage, duration, provider, model version, ruleset version, status, error code. Jangan log image, profile sensitif, raw prompt, atau ingredient raw text secara default.

Alert pada critical rule load failure, sudden spike needs-input, provider error/timeout, p95 >20s, score distribution shift, unresolved ingredient spike, dan dataset checksum mismatch.

## Failure policy

- Dataset/rules gagal dimuat: readiness false, jangan menerima traffic.
- Provider timeout: bounded retry; lalu typed retryable error/manual path.
- Invalid provider JSON: satu repair attempt yang schema-constrained; jika gagal, fallback.
- Unknown ingredient: pertahankan unknown, turunkan confidence, jangan mengarang risiko.
- Recommendation validator gagal: gunakan deterministic template.

## Human review and incident response

Severity-critical false verdict memicu: hentikan ruleset/model rollout, identifikasi affected version/report, patch fixture dan rule, re-run regression, deploy, lalu tandai report lama untuk re-analysis bila perlu. Medical/regulatory content changes harus mendapat reviewer domain sebelum release.
