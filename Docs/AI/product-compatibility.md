# Report: Kesesuaian AI untuk Skor Produk (BPOM Trust + Kecocokan Kandungan)

Status: **terverifikasi terhadap kode 2026-07-17** • Ruang lingkup: `AI/app/` (engine skoring) • Terkait flow scan baru (`Docs/frontend/scanpage-flow.md`).

## Status implementasi (2026-07-17)

**G1, G2, G4, G5, G7 — DONE.** Diimplementasikan sesuai rencana di [`scan_result_scoring_api_72783de8.plan.md`](/Users/septianpadli/.cursor/plans/scan_result_scoring_api_72783de8.plan.md); endpoint `/api/v1/scans/analyze` dan kontraknya tidak berubah, hasil tetap di localStorage. Detail teknis rule & data sudah dipindah ke dokumen spesifikasi permanen supaya tidak duplikat:

- Signal layer, aturan risk/compatibility deterministik → `Docs/AI/knowledge-and-rules.md` (section "INCIDecoder signal layer", "Ingredient analyzer", "Skin compatibility").
- Dampak ke confidence/coverage → `Docs/AI/scoring-and-safety.md` (section "Confidence score").
- Field baru di response → `Docs/AI/contracts.md` (section "Ingredient detail signals").
- Posisi dataset baru dalam arsitektur → `Docs/AI/architecture.md`.

Bukti nyata (Pixy Cushion, 45 bahan): unresolved turun dari mayoritas → 5/45, confidence 86; skor kini diskriminatif per profil — oily/acne → 58 (`use_with_caution`), dry → 76 (`generally_ok`). Tes: `AI/tests/test_inci_signals.py` (13 tes baru) + full suite 132 passed.

Ditunda: **G3 (BPOM)** dikesampingkan sesuai keputusan — `bpom_number` null tetap aman (baseline 20 + limitation); jangan naik ke `recommended` tanpa BPOM (gate low_confidence). **G6 (kanonikalisasi concern)** menyusul; peta minimal concern to functions sudah ada di `_CONCERN_FUNCTION_MAP` untuk boost beneficial.

## Bagaimana skor dihitung sekarang (yang saya pahami)

`analyze()` (`AI/app/scoring.py:189`) menghasilkan `overall_score` dari **formula berbobot tetap** (`AI/app/scoring.py:380`):

`overall = 0.25·bpomTrust + 0.25·ingredientSafety + 0.20·(100−overclaim) + 0.15·skinCompatibility + 0.10·(100−routineConflict) + 0.05·dataConfidence` (bobot berjumlah 1.0).

Lalu `band()` memetakan ke status (`recommended`/`generally_ok`/`use_with_caution`/`high_caution`/`avoid`), dan **hard gates** menurunkan status untuk prohibited, pregnancy-active, dan low-confidence (`AI/app/scoring.py:390`).

Dua dimensi yang diminta user memetakan langsung ke sub-score:

- **Trusted BPOM → `bpomTrust`**: `_bpom_score()` (`AI/app/scoring.py:152`) — verifikasi live ke registry cekbpom (`verify_bpom()` `AI/app/bpom.py`). Skor: 30 (ditemukan & aktif) → 25 (format valid tapi registry tak terjangkau) → 20 (tanpa nomor) → 10 (format salah / tak ditemukan) → 8 (ditemukan tapi non-aktif).
- **Kecocokan kandungan → `skinCompatibility`**: `SkinCompatibilityEngine.evaluate()` (`AI/app/engine.py:308`) — baseline 85, plus/minus dari `risk_level` tiap bahan + modifier `sensitivity_level` & `damaged_barrier`.

## Konteks & keputusan

Tujuan: menghitung skor produk dari **(1) trusted BPOM** dan **(2) kecocokan kandungan produk ke skin profile user**, dengan tiga keputusan:

1. **Komponen skor lain tetap dipertahankan** (overclaim, ingredientSafety, routineConflict, confidence) — bukan disederhanakan jadi 2 komponen.
2. **Nomor BPOM akan datang dari Postgres** (dikerjakan paralel). Untuk sekarang cukup pastikan kontraknya siap.
3. **Sinyal INCIDecoder ditambahkan** (`irritancy`, `comedogenicity`, `functions`, `rating`) sebagai input penilaian.

## Verifikasi data (profiling 2026-07-17)

- `chem_full.csv` = **101 bahan** (102 baris termasuk header) — mengonfirmasi G1.
- Data INCIDecoder: **22 file brand**, **77.541 baris ingredient**; **36.880 (~48%) punya ≥1 sinyal**. Distribusi: `irritancy` {0:15.379, 1:1.033, 2:782, 3:848, 4:55}; `comedogenicity` {0:10.642, 1:3.767, 2:2.422, 3:926, 4:325, 5:15}; `rating` {goodie:14.245, icky:6.737, superstar:4.470}. → sinyal G2 nyata & padat, layak jadi lapisan penilaian utama.
- Struktur ingredient JSON: `{name, slug, functions[], irritancy, comedogenicity, rating}` (nilai null bila tak ada).
- **Catatan cleaning (baru):** label `functions` mengandung **zero-width space `U+200B`** (mis. `"moisturizer/\u200bhumectant"`, `"surfactant/\u200bcleansing"`, `"antimicrobial/\u200bantibacterial"`). Wajib di-strip saat impor, kalau tidak matching tag akan gagal senyap.

## Yang sudah benar (jangan ditulis ulang)

- Formula berbobot sudah ada dan sesuai `Docs/AI/scoring-and-safety.md` — `AI/app/scoring.py:380`.
- `bpomTrust` sudah verifikasi live registry — `_bpom_score()` `AI/app/scoring.py:152`, `verify_bpom()` `AI/app/bpom.py:134`.
- `skinCompatibility` sudah pakai `skin_type`, `sensitivity_level`, `conditions` — `SkinCompatibilityEngine.evaluate()` `AI/app/engine.py:308`.
- Hard safety gates (prohibited, pregnancy, low-confidence) sudah ada — `AI/app/scoring.py:390`.

Arsitektur engine tidak perlu dirombak. Semua temuan di bawah adalah perbaikan **di dalam** struktur yang sudah ada.

---

## Temuan (gap) & perbaikan

### G1 — Knowledge base terlalu kecil → mayoritas ingredient `unresolved` (PRIORITAS TERTINGGI)

- **Masalah:** `chem_full.csv` hanya berisi **101 bahan** (`AI/data/chem_full.csv`, terverifikasi). Produk skincare Indonesia dari INCIDecoder umumnya 15–40 INCI per produk. Ingredient yang tak ada di CSV → `unresolved` (`AI/app/normalizer.py:166`) → tidak dinilai oleh `IngredientAnalyzer` maupun `SkinCompatibilityEngine`.
- **Dampak:** `skinCompatibility` bertumpu pada baseline 85 (`AI/app/engine.py:322`) dan hampir tidak bergerak karena kebanyakan bahan di-skip. Skor jadi **optimistik palsu** untuk produk nyata. Ini penyebab #1 hasil tidak akurat.
- **Interaksi tersembunyi (baru):** `dataConfidence` memberi bobot **0,45 total** pada `resolution_ratio` (dihitung dua kali di `AI/app/scoring.py:369` — koefisien 0.30 + 0.15). Karena KB kecil, resolution_ratio produk nyata rendah → `confidence_score` < 60 → gate `low_confidence_max_use_with_caution` (`AI/app/scoring.py:399`) **mengunci status maksimal di `use_with_caution`**. Jadi G1 tidak cuma bikin skor optimistik, tapi juga membuat produk nyata mustahil mencapai `recommended`. Memperbesar coverage (G1/G2) melonggarkan kunci ini secara aman.
- **Perbaikan:**
  - Manfaatkan data INCIDecoder yang sudah ada (`scripts/incidecoder/data/*.json`) sebagai **lapisan penilaian kedua** yang tidak bergantung pada `chem_full.csv` (lihat G2). Jadi ingredient tetap dinilai lewat `irritancy`/`comedogenicity`/`functions` walau tidak ada di CSV.
  - Perlakukan `chem_full.csv` sebagai sumber "penjelasan/edukasi" (benefits, compatible/incompatible), bukan satu-satunya gerbang penilaian.

### G2 — Sinyal INCIDecoder belum dipakai sama sekali (keputusan #3)

- **Masalah:** Data hasil scrape punya `irritancy` (0–4), `comedogenicity` (0–5), `functions` (tag: `exfoliant`, `anti-acne`, `soothing`, `moisturizer/humectant`, `antioxidant` — lihat catatan `U+200B` di atas), dan `rating` (`superstar`/`goodie`/`icky`). Engine tidak membacanya sama sekali. Skala terverifikasi dari data: irritancy hingga 4, comedogenicity hingga 5.
- **Dampak:** Kehilangan sinyal deterministik yang justru paling relevan untuk kecocokan kulit.
- **Perbaikan (usulan aturan, deterministik):**

  | Sinyal | Kondisi profil | Efek pada skor |
  |---|---|---|
  | `comedogenicity` ≥ 2 | `skin_type` oily / combination, atau `concerns` mengandung acne | penalti kecocokan |
  | `irritancy` ≥ 2 | `sensitivity_level` = high, atau `conditions` = damaged_barrier | penalti kecocokan |
  | `functions` = exfoliant/retinoid (kuat) | sensitif tinggi / barrier rusak | penalti + finding caution |
  | `rating` = icky | semua | penalti ringan ingredientSafety |
  | `rating` = superstar/goodie & `functions` sesuai concern | concern cocok | boost kecil |

  - Nilai `irritancy`/`comedogenicity` bisa berupa rentang (mis. `"0-2"`); ambil batas atas untuk sisi aman.
  - Skala INCIDecoder: irritancy 0–~5, comedogenicity 0–5. Simpan sebagai integer saat impor ke Postgres.
  - Implementasi: tambahkan sumber sinyal ini di `SkinCompatibilityEngine.evaluate()` dan `IngredientAnalyzer._assess_risk()` sebagai fallback/penguat ketika `chemical` dari CSV tidak ada.

### G3 — Kontrak nomor BPOM untuk flow produk baru (keputusan #2)

- **Masalah:** `bpomTrust` butuh `input.bpom_number` (`AI/app/scoring.py:285`). Produk dari INCIDecoder tidak punya nomor BPOM; bila null → skor jatuh ke baseline 20 (`AI/app/scoring.py:160`).
- **Dampak:** Tanpa nomor BPOM, dimensi #1 praktis mati untuk produk hasil scan baru.
- **Perbaikan (siapkan kontrak sekarang, isi datanya nanti):**
  - Record produk di Postgres menyimpan `bpom_number` (nullable) + `bpom_status`/`bpom_active` bila sudah diverifikasi.
  - BFF `Apps` mengirim `bpom_number` dari record Postgres ke `input.bpom_number`.
  - Saat null, jangan menghukum produk melebihi baseline; cukup turunkan `confidence` dan tambahkan limitation "status BPOM belum tersedia" (sebagian sudah ada di `AI/app/scoring.py:471`). Pastikan tidak menaikkan status ke `recommended` tanpa BPOM.

### G4 — Klasifikasi tipe bahan rapuh (`type` = teks bebas)

- **Masalah:** Kolom `type` di `chem_full.csv` berisi kalimat (mis. "Moisturizer and exfoliator."), bukan kategori. `_classify_type()` (`AI/app/engine.py:138`) & deteksi strong-active menebak lewat keyword.
- **Dampak:** Deteksi exfoliant/retinoid untuk `routineConflict` dan modifier sensitif jadi tidak konsisten.
- **Perbaikan:** Pakai `functions` INCIDecoder (tag bersih) sebagai sumber kategori utama; jadikan keyword-matching CSV sebagai cadangan.

### G5 — Kecocokan skin type parsing free-text `target`

- **Masalah:** `_skin_type_compatible()` (`AI/app/engine.py:152`) mencari substring skin type di kolom `target` yang berupa prosa. Rawan false positive/negative (mis. "all skin types" langsung dianggap beneficial).
- **Dampak:** Sinyal kecocokan skin type bising.
- **Perbaikan:** Turunkan bobot kepercayaan pada `target`; utamakan aturan deterministik dari G2 (functions + irritancy/comedogenicity terhadap skin_type). `target` tetap dipakai untuk teks edukasi.

### G6 — Pemetaan `concerns` → simptom rapuh

- **Masalah:** Match concern user dilakukan via index `symp_to_chem_names.csv` dengan pencocokan string yang dinormalisasi (`AI/app/engine.py:286`, `AI/app/data_loader.py:214`). Label concern dari frontend harus selaras dengan label simptom dataset.
- **Dampak:** Concern yang tak match → tidak ada boost "beneficial", kecocokan under-rated.
- **Perbaikan:** Definisikan daftar concern kanonik + peta sinonim ke tag `functions`/simptom; dokumentasikan di `Docs/AI/knowledge-and-rules.md`.

### G7 — Drift kontrak `method` antara Apps dan AI

- **Masalah:** `AnalysisInput.method` AI menerima `screenshot|packaging_photo|ingredient_photo|manual` (`AI/app/schemas.py:97`), sedangkan route Apps hanya menerima `manual|camera` (`Apps/src/modules/scan/route/scan-analysis.route.ts:18`) dan `scan-ai.service.ts:10` juga mengetik `manual|camera`. Confidence menganggap non-`manual` = OCR (`AI/app/scoring.py:354`).
- **Dampak:** Nilai `camera` **akan ditolak Pydantic (422)** bila sampai dikirim ke AI. Untuk sekarang aman karena `scan-view.tsx:154` selalu mengirim `"manual"`, tapi kontraknya sudah pecah dan flow scan baru (autofill dari INCIDecoder/DB) tetap bersifat `manual`, bukan foto — enum foto praktis tak terpakai.
- **Perbaikan:** Samakan enum di kedua sisi (satu sumber kebenaran), dan pisahkan konsep "sumber data ingredient" (manual/db/scrape) dari "metode capture" (foto/OCR).

---

## Rencana perubahan minimal (urutan)

1. **G3 (kontrak BPOM):** tetapkan field `bpom_number` pada record produk Postgres + pemetaan ke `input.bpom_number`. Tanpa kode AI baru.
2. **G2 (sinyal INCIDecoder):** tambahkan penilaian `irritancy`/`comedogenicity`/`functions` di `SkinCompatibilityEngine` + `IngredientAnalyzer` sebagai lapisan yang tidak bergantung `chem_full.csv`.
3. **G1 (coverage):** jadikan INCIDecoder sumber penilaian utama untuk bahan di luar CSV; CSV untuk edukasi/benefits.
4. **G4/G5:** ganti klasifikasi & kecocokan skin type ke basis `functions` + skala numerik.
5. **G6:** kanonikalisasi concern → functions/simptom.
6. **G7:** rapikan enum `method` lintas Apps/AI.

Bobot formula `overall` tidak diubah (sesuai keputusan #1); yang diperbaiki adalah **kualitas input tiap sub-score**, bukan rumusnya.

## Kontrak data yang dibutuhkan dari Postgres/INCIDecoder

Per bahan yang dikirim ke AI (atau tersimpan di Postgres), idealnya tersedia:

- `name` (INCI), `functions[]`, `irritancy` (int/rentang), `comedogenicity` (int/rentang), `rating`.

Per produk:

- `name`, `brand`, `ingredients[]` (terstruktur seperti di atas), `bpom_number` (nullable), `bpom_status`/`bpom_active` (bila sudah diverifikasi).

Sumber sinyal sudah tersedia di `scripts/incidecoder/data/*.json` sehingga tidak perlu scraping tambahan untuk mulai G2.
