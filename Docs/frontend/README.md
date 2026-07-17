# Frontend — Next.js PWA

Frontend adalah PWA mobile-first di `Apps/web`, dibangun dengan Next.js App Router, TypeScript, React, dan Tailwind CSS. UI hanya berkomunikasi dengan REST API Next.js di origin yang sama.

## Dokumen

- [architecture.md](./architecture.md): boundary, struktur source, rendering, dan data flow.
- [routes-and-journeys.md](./routes-and-journeys.md): route, page contract, state, dan user journey.
- [components-and-state.md](./components-and-state.md): komponen, ownership state, form, dan error UI.
- [pwa.md](./pwa.md): manifest, service worker, installability, caching, dan offline behavior.
- [quality.md](./quality.md): accessibility, performance, security browser, analytics, dan testing.

## Definition of done frontend

- Core flow dapat diselesaikan pada viewport 360 px tanpa horizontal scroll.
- Semua input memiliki label, error terkait field, dan keyboard flow yang benar.
- Report tetap dapat dipahami tanpa mengandalkan warna saja.
- Loading scan menjelaskan progress dan menyediakan recovery ketika gagal.
- PWA dapat di-install, memiliki manifest valid, dan offline page tidak menampilkan data palsu.
- Tidak ada API key provider AI di browser bundle.
