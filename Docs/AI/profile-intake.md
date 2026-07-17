# Profile Intake and Personalized Recommendation

## Alur

```text
10 generic A-D answers
  -> Next.js BFF validation
  -> deterministic Indonesian profile resolver
  -> completeness, contradiction, pregnancy, and red-flag gates
  -> user accepts SCP OR requests 20-question adaptive refinement
  -> local product ranker
  -> deterministic ingredient safety adjustment
  -> consented product-outcome feedback updates the SCP
  -> evidence, cautions, literacy, and limitations
```

Tidak ada API LLM pada alur ini. Parser memakai vocabulary dan negation
handling lokal. Input seperti `tidak hamil`, `tidak sensitif`, dan `tidak
sesak napas` diuji agar tidak dibaca sebagai kondisi positif.

## SCP lifecycle

1. Semua user menerima 10 pertanyaan generik yang sama.
2. `POST /profile-recommendations` membentuk SCP awal dan, bila safety gate
   lolos, ranked recommendation.
3. Jika user meminta personalisasi, backend memanggil
   `POST /profile-personalization/questions`. Endpoint menghasilkan 20
   pertanyaan kontekstual, menerapkan jawaban akumulatif ke SCP, dan mengurutkan
   ulang pertanyaan tersisa setelah setiap jawaban.
4. Recommendation berikutnya menerima `avoidIngredients` dan
   `excludedProducts` dari SCP yang diperkaya.
5. Setelah produk dicoba, `POST /profile-feedback` mencatat outcome ke SCP.

"Self-learning" di runtime berarti SCP personal langsung berubah dari jawaban
dan outcome user. Model global tidak melakukan online weight update dari satu
feedback karena itu rentan poisoning dan false causal attribution. Bila user
memberi consent, endpoint menghasilkan learning signal terdeidentifikasi untuk
review, evaluasi, dan batch retraining terpisah.

## Recommendation gate

Ranking hanya berjalan jika:

- tipe kulit ditemukan;
- minimal satu concern didukung model;
- status hamil/menyusui dikonfirmasi;
- tidak ada contradiction penting;
- tidak ada red flag yang memerlukan evaluasi medis.

Red flag bukan diagnosis. Sistem menghentikan ranking agar rekomendasi kosmetik
tidak mengalihkan pengguna dari pertolongan yang lebih tepat.

## Evaluation

- Profile golden set: exact field accuracy, concern recall, safety gate.
- Product validation: F1, ROC-AUC, NDCG@10, Recall@10, MAP@10.
- Brand holdout: 54 produk dari 11 brand yang tidak terlihat saat training atau
  threshold tuning.
- Human review: NDCG@10, reviewer agreement, critical false-negative rate.
- Data quality: ingredient coverage, unresolved frequency, brand dominance.

Semua metrik sebelum human review mengukur engineering/weak-label agreement,
bukan outcome klinis.

## Data yang masih membutuhkan pihak eksternal

- Foto kemasan berlabel untuk OCR blur, glare, rotasi, dan layout Indonesia.
- Snapshot BPOM resmi dengan provenance, timestamp, status, dan izin penggunaan.
- Relevance/safety judgment dari dokter kulit, formulator, atau farmasis.
- Consented outcome feedback setelah pengguna mencoba produk.

Data tersebut tidak boleh digantikan label sintetis. Pipeline sudah menyediakan
quality report dan human-review gate agar data baru dapat masuk secara terukur.
