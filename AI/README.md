# SkinSafe AI Service

FastAPI service dengan hybrid local ML untuk rekomendasi skincare dan
deterministic safety rules. Tidak ada OpenAI, Gemini, Claude, atau API LLM lain
di training maupun inference.

## Yang sudah tersedia

- analisis ingredient manual dengan normalisasi parenthesis-aware;
- safety gate bahan terlarang, low-confidence, kehamilan/menyusui, kulit
  sensitif, damaged barrier, dan konflik rutinitas;
- local multi-label logistic ranker untuk 12 concern;
- 501 produk lokal hasil kurasi fixture scripts/incidecoder;
- alasan rekomendasi, evidence ingredient, caution, confidence, dan literasi;
- ingredient knowledge endpoint dari chem_full.csv;
- artifact model JSON yang reproducible dan dapat dipakai tanpa GPU.

Model relevansi tidak menentukan verdict keselamatan. Keputusan kritis selalu
diterapkan sesudah prediksi melalui rule yang deterministic.

## Setup

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m pytest -q
fastapi dev app/main.py
```

## Training lokal

Jalankan dari folder AI:

```powershell
python training/train_recommender.py
```

Trainer membaca data/chem_full.csv, data/symp_to_chem_names.csv, dan
../scripts/incidecoder/data/*.json.

Output:

- models/recommender-v1.json: weights, threshold, metrik, checksum, dan versi;
- data/local_product_catalog.json: katalog runtime yang sudah dibersihkan.
- images/local-recommender-2026.07.1/training-metrics.svg: train loss,
  validation loss, validation F1, dan final F1 per concern;
- images/local-recommender-2026.07.1/training-history.json: raw metric per epoch.

Training menggunakan feature hashing dan one-vs-rest logistic regression yang
diimplementasikan dengan Python standard library. Label merupakan weak
supervision dari reviewed chemical links, ingredient functions, dan explicit
product intent. Lihat models/MODEL_CARD.md sebelum menafsirkan metrik.

## Endpoint

- GET /health/live
- GET /health/ready
- POST /internal/v1/analyses
- POST /internal/v1/recommendations
- GET /internal/v1/ingredients/{ingredient_name}

Set AI_SERVICE_TOKEN di luar local development. Browser/PWA tidak boleh
memanggil service ini langsung; Next.js BFF meneruskan request server-side.

## Batasan penting

- Metrik saat ini mengukur agreement terhadap weak labels, bukan outcome klinis.
- Data katalog tidak memuat harga dan tidak membuktikan status BPOM.
- Confidence rekomendasi dibatasi maksimum medium sampai tersedia golden set
  yang direview dokter/domain expert.
- Jalur kamera/OCR belum dilatih karena repo belum memiliki labeled image
  dataset; gunakan manual ingredient input sebagai fallback yang aman.
- Produk dan medical/regulatory rules perlu review manusia sebelum production.
