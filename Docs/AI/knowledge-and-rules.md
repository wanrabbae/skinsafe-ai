# Knowledge Base and Rule Engines

## Ingredient dictionary

Minimal record:

```text
canonical_name, display_name, aliases, categories
benefits[], cautions[], contraindications[]
good_for[], avoid_if[]
pregnancy_policy allowed|caution|avoid|insufficient_evidence
risk_weight, evidence_refs[], reviewed_at, version
```

Risk harus kontekstual; ingredient tidak dilabel “buruk” secara universal kecuali banned/prohibited pada konteks regulasi yang relevan. Data menyimpan alasan dan sumber review.

## INCIDecoder signal layer

`chem_full.csv` hanya mencakup ~101 bahan — jauh lebih sempit dari 15–40 INCI per produk skincare nyata. `AI/app/inci_signals.py` menutup gap ini sebagai **lapisan penilaian kedua yang independen dari CSV**:

- Sumber: file batch `scripts/incidecoder/data/*.json` (hasil scrape brand lokal), bukan pencarian live.
- Dimuat sekali di startup menjadi index `INCI name (dinormalisasi) → IngredientSignal`, singleton lewat `get_signals()` (pola sama seperti `get_store()`).
- Field per bahan: `irritancy` (int, 0–~5), `comedogenicity` (int, 0–5), `functions` (tuple tag bersih, mis. `exfoliant`, `anti-acne`, `moisturizer/humectant`), `rating` (`superstar`/`goodie`/`icky`).
- Cleaning saat load: tag `functions` INCIDecoder membawa zero-width space (`U+200B`, mis. `moisturizer/\u200bhumectant`) yang di-strip; nilai rentang seperti `"0-2"` diambil batas atasnya (sisi aman); data dari beberapa produk untuk bahan yang sama di-merge (ambil nilai maksimum, union `functions`).
- Loader defensif: bila folder data tidak ada, index kosong dan engine fallback ke perilaku CSV-only — tidak membuat request gagal.
- Cakupan (2026-07-17): ~4.100 bahan unik ter-index dari 22 file brand.

Ingredient yang tidak ada di `chem_full.csv` **tetap dinilai** selama punya sinyal (`IngredientReport.chemical is None` tapi `risk_level != "unresolved"`) — inilah yang menutup gap coverage KB kecil.

## BPOM verifier

Status internal:

- `verified_match`: number valid dan product/brand match.
- `mismatch`: number ditemukan tetapi identity tidak cocok.
- `not_found`: format dapat dibaca tetapi dataset tidak menemukan record.
- `no_visible_number`: input tidak menyediakan nomor.
- `revoked_or_dangerous`: record revoked/dangerous.
- `unknown`: dataset/provider tidak dapat menentukan.

Mock dataset harus diberi label jelas. “Not found” pada dataset mock tidak boleh ditampilkan seolah hasil live registry.

## Overclaim detector

Categories: `instant_result`, `medical_claim`, `absolute_claim`, `racikan_red_flag`, `aggressive_whitening`. Matching memakai exact phrase, normalized regex, dan optional semantic classifier. Semantic match harus mengembalikan source phrase dan threshold; low-confidence finding tidak masuk hard gate.

## Ingredient analyzer

Untuk setiap ingredient, evaluasi base safety, profile modifiers, condition modifiers, pregnancy policy, dan interaction notes. Output groups: beneficial, neutral, caution, high risk, unresolved. Severity memiliki reason code yang stabil.

`IngredientAnalyzer._assess_risk()` (`AI/app/engine.py`) menggabungkan CSV dan signal layer di atas dengan aturan deterministik berikut, dievaluasi berurutan:

| Sinyal | Kondisi profil | Hasil |
|---|---|---|
| Nama mengandung `hydroquinone`/`mercury`/`merkuri` | selalu | `high_risk` |
| `comedogenicity` ≥ 2 | `skin_type` oily/combination, atau concern mengandung acne/jerawat | `caution` |
| `irritancy` ≥ 2 | `skin_type` sensitive, `sensitivity_level` high, atau `conditions` mengandung damaged_barrier | `caution` |
| Kategori exfoliant/retinoid | `skin_type` sensitive | `caution` |
| CSV `target` menyebut skin type user secara negatif | — | `caution` (sinyal lemah, lihat catatan G5 di bawah) |
| CSV `symptoms` cocok dengan `concerns` user | — | `beneficial` |
| `rating` superstar/goodie & `functions` cocok concern (via `_CONCERN_FUNCTION_MAP`) | concern cocok | `beneficial` |
| CSV `target` menyebut skin type user secara positif | — | `beneficial` (sinyal lemah) |
| Tidak ada match di atas | — | `neutral` |

Kategori bahan (`_classify()`) mengutamakan tag `functions` INCIDecoder (exfoliant, antioxidant, moisturizer) dan nama untuk retinoid (INCIDecoder tidak punya tag retinoid tersendiri); klasifikasi teks bebas CSV `type` jadi fallback saat `functions` tidak tersedia.

## Skin compatibility

Rules merupakan matrix ingredient/category × skin type/condition/sensitivity. Contoh: sensitizer meningkatkan caution untuk sensitivity high; strong exfoliant lebih berat pada damaged barrier; occlusive dapat membantu dry/barrier tetapi kurang ideal pada sebagian acne-prone user. Jangan menyimpulkan alergi individual.

`SkinCompatibilityEngine.evaluate()` mulai dari baseline 85 dan menerapkan modifier berbasis signal layer selain modifier CSV yang sudah ada:

- `comedogenicity` ≥ 2 pada skin type oily/combination → −4 per bahan.
- `rating` = `icky` → −3 per bahan (penalti ringan, independen dari risk_level).
- `risk_level` caution → −8; `high_risk` → −20; `beneficial` → +2.
- Sensitivity high atau `damaged_barrier`: −10/−15 per bahan exfoliant/retinoid — deteksi kategori kini memakai `functions`, jadi berlaku juga untuk bahan yang hanya dikenal lewat signal layer (bukan hanya yang ada di CSV).

Ketergantungan pada teks bebas `target` diturunkan menjadi sinyal sekunder; aturan numerik (`irritancy`/`comedogenicity`) dan kategori (`functions`) menjadi penentu utama.

## Routine conflicts

MVP conflict codes:

- `retinoid_exfoliant_frequency`
- `multiple_exfoliants`
- `strong_active_no_spf`
- `damaged_barrier_strong_active`
- `duplicate_active_load`

Rule membutuhkan active category, frequency bila tersedia, dan profile context. Jika frequency tidak tersedia, phrasing menjadi pertanyaan/caution, bukan konflik pasti.

## Rule format

Rule data sebaiknya deklaratif: `id`, `version`, `when`, `severity`, `scoreImpact`, `messageKey`, `evidenceRefs`. Rule engine mencatat rule ID yang fired agar report reproducible dan dapat diaudit.
