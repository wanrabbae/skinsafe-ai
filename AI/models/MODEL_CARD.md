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

- Macro F1: 0.8904
- Macro ROC-AUC: 0.9354
- Training curves: `../../images/local-recommender-2026.07.1/training-metrics.jpg`

| Concern | Precision | Recall | F1 | ROC-AUC | Positive validation |
|---|---:|---:|---:|---:|---:|
| acne | 0.9333 | 0.9767 | 0.9545 | 0.9817 | 86/128 |
| aging | 0.9153 | 0.8571 | 0.8852 | 0.9573 | 63/128 |
| discomfort | 0.8370 | 0.9167 | 0.8750 | 0.9083 | 84/128 |
| dryness | 0.9186 | 0.9294 | 0.9240 | 0.9450 | 85/128 |
| dullness | 0.9610 | 0.9250 | 0.9427 | 0.9701 | 80/128 |
| exfoliator/cleanser | 0.9100 | 0.9479 | 0.9286 | 0.9284 | 96/128 |
| hydrating | 0.8533 | 0.9275 | 0.8889 | 0.9356 | 69/128 |
| oiliness | 0.8000 | 0.7619 | 0.7805 | 0.9043 | 21/128 |
| redness | 0.8052 | 0.9394 | 0.8671 | 0.9372 | 66/128 |
| rough | 0.8182 | 0.8889 | 0.8521 | 0.8681 | 81/128 |
| sun protectant | 1.0000 | 0.9783 | 0.9890 | 0.9960 | 46/128 |
| uneven skintone | 0.7391 | 0.8644 | 0.7969 | 0.8924 | 59/128 |

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
- Oiliness dan uneven skintone adalah model terlemah dan membutuhkan lebih
  banyak golden labels.
- Konsentrasi ingredient, formulasi akhir, harga, BPOM, dan alergi individual
  tidak tersedia.
- Artifact wajib diretrain dan direview setelah dataset berubah.
