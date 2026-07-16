# Apps contributor guide

## Always apply (inherited)

Ikuti selalu aturan repo-root `../AGENTS.md`:

- **graphify** — query graph dulu untuk pertanyaan codebase; `graphify update .` setelah ubah kode.
- **ponytail** — solusi paling minimal yang bekerja (YAGNI, reuse, stdlib, no bloat). Default intensitas: **full**.

## Scope

`Apps` adalah aplikasi web utama SkinSafe AI. Aplikasi ini memakai Next.js App Router sebagai:

- PWA frontend untuk halaman web dan pengalaman offline.
- REST Backend-for-Frontend (BFF) untuk endpoint HTTP di `src/app/api`.
- Modular monolith dengan Prisma sebagai database client.

Service AI Python/FastAPI berada di `../AI`. Dokumentasi produk dan arsitektur berada di `../Docs`. `../DESIGN.md` adalah sumber utama untuk token visual, layout mobile-first, semantic safety color, dan pola komponen UI.

## Stack and runtime

- Node.js `>=20.9.0`.
- Next.js `16.2.10`, React `19`, TypeScript, Tailwind CSS v4, dan shadcn/ui.
- TanStack Query (`@tanstack/react-query`) untuk client-side data fetching.
- Prisma `6.x` dan PostgreSQL lokal.
- Tidak menggunakan Docker atau Docker Compose untuk development maupun database aplikasi.

Sebelum mengubah kode Next.js, baca dokumentasi versi yang terpasang di `node_modules/next/dist/docs/`. Next.js versi ini memiliki perubahan API dan konvensi yang tidak boleh diasumsikan dari versi lama.

## Repository layout

```text
Apps/
├── prisma/                 # Schema dan lifecycle database Prisma
├── public/                 # Manifest, service worker, icon, dan asset publik
└── src/
    ├── app/                # Route fisik, page, layout, metadata, dan API handler
    ├── modules/            # Domain modules: route, actions, service, aggregator
    └── shared/             # Komponen UI, utility, env validation, Prisma singleton
```

Gunakan `Docs/frontend` untuk keputusan frontend/PWA dan `Docs/backend` untuk kontrak REST serta arsitektur backend. Jika perubahan mengubah kontrak atau struktur, perbarui dokumentasi yang relevan.

## Module boundaries

Setiap domain di `src/modules/<name>` mengikuti layer berikut:

- `route/`: handler HTTP tipis; validasi input dan mapping response boleh dilakukan di sini.
- `actions/`: Server Actions untuk mutation yang dipanggil UI.
- `service/`: business logic dan akses data milik module.
- `aggregator/`: komposisi read-only dari public API module lain.
- `index.ts`: public API module.

Aturan dependency:

- Route fisik di `src/app/api/**/route.ts` hanya mendelegasikan ke module route.
- Cross-module import wajib melalui `@/modules/<name>` dan public `index.ts`.
- Jangan mengimpor `service`, `actions`, `aggregator`, atau `route` module lain secara langsung.
- Di dalam module sendiri, gunakan relative import.
- `src/shared` tidak boleh bergantung pada module domain.
- Jangan mengembalikan Prisma model mentah dari boundary HTTP; map ke DTO/response contract.
- Business logic tidak boleh ditaruh langsung di page atau Route Handler.

Saat membuat domain baru, buat empat folder layer dan barrel `index.ts`, walaupun sebagian layer masih berupa placeholder. Jangan mengekspos mutation internal melalui barrel read-only.

## Frontend and PWA conventions

- Gunakan Server Components secara default; tambahkan `"use client"` hanya saat membutuhkan state, event handler, browser API, atau library client.
- Letakkan reusable UI di `src/shared/components`; gunakan komponen shadcn yang sudah ada sebelum membuat primitive baru.
- Letakkan utility lintas fitur di `src/shared/lib`.
- Jangan menghidupkan kembali path legacy `src/components` atau `src/lib`.
- Pertahankan metadata, manifest, service worker, dan halaman `/offline` saat mengubah shell aplikasi.
- Semua akses browser-only harus berada di Client Component dan aman terhadap SSR.
- Untuk perubahan UI, pertahankan aksesibilitas, responsive layout, loading state, error state, dan empty state.

### Styling (Tailwind utility-first)

- Styling default memakai utility Tailwind v4 langsung di JSX. `globals.css` hanya berisi: import font/Tailwind, token di `:root` + `@theme inline`, base reset yang dibungkus `@layer base` (`*`, `html`, `body`, reset margin heading/`p`, `a`, `button`, focus-visible), dan CSS yang genuinely kompleks/dekoratif (pseudo-element & keyframe): ilustrasi botol produk (`.product-mark`/`.product-thumbnail`), bingkai viewfinder scan (`.viewfinder`/`.corner*`/`.scan-beam`), garis `.divider`, ilustrasi offline (`.offline-visual`/`.cloud*`/`.connection-dot`), dan spinner `.spin`. Base reset WAJIB di dalam `@layer base` supaya utility (mis. `text-white`) selalu menang atas default elemen seperti `a`/`button { color: inherit }`; kalau tidak, CSS unlayered akan mengalahkan utility Tailwind. Jangan menambah class komponen baru di CSS untuk hal yang bisa jadi utility.
- Token warna/shadow ada sebagai utility lewat `@theme inline` (mis. `bg-surface-lowest`, `text-safe`, `shadow-card`, `border-outline-variant`). Selektor `data-*`/`aria-*` jadi variant (`data-[active=true]:`, `aria-selected:`). Nilai non-token pakai arbitrary value (`text-[0.62rem]`, `rounded-[20px]`).
- Tombol app memakai komponen shadcn `Button` di `src/shared/components/ui/button.tsx` dengan `variant` `primary` (ungu `#6d28d9`), `secondary` (bg putih + border), atau `text`, plus `size="pill"`; pakai `asChild` untuk merender elemen lain (`<Link>`/`<label>`/`<a>`). Primitive utility lintas halaman ada di `src/shared/components/primitives.tsx` (`MicroLabel`, `BrandLockup`, `IconButton`, `CardIcon`, `Chip`). Shell halaman memakai `src/shared/components/page-main.tsx` (`PageMain`). Gabungkan/override class dengan `cn` dari `src/shared/lib/utils`.

### Page/client split & data fetching

- Setiap `page.tsx` di folder route hanya berisi wiring: metadata, `prefetchQuery` (jika ada data) via module service langsung + `<HydrationBoundary>`, dan import komponen tampilannya dari `src/app/components/`. Folder route (misal `history/`, `scan/`) hanya boleh berisi `page.tsx` dan file spesial Next.js lain (`layout.tsx`, `route.ts`).
- Semua komponen presentational/client untuk halaman (view, switcher, header) disimpan di `src/app/components/<halaman>/` (satu subfolder per halaman: `home/`, `scan/`, `history/`, `profile/`, `offline/`) — **bukan** co-located di folder route masing-masing. Folder ini aman dari routing Next.js karena tidak berisi `page.tsx`/`route.ts`/`layout.tsx`. Import dari `page.tsx` memakai alias `@/app/components/<halaman>/<nama>` (contoh: `@/app/components/history/history-view`, `@/app/components/home/home-mode-switcher`). Komponen yang dipakai beberapa view di halaman yang sama (mis. `home/home-header.tsx` dipakai oleh with-profile & onboarding) tetap di subfolder halaman tersebut.
- Komponen di `src/app/components/` hanya diberi `"use client"` bila memang butuh hook, browser API, atau `useQuery`; komponen tanpa data dinamis tetap Server Component.
- Kalau halaman punya data yang bisa berubah: `page.tsx` prefetch via module service (import langsung, bukan HTTP) lalu dehydrate; komponen client di `src/app/components/` memanggil `useQuery` ke endpoint BFF `/api/v1/<module>/...` milik module yang sama — client tidak pernah memanggil service/Prisma langsung.
- Satu-satunya sumber `QueryClient`: `src/shared/lib/query-client.ts` (`getQueryClient()`), di-provide oleh `src/shared/components/query-provider.tsx` yang dipasang sekali di `layout.tsx`.
- `src/app/components/` berbeda dari `src/shared/components/`: yang pertama khusus komponen tampilan tiap halaman (page-specific), yang kedua untuk UI benar-benar reusable lintas halaman (nav, provider, dsb).

## API, environment, and security

- Endpoint publik memakai prefix `/api/v1` dan response JSON yang konsisten.
- Health endpoint: `GET /api/v1/health`; HTTP `200` berarti dependency sehat, `503` berarti degraded.
- Database connection harus divalidasi melalui `src/shared/lib/env.ts` dan Prisma singleton di `src/shared/prisma/client.ts`.
- Salin `.env.example` menjadi `.env` untuk development dan isi kredensial PostgreSQL lokal yang valid.
- Jangan commit `.env`, secret, token AI, atau kredensial database.
- Hanya variabel berprefix `NEXT_PUBLIC_` yang boleh dibaca client-side.
- `AI_SERVICE_TOKEN`, `DATABASE_URL`, dan konfigurasi server lain wajib tetap server-only.
- Jika memanggil `../AI`, gunakan `AI_SERVICE_URL` dan autentikasi server-side; jangan expose token ke browser.

## Local commands

Jalankan dari folder `Apps`:

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
npm audit
```

Database commands:

```bash
npm run db:migrate
npm run db:studio
```

Di Windows, hentikan `npm run dev` sebelum `npm run db:generate` jika Prisma engine sedang terkunci dan menghasilkan error `EPERM`.

## Change workflow

1. Baca dokumentasi terkait dan pahami module boundary sebelum mengubah kode.
2. Pertahankan perubahan tetap terlokalisasi pada domain yang relevan.
3. Jalankan lint dan build setelah perubahan TypeScript, route, schema, atau konfigurasi.
4. Jika schema Prisma berubah, jalankan `db:generate` dan gunakan migration yang sesuai; jangan mengubah database produksi dari development command.
5. Periksa `git diff`, `git diff --check`, dan status secret sebelum commit.
6. Jangan menambahkan Docker setup atau dependensi lintas module yang melewati public API.
