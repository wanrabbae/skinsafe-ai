# SkinSafe AI Web

Next.js 16 PWA dan REST Backend for Frontend dengan struktur modular monolith.

## Menjalankan lokal

Pastikan PostgreSQL lokal sudah aktif. Buat database/user `skinsafe` atau sesuaikan `DATABASE_URL` di `.env` dengan kredensial PostgreSQL milikmu.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev
```

Jalankan FastAPI lokal pada `AI_SERVICE_URL` sebelum membuka halaman
`/profile`. Browser hanya memanggil BFF `/api/v1/profile-intake/*`; service
token tidak pernah dikirim ke client. Halaman mendukung cerita bebas dan empat
pertanyaan A-D, lalu menampilkan profil terstruktur, clarification/red flag,
dan produk yang diranking model lokal.

Hasil profil terbaru juga dipakai oleh kartu kesiapan dan wawasan di Beranda
selama navigasi client-side. Data ini hanya berada di memory query cache dan
tidak dipersist ke browser atau database sampai alur auth serta consent
tersedia; setelah full refresh aplikasi kembali menampilkan profil belum diisi.

Buka `http://localhost:3000`. Health check tersedia di `GET http://localhost:3000/api/v1/health` dan mengembalikan HTTP 200 jika Postgres sehat atau 503 jika database tidak tersedia.

## Struktur

- `src/app`: page, layout, metadata, dan Route Handler fisik.
- `src/modules`: domain module dengan `route`, `actions`, `service`, `aggregator`, dan public `index.ts`.
- `src/shared`: Prisma singleton, env validation, komponen shadcn, dan utility lintas module.
- `prisma`: schema database; pass ini belum memiliki model bisnis.

Database dikelola langsung melalui PostgreSQL lokal dan Prisma. Tidak ada Docker atau Docker Compose dalam setup aplikasi ini.

Cross-module import hanya melalui `@/modules/<name>`. Baca `src/modules/README.md` untuk konvensi boundary.

Dokumentasi lengkap berada di `../Docs/frontend` dan `../Docs/backend`.
