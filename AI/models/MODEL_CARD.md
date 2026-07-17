# SkinSafe Local Recommender — Model Card

## Identity

- Version: local-recommender-2026.07.1
- Type: hashed multi-label logistic regression, one-vs-rest
- Runtime: Python standard library, CPU-only
- External AI/LLM API: none
- Catalog: 501 skincare products
- Train/validation/brand-holdout: 336/111/54 products
- Brand holdout: 11 brands tidak muncul pada train atau threshold tuning
- Supported concerns: 12

## Intended use

Model mengurutkan kandidat produk berdasarkan kecocokan ingredient/function
terhadap concern pengguna. Model tidak mendiagnosis, memverifikasi BPOM,
menentukan keamanan kehamilan, atau menggantikan safety rule.

## Validation

Validation mengukur agreement terhadap weak labels yang diturunkan dari
chemical-symptom links, ingredient function tags, dan explicit product intent.
Ini bukan clinical accuracy.

- Validation macro F1: 0.9082
- Validation macro ROC-AUC: 0.9422
- Validation weak-label NDCG@10: 0.9945
- Validation weak-label Recall@10: 0.1924
- Validation weak-label MAP@10: 0.9908
- Brand-holdout macro F1: 0.8217
- Brand-holdout macro ROC-AUC: 0.9020
- Brand-holdout weak-label NDCG@10: 0.9629
- Brand-holdout weak-label Recall@10: 0.3412
- Training curves: `../../images/local-recommender-2026.07.1/training-metrics.jpg`

| Concern | Val F1 | Val AUC | Holdout F1 | Holdout AUC | Val positive | Holdout positive |
|---|---:|---:|---:|---:|---:|---:|
| acne | 0.9634 | 0.9785 | 0.9189 | 0.9470 | 83/111 | 39/54 |
| aging | 0.9536 | 0.9720 | 0.8364 | 0.9517 | 78/111 | 32/54 |
| discomfort | 0.8676 | 0.8974 | 0.9157 | 0.9477 | 68/111 | 44/54 |
| dryness | 0.9262 | 0.9484 | 0.8657 | 0.8668 | 73/111 | 31/54 |
| dullness | 0.9780 | 0.9746 | 0.9412 | 0.9730 | 90/111 | 32/54 |
| exfoliator/cleanser | 0.9425 | 0.9373 | 0.8718 | 0.9285 | 87/111 | 37/54 |
| hydrating | 0.8906 | 0.9606 | 0.7302 | 0.8207 | 58/111 | 25/54 |
| oiliness | 0.7826 | 0.8658 | 0.2667 | 0.8405 | 13/111 | 13/54 |
| redness | 0.8571 | 0.9448 | 0.9014 | 0.9474 | 51/111 | 38/54 |
| rough | 0.8649 | 0.9003 | 0.8471 | 0.7566 | 69/111 | 38/54 |
| sun protectant | 0.9176 | 0.9639 | 0.9286 | 0.9453 | 46/111 | 15/54 |
| uneven skintone | 0.9542 | 0.9628 | 0.8364 | 0.8986 | 79/111 | 30/54 |

## Safety and explainability

- Recommendation harus memiliki ingredient/function evidence; prediction tanpa
  evidence tidak ditampilkan.
- Prohibited ingredient dan pregnancy rules dapat mengeluarkan kandidat.
- Sensitivity, comedogenicity, damaged barrier, fragrance, dan routine conflict
  menurunkan ranking.
- Brand diversity dan duplicate-product filter diterapkan setelah ranking.
- Runtime confidence maksimum medium.

## Overall compatibility score

Scoring policy `overall-compatibility-bpom-2026.07.3` mengubah probabilitas model
menjadi overall score yang dapat dibandingkan antarproduk. Sinyal relevance
berbagi 75% bobot dan validasi registrasi BPOM mengisi 25% sisanya:

- 65% × 75% dari probabilitas relevance model;
- 15% × 75% dari coverage concern pengguna;
- 10% × 75% dari evidence ingredient, dibobot berdasarkan posisi INCI;
- 5% × 75% dari intent produk yang eksplisit;
- 25% dari BPOM trust: terverifikasi aktif = penuh, non-aktif/tidak ditemukan =
  rendah, dan belum terverifikasi = netral (0.6) agar produk tanpa data registry
  tidak dihukum. Status BPOM per produk berasal dari sidecar
  `data/bpom_status.json` (di luar catalog fingerprint, diisi
  `training/enrich_bpom_status.py`);
- dikurangi safety penalty dan intent-mismatch penalty.

Lima poin terakhir sengaja menjadi uncertainty reserve. Karena data tidak
memuat konsentrasi, formulasi final, alergi individual, atau outcome klinis,
overall score dibatasi maksimal 95 dan tidak boleh ditafsirkan sebagai persen
jaminan cocok. Response menyertakan `overallScore`, raw `modelScore`, dan
`scoreBreakdown`; `relevanceScore` tetap menjadi alias overall score untuk
kompatibilitas client lama.

## Known limitations

- Label bukan hasil pemakaian pengguna dan belum direview klinis per produk.
- Dataset tidak seimbang antarbrand.
- Oiliness adalah model terlemah, terutama pada brand holdout, dan membutuhkan
  label manusia serta contoh lintas-brand sebelum confidence dapat dinaikkan.
- NDCG/MAP sempurna hanya mengukur top-10 terhadap label lemah yang sangat
  padat; Recall@10 menunjukkan sepuluh hasil hanya mencakup sebagian kandidat
  relevan dan bukan bukti hasil klinis.
- Audit coverage saat ini ada di `data-quality-report.json`; hanya 45 dari
  1.548 nama ingredient unik yang terhubung langsung ke knowledge base.
- Konsentrasi ingredient, formulasi akhir, harga, BPOM, dan alergi individual
  tidak tersedia.
- Artifact wajib diretrain dan direview setelah dataset berubah.
