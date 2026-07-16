# AI System — FastAPI

AI service di `Apps/ai-service` mengubah foto atau input manual menjadi analisis skincare yang evidence-backed. Kata “AI” mencakup OCR/vision extraction dan optional language model, tetapi keputusan safety final memakai normalisasi dan rules yang deterministic.

## Dokumen

- [architecture.md](./architecture.md): component boundary, request lifecycle, deployment.
- [pipeline.md](./pipeline.md): stage pipeline, state, fallback, dan latency budget.
- [contracts.md](./contracts.md): internal FastAPI endpoint dan schema.
- [extraction-and-normalization.md](./extraction-and-normalization.md): OCR, evidence span, ingredient matching.
- [knowledge-and-rules.md](./knowledge-and-rules.md): ingredient, BPOM, overclaim, compatibility, routine rules.
- [scoring-and-safety.md](./scoring-and-safety.md): formula, hard gates, confidence, recommendation policy.
- [data-and-model-governance.md](./data-and-model-governance.md): dataset, prompt/model version, privacy, reproducibility.
- [evaluation-and-operations.md](./evaluation-and-operations.md): test sets, metrics, monitoring, incident handling.

## Non-goals

- Mendiagnosis kondisi kulit.
- Menyatakan produk “100% aman” atau cocok untuk semua orang.
- Menggantikan tenaga medis atau regulatory authority.
- Mengarang status BPOM ketika data tidak tersedia.
- Menghasilkan rekomendasi yang tidak dapat ditelusuri ke evidence/rule.

## Output principle

Setiap finding minimal memiliki `code`, severity, message, evidence, source type, dan rule/model version. Jika evidence tidak cukup, service mengembalikan limitation atau `needs_input`, bukan menebak.

## Local ML implementation

Implementasi AI saat ini tidak memanggil API LLM. Product relevance memakai
model logistic multi-label lokal yang dilatih dari chemical-symptom links,
ingredient functions, dan fixture produk. Model hanya mengurutkan kandidat;
prohibited ingredient, pregnancy, damaged barrier, routine conflict, dan
low-confidence gate tetap deterministic.

Artifact dan model card berada di AI/models. Manual ingredient analysis,
recommendation, dan ingredient literacy sudah tersedia. OCR kamera masih
memerlukan labeled image dataset terpisah dan saat ini wajib fallback ke input
manual.
