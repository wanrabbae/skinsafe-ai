# Routes and User Journeys

## Status implementasi

Route map & journey di bawah adalah **desain target**. Rute yang sudah ada di kode saat ini: `/` (Beranda: varian onboarding vs sudah-ada-profil), `/test` & `/test/hasil` (kuis profil + hasil, menggantikan `/profile`), `/scan` (UI, belum ter-wire ke API), `/recommendation` (placeholder), `/offline`, plus halaman 404. Alur scan berbasis queue (`/scan/[scanId]/loading|report`), `/compare`, `/history`, `/ingredients/[name]`, serta auth/session belum diimplementasi. Navigasi bawah memakai 3 tab: Beranda, Scan, Recommendation.

## Route map

| Route | Tujuan | Auth | Data utama |
|---|---|---|---|
| `/` | value proposition dan CTA | tidak | static |
| `/profile` | buat/edit profil kulit | session | `SkinProfile` |
| `/scan` | upload foto atau input manual | session | upload draft |
| `/scan/[scanId]/loading` | status pemrosesan | session | `ScanStatus` |
| `/scan/[scanId]/report` | hasil dan evidence | session | `SkinSafeReport` |
| `/compare` | pilih dua hasil | session | scan summaries |
| `/compare/[left]-vs-[right]` | perbandingan | session | dua report |
| `/history` | riwayat scan | session | paginated summaries |
| `/ingredients/[name]` | kamus ingredient | publik | `Ingredient` |

## Primary journey

1. Pengguna membuka landing dan memilih “Mulai cek produk”.
2. Jika belum ada profil, pengguna diarahkan ke `/profile`.
3. Pengguna memilih input foto marketplace, kemasan, ingredient list, atau manual.
4. Setelah `POST /api/v1/scans`, UI menerima `scanId` dan pindah ke loading page.
5. Loading page melakukan polling `GET /api/v1/scans/{scanId}/status` pada 1s, 2s, lalu maksimum 3s.
6. `completed` mengarah ke report; `needs_input` mengarah kembali ke scan dengan draft; `failed` menampilkan retry.
7. Report menjelaskan score, confidence, evidence, caution, dan next action.

## Page contracts

### Landing

Sections: hero, problem statement, cara kerja, trust signals, batasan produk, dan footer disclaimer. CTA primer ke profile/scan; CTA sekunder ke penjelasan cara penilaian.

### Profile

Pengguna memilih cerita bebas atau questionnaire empat pertanyaan A-D. Cerita
bebas tetap meminta status hamil/menyusui secara eksplisit dan optional active
routine. Hasil menampilkan profile resolution, confidence, clarification,
red-flag, serta maksimal lima rekomendasi. Red flag dan jawaban kontradiktif
tidak boleh menampilkan ranking produk. Profil belum disimpan sebelum
session/auth dan consent tersedia. Selama fase ini, hasil resolusi AI hanya
dibagikan lewat query cache di memori agar dapat dipakai saat navigasi
client-side ke Beranda. Full refresh mengembalikan UI ke empty state; UI tidak
boleh menggantinya dengan nama, tipe kulit, confidence, atau insight contoh.

### Scan

Terima JPEG, PNG, atau WebP; batas awal 10 MB per file; maksimal tiga gambar. Browser boleh memeriksa tipe/ukuran, tetapi server wajib memvalidasi ulang. Manual fallback menerima BPOM number, claims, dan ingredient text.

### Loading

Progress step bersifat representasi state backend, bukan timer palsu: `queued`, `extracting`, `normalizing`, `evaluating`, `finalizing`. Setelah 20 detik tampilkan “masih diproses” tanpa menyatakan gagal.

### Report

Urutan: product identity, overall score, confidence/limitations, sub-scores, BPOM, claims, ingredients, profile compatibility, routine conflict, recommendation, sources/evidence, disclaimer, actions.

## Exception journey

Jika ingredient atau BPOM tidak terbaca, backend mengembalikan `needs_input` beserta `missingFields` dan nilai yang berhasil diekstrak. UI tidak membuang draft. Pengguna memperbaiki field dan memanggil endpoint resubmit.
