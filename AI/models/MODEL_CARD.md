# SkinSafe Local Recommender — Model Card

## Identity

- Version: local-recommender-2026.07.1
- Type: hashed multi-label logistic regression, one-vs-rest
- Runtime: Python standard library, CPU-only
- External AI/LLM API: none
- Catalog: 501 skincare products
- Train/validation: 373/128 products, grouped by product identity
- Supported concerns: 12

## Intended use

Model mengurutkan kandidat produk berdasarkan kecocokan ingredient/function
terhadap concern pengguna. Model tidak mendiagnosis, memverifikasi BPOM,
menentukan keamanan kehamilan, atau menggantikan safety rule.

## Validation

Validation mengukur agreement terhadap weak labels yang diturunkan dari
chemical-symptom links, ingredient function tags, dan explicit product intent.
Ini bukan clinical accuracy.

- Macro F1: 0.9052
- Macro ROC-AUC: 0.9384
- Weak-label NDCG@10: 1.0000
- Weak-label Recall@10: 0.1546
- Weak-label MAP@10: 1.0000
- Training curves: `../../images/local-recommender-2026.07.1/training-metrics.jpg`

| Concern | Precision | Recall | F1 | ROC-AUC | NDCG@10 | Recall@10 | Positive validation |
|---|---:|---:|---:|---:|---:|---:|---:|
| acne | 0.9888 | 0.9167 | 0.9514 | 0.9678 | 1.0000 | 0.1042 | 96/128 |
| aging | 0.9759 | 0.9205 | 0.9474 | 0.9750 | 1.0000 | 0.1136 | 88/128 |
| discomfort | 0.8370 | 0.9167 | 0.8750 | 0.9077 | 1.0000 | 0.1190 | 84/128 |
| dryness | 0.9186 | 0.9294 | 0.9240 | 0.9453 | 1.0000 | 0.1176 | 85/128 |
| dullness | 0.9615 | 0.9901 | 0.9756 | 0.9710 | 1.0000 | 0.0990 | 101/128 |
| exfoliator/cleanser | 0.9100 | 0.9479 | 0.9286 | 0.9287 | 1.0000 | 0.1042 | 96/128 |
| hydrating | 0.8533 | 0.9275 | 0.8889 | 0.9354 | 1.0000 | 0.1449 | 69/128 |
| oiliness | 0.8824 | 0.7143 | 0.7895 | 0.9030 | 1.0000 | 0.4762 | 21/128 |
| redness | 0.8052 | 0.9394 | 0.8671 | 0.9367 | 1.0000 | 0.1515 | 66/128 |
| rough | 0.7800 | 0.9630 | 0.8619 | 0.8692 | 1.0000 | 0.1235 | 81/128 |
| sun protectant | 1.0000 | 0.8654 | 0.9278 | 0.9717 | 1.0000 | 0.1923 | 52/128 |
| uneven skintone | 0.9759 | 0.8804 | 0.9257 | 0.9490 | 1.0000 | 0.1087 | 92/128 |

## Safety and explainability

- Recommendation harus memiliki ingredient/function evidence; prediction tanpa
  evidence tidak ditampilkan.
- Prohibited ingredient dan pregnancy rules dapat mengeluarkan kandidat.
- Sensitivity, comedogenicity, damaged barrier, fragrance, dan routine conflict
  menurunkan ranking.
- Brand diversity dan duplicate-product filter diterapkan setelah ranking.
- Runtime confidence maksimum medium.

## Known limitations

- Label bukan hasil pemakaian pengguna dan belum direview klinis per produk.
- Dataset tidak seimbang antarbrand.
- Oiliness adalah model terlemah dan membutuhkan lebih banyak golden labels.
- NDCG/MAP sempurna hanya mengukur top-10 terhadap label lemah yang sangat
  padat; Recall@10 menunjukkan sepuluh hasil hanya mencakup sebagian kandidat
  relevan dan bukan bukti hasil klinis.
- Audit coverage saat ini ada di `data-quality-report.json`; hanya 45 dari
  1.548 nama ingredient unik yang terhubung langsung ke knowledge base.
- Konsentrasi ingredient, formulasi akhir, harga, BPOM, dan alergi individual
  tidak tersedia.
- Artifact wajib diretrain dan direview setelah dataset berubah.
