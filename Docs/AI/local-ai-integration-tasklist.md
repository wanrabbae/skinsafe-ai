# Task List: Menyambungkan UI ke AI Lokal

Status audit: beberapa halaman masih memakai data statis/dummy dan belum
memakai output model AI lokal. Dokumen ini memecah pekerjaan menjadi task kecil
yang bisa dikerjakan berurutan. Prinsip **ponytail**: reuse jalur/kontrak yang
sudah ada dulu, jangan bikin endpoint/dependency baru kalau belum perlu.

## Status (update terakhir)

- [x] **#1** `/recommendation` memakai `result.recommendations.products`.
- [x] **#2** `/scan` mengirim input manual ke `/api/v1/scans/analyze`.
- [x] **#3** `/scan/hasil` merender hasil analisis nyata (+ `scan-storage.ts`).
- [x] **#4** Home: kandungan dianjurkan + "Perlu Diperhatikan" dari model.
- [x] **#5** Home: fallback "Masalah Utama" tidak lagi hardcoded.
- [x] **#6** Verifikasi BPOM live (cekbpom/proxy) menggantikan mock.
- [ ] **#7** Trending Populer & Lacak Perubahan — **di-skip** atas permintaan.

## Ringkasan kondisi saat ini

- BFF `POST /api/v1/scans/analyze` → `analyzeProduct()` → AI `POST /internal/v1/analyses`
  **sudah ada dan jalan**. Yang hilang hanya wiring di UI `/scan`.
- `useProfileResult()` sudah mengembalikan `result.recommendations.products`
  (dari `localStorage`); halaman `/recommendation` mengabaikannya.
- Belum ada route/module/persistence untuk riwayat scan ("Lacak Perubahan").
- Verifikasi BPOM masih format-only terhadap mock dataset di `AI/app/scoring.py`.

---

## 1. `/recommendation`: pakai produk dari hasil model (frontend-only, cepat)

Referensi: `Apps/src/app/components/recommendation/recommendation-view.tsx:31`

- [ ] Hapus array `products` hardcoded (baris 31–45).
- [ ] Render dari `result.recommendations?.products` (tipe sudah ada di
      `profile.types.ts`: `name`, `brand`, `link`, `relevanceScore`,
      `confidence`, `reasons`, `cautions`, `matchingChemicals`).
- [ ] Map `confidence`/`relevanceScore` ke `tone` + `score` untuk ring skor
      (mis. `relevanceScore` → persentase; `confidence` → tone safe/caution).
- [ ] Empty state: kalau `result` ada tapi `recommendations` `null`
      (`canRecommend=false`), tampilkan pesan arahkan lengkapi profil; empty
      state "belum ada profil" yang lama tetap dipertahankan.
- [ ] Perbaiki link tombol "Lihat" (sekarang hardcoded ke `/scan/hasil`).

Acceptance: kartu produk berasal dari `result.recommendations.products`, tidak
ada lagi produk statis, dan tetap punya loading/empty/error state.

---

## 2. `/scan`: kirim input manual/foto ke endpoint analisis

Referensi: `Apps/src/app/components/scan/scan-view.tsx:52`

- [ ] Jadikan `scan-view.tsx` Client Component (`"use client"`) dengan state
      untuk textarea bahan + file terpilih.
- [ ] Tambah `useMutation` (TanStack Query) yang POST ke `/api/v1/scans/analyze`
      dengan payload sesuai `analysisSchema` (`scanId` = `crypto.randomUUID()`,
      `input.method`, `input.ingredientsText`, `profile` dari `useProfileResult`).
- [ ] Ambil `profile` dari `result.resolution.profile` (fallback default aman
      bila belum ada profil, atau arahkan user tes profil dulu).
- [ ] Tombol "Ambil foto"/"Unggah galeri": karena **OCR lokal belum ada**
      (lihat limitations di `scoring.py`), untuk MVP fokuskan submit ke jalur
      teks manual. Foto boleh disimpan sebagai `imageUrls` opsional, tapi
      analisis mengandalkan `ingredientsText`. Beri tahu user bila hanya foto.
- [ ] Handle respons `needs_input` (tampilkan `instructions`) dan error 503.
- [ ] Loading state saat mutation pending.

Acceptance: submit input manual memanggil BFF dan menerima
`CompletedAnalysis`/`NeedsInputAnalysis`; tidak ada elemen input yang mati.

---

## 3. `/scan/hasil`: render hasil analisis nyata

Referensi: `Apps/src/app/components/scan/scan-result-view.tsx:13`

- [ ] Tambah persistence hasil scan mirip `profile-storage.ts`
      (`Apps/src/modules/scan/scan-storage.ts`: `saveScanResult`,
      `useScanResult`) memakai `localStorage` + `useSyncExternalStore`.
      Reuse pola yang sudah ada; jangan bikin React Query server-state.
- [ ] Setelah task #2 sukses, simpan `CompletedAnalysis` lalu `router.push`
      ke `/scan/hasil`.
- [ ] Ganti konstanta statis (`SCORE=85`, `warnings`, `details`, confidence)
      dengan data dari `report`: `overallScore`, `status`, `confidence`,
      `subScores`, `findings`, `ingredientDetails`, `interactionWarnings`.
- [ ] Map `status` → badge ("Direkomendasikan"/"Hati-hati"/"Hindari") dan warna.
- [ ] "Peringatan Terdeteksi" dari `findings`/`interactionWarnings`
      (severity → ikon/warna).
- [ ] "Rincian Analisis" dari `subScores` (`bpomTrust`, `ingredientSafety`,
      `overclaimRaw` → risiko klaim, `skinCompatibility`).
- [ ] Judul produk: pakai `product.name`/`product.brand` bila ada, jika null
      tampilkan fallback netral (bukan "Radiance Glow Serum").
- [ ] Empty/redirect state kalau tidak ada hasil scan tersimpan.

Acceptance: skor, warning, sub-skor, dan confidence semuanya dari `report`.

---

## 4. Home: kandungan "dianjurkan/dihindari" dari hasil model

Referensi: `Apps/src/app/components/home/home-with-profile-view.tsx:51`

- [ ] Hapus array `recommended` & `avoid` statis (baris 51–62).
- [ ] Turunkan dari `result`:
      - "Dianjurkan": dari `recommendations.products[].matchingChemicals`
        (dedup) atau `resolution.profile.concerns` yang dipetakan ke chemical.
      - "Dihindari": dari `recommendations.products[].cautions` /
        `resolution.redFlags`, atau kandungan yang perlu dihindari untuk
        `pregnancyStatus`/`sensitivityLevel`.
- [ ] Bila sumber deskripsi per-kandungan belum tersedia dari kontrak sekarang,
      keputusan: (a) tampilkan nama kandungan tanpa deskripsi, atau
      (b) tambah field di AI. Untuk MVP pilih (a) — hindari over-engineering.
- [ ] Kalau `recommendations` `null`, sembunyikan section atau tampilkan CTA
      lengkapi profil (jangan fallback ke daftar statis).

Acceptance: kandungan berasal dari `result`, bukan array literal.

---

## 5. Home: fallback "Masalah Utama" jangan hardcoded

Referensi: `Apps/src/app/components/home/home-with-profile-view.tsx:26`

- [ ] Hapus `fallbackProblems` statis (baris 26–37).
- [ ] Kalau `problemCodes` kosong, tampilkan empty state / CTA lengkapi profil,
      bukan "Jerawat Aktif" + "Kemerahan" dummy.
- [ ] Pastikan `problems` selalu berasal dari `profile.concerns` +
      `profile.conditions`.

Acceptance: tidak ada masalah kulit dummy saat profil kosong/parsial.

---

## 6. Verifikasi BPOM: ganti mock jadi verifikasi nyata (AI service)

Referensi: `AI/app/scoring.py` (`_bpom_score`), `AI/app/bpom.py`.

Keputusan: verifikasi **live** (bukan dataset lokal). cekbpom.pom.go.id tidak
punya JSON API publik dan diproteksi Cloudflare/reCAPTCHA, jadi implementasi
bersifat env-configurable + degrade dengan aman.

- [x] `AI/app/bpom.py`: `verify_bpom()` melakukan lookup live dengan cache
      (`lru_cache`) dan timeout pendek; gagal jaringan → `checked=False`.
      - `BPOM_VERIFY_URL` (template `{number}`) untuk proxy JSON, mis.
        indonesia-civic-stack `http://localhost:8000/bpom/check/{number}`.
      - Tanpa proxy: best-effort langsung ke `BPOM_BASE_URL` (`all-produk?q=`).
- [x] `_bpom_score` cek terdaftar/aktif: verified+active → 30, unchecked → 25,
      not found → 10, registered-but-inactive → 8. Format invalid tidak memicu
      panggilan jaringan.
- [x] Finding baru `BPOM_NOT_REGISTERED` / `BPOM_NOT_ACTIVE`; `confidence`
      (`bpomTrust`/`dataConfidence`) & `confidence_limitations` menyesuaikan.
- [x] `versions().bpom_dataset` → `cekbpom-live-2026.07`.
- [x] Test di `AI/tests/test_bpom.py` (format invalid tanpa network, parsing
      proxy aktif, kegagalan jaringan = unchecked, integrasi finding).
- [x] Env didokumentasikan di `AI/.env.example`.

Acceptance: skor `bpomTrust` mencerminkan status registrasi live; tanpa proxy
yang reachable, skor turun ke "unchecked" dengan limitation yang jujur.

---

## 7. "Trending Populer" & "Lacak Perubahan" (butuh backend + persistence)

Referensi: `Apps/src/app/components/home/home-onboarding-view.tsx:51` (trending),
`:127` (lacak perubahan)

Ini paling berat karena belum ada data/endpoint. Pecah:

### 7a. Trending Populer
- [ ] Putuskan sumber: ranking produk dari `local_model` tanpa personalisasi
      (top produk global) via endpoint AI baru `GET /internal/v1/trending`,
      atau reuse `/internal/v1/recommendations` dengan profil generik.
- [ ] Tambah BFF route `GET /api/v1/scan/...` atau
      `/api/v1/recommendations/trending` (module tipis) bila diperlukan.
- [ ] Ganti kartu blur "Personalize to see matches" dengan produk nyata +
      persentase match; pertahankan variasi terkunci bila profil belum ada.

### 7b. Lacak Perubahan (riwayat scan)
- [ ] Butuh persistence riwayat. Opsi MVP lokal: simpan daftar hasil scan di
      `localStorage` (reuse `scan-storage.ts` dari task #3, tambah list append),
      atau Prisma bila ingin server-side (ada `prisma/` di Apps).
- [ ] Halaman/section riwayat menampilkan tren skor dari scan tersimpan.
- [ ] Kartu "Lacak Perubahan" di onboarding tetap presentasional sampai ada
      minimal 1 riwayat; jangan bikin grafik palsu.

Acceptance: kedua section terhubung ke data nyata (model/riwayat), atau
menampilkan empty state jujur bila data belum ada.

---

## Urutan eksekusi yang disarankan

1. Task #1 (frontend-only, langsung terlihat).
2. Task #2 + #3 (scan pipeline end-to-end).
3. Task #4 + #5 (home derivations, reuse `result`).
4. Task #6 (AI service, BPOM).
5. Task #7 (paling besar, butuh endpoint/persistence baru).

Setelah mengubah kode, jalankan `graphify update .`, lalu `npm run lint` &
`npm run build` di `Apps/` untuk perubahan TypeScript, dan `pytest` di `AI/`
untuk perubahan scoring.
