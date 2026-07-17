# PWA Specification

## Installability

`app/manifest.ts` mendefinisikan nama, short name, description, `start_url`, `display: standalone`, theme/background colors, dan icon 192/512 px. Root layout menyertakan metadata theme color dan Apple web app capability.

## Service worker

Gunakan service worker native kecil di `public/sw.js` dan registrasi hanya pada production. Strategi cache:

| Resource | Strategi |
|---|---|
| versioned JS/CSS/font/icon | cache-first |
| navigation publik | network-first dengan offline fallback |
| `/api/*`, report, profile, uploads | network-only |
| third-party AI/storage endpoint | tidak di-cache |

Cache harus memiliki version key dan cache lama dibersihkan saat `activate`. Jangan memanggil `skipWaiting` untuk update besar tanpa memberi tahu user; MVP dapat mengaktifkan update pada reload berikutnya.

## Offline behavior

- Landing shell dan penjelasan dasar dapat dibuka dari cache.
- Profile, upload, history, dan report menampilkan status offline yang jujur.
- MVP tidak mengantrikan upload di background karena foto sensitif dan retry semantics kompleks.
- Draft teks boleh dipertahankan di memory; persistence browser harus opt-in jika ditambahkan.

## PWA acceptance checks

- Manifest dapat diambil dengan status 200 dan icon tersedia.
- Service worker scope mencakup aplikasi.
- Reload offline menampilkan fallback, bukan browser error mentah.
- API response privat tidak muncul di Cache Storage.
- Update deploy tidak meninggalkan asset cache yang menyebabkan blank page.
