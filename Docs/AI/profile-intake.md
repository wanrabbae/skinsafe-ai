# Profile Intake and Personalized Recommendation

## Alur

```text
PWA story / A-D answers
  -> Next.js BFF validation
  -> deterministic Indonesian profile resolver
  -> completeness, contradiction, pregnancy, and red-flag gates
  -> local product ranker
  -> deterministic ingredient safety adjustment
  -> evidence, cautions, literacy, and limitations
```

Tidak ada API LLM pada alur ini. Parser memakai vocabulary dan negation
handling lokal. Input seperti `tidak hamil`, `tidak sensitif`, dan `tidak
sesak napas` diuji agar tidak dibaca sebagai kondisi positif.

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
