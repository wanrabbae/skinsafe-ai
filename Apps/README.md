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

Jalankan FastAPI lokal pada `AI_SERVICE_URL` sebelum membuka halaman `/test`
(cara cepat: `bash ../AI/run.sh`). Browser hanya memanggil BFF
`/api/v1/profile-intake/*`; service token tidak pernah dikirim ke client.
Halaman kuis mendukung cerita bebas dan empat pertanyaan A-D, lalu menampilkan
profil terstruktur, clarification/red flag, dan produk yang diranking model
lokal di `/test/hasil`.

Hasil profil disimpan client-side di `localStorage`
(`src/modules/profile/profile-storage.ts`) sehingga Beranda menampilkan varian
"sudah ada profil" dan tetap bertahan setelah refresh; hapus profil dari
`/test/hasil` untuk kembali ke varian onboarding. Data ini belum dipersist ke
database sampai alur auth serta consent tersedia.

Buka `http://localhost:3000`. Rute utama: `/` (Beranda), `/test` & `/test/hasil`
(kuis profil), `/scan`, `/recommendation`, dan `/offline`.

## Struktur

- `src/app`: page, layout, metadata, dan Route Handler fisik.
- `src/modules`: domain module dengan `route`, `actions`, `service`, `aggregator`, dan public `index.ts`.
- `src/shared`: Prisma singleton, env validation, komponen shadcn, dan utility lintas module.
- `prisma`: schema database; pass ini belum memiliki model bisnis.

Database dikelola langsung melalui PostgreSQL lokal dan Prisma. Tidak ada Docker atau Docker Compose dalam setup aplikasi ini.

Cross-module import hanya melalui `@/modules/<name>`. Baca `src/modules/README.md` untuk konvensi boundary.

Dokumentasi lengkap berada di `../Docs/frontend` dan `../Docs/backend`.
