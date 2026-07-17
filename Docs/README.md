# SkinSafe AI Documentation

SkinSafe AI adalah consumer health-literacy assistant untuk membantu pengguna mengevaluasi keamanan produk skincare sebelum membeli atau memakai produk. Produk ini bukan alat diagnosis dan bukan pengganti dokter.

## Arsitektur sistem

```text
Browser / Installed PWA
        │ HTTPS + JSON/multipart
        ▼
Next.js 16 web application
  ├─ React UI + PWA shell
  └─ REST API /api/v1 (BFF, auth, persistence, orchestration)
        │ private HTTP + service credential
        ▼
FastAPI AI service /internal/v1
  ├─ OCR/extraction adapters
  ├─ normalization and evidence
  ├─ deterministic safety rules
  └─ scoring and recommendation generation
        │
        ├─ product/BPOM/ingredient datasets
        └─ optional external vision or LLM provider
```

Browser tidak memanggil AI service secara langsung. Next.js menjadi public API boundary dan satu-satunya komponen yang menyimpan profil, scan, dan report. AI service bersifat internal, stateless, dan menerima snapshot data minimum yang diperlukan untuk analisis.

## Indeks modular

| Area | Dokumen utama | Tanggung jawab |
|---|---|---|
| Frontend | [frontend/README.md](./frontend/README.md) | Next.js App Router, PWA, halaman, komponen, UX, aksesibilitas |
| Backend | [backend/README.md](./backend/README.md) | REST API Next.js, orkestrasi, persistence, security, error contract |
| AI | [AI/README.md](./AI/README.md) | FastAPI, pipeline analisis, rules, datasets, evaluasi, safety |

## Prinsip lintas sistem

1. Evidence before verdict: setiap flag dan rekomendasi harus menunjuk bukti input atau rule yang memicunya.
2. Deterministic safety: keputusan kritis seperti bahan terlarang dan BPOM revoked tidak diserahkan ke LLM.
3. Uncertainty is visible: data yang tidak lengkap menurunkan confidence dan tidak boleh disamarkan sebagai hasil pasti.
4. Privacy by default: gambar privat, retensi terbatas, log tidak menyimpan gambar atau profil sensitif.
5. Versioned contracts: public API menggunakan `/api/v1`; internal AI API menggunakan `/internal/v1`.
6. Graceful fallback: OCR gagal harus berakhir pada input manual, bukan dead end.

## Versi baseline

| Komponen | Baseline | Catatan |
|---|---|---|
| Next.js | 16.2.10 | rilis `latest` stabil saat scaffold dibuat |
| React | 19.2.x | mengikuti template resmi Next.js |
| Node.js | 24 LTS | runtime produksi; Next.js membutuhkan Node.js >=20.9 |
| FastAPI | 0.139.0 | rilis stabil; FastAPI tidak memiliki kanal LTS |
| Python | 3.14 produksi, >=3.12 dev | Python tidak memiliki label LTS; gunakan minor yang masih didukung |

## Scope MVP

Termasuk: profil kulit, upload/manual scan, ekstraksi, verifikasi BPOM berbasis dataset, deteksi overclaim, analisis ingredients, skin compatibility, routine conflicts, score, confidence, report, dan fallback manual.

Di luar scope: diagnosis medis, live BPOM scraping, marketplace integration, telekonsultasi, affiliate link, dan native mobile app.
