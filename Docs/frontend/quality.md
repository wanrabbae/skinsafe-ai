# Frontend Quality Gates

## Accessibility

- Semantic heading order dan landmark (`header`, `nav`, `main`, `footer`).
- Visible focus, target sentuh minimal 44×44 CSS px, dan contrast WCAG AA.
- Dropzone dapat digunakan dengan keyboard dan memiliki input file nyata.
- Progress update menggunakan `aria-live="polite"`; error mendesak menggunakan `role="alert"`.
- Score chart memiliki text equivalent; warna bukan satu-satunya indikator.
- Reduced motion dihormati.

## Performance budgets

- Landing LCP target <2.5s pada jaringan mobile wajar.
- Client JS dijaga kecil melalui Server Components dan dynamic import untuk kamera/chart berat.
- Gambar dikompresi sebelum upload hanya jika tidak menghilangkan keterbacaan label; original dapat dikirim bila OCR membutuhkan.
- Polling berhenti ketika tab hidden jika aman, lalu refresh saat visible.

## Browser security

- Render model output sebagai text, bukan raw HTML.
- CSP membatasi script, image, dan connect sources.
- Cookie session `HttpOnly`, `Secure`, `SameSite=Lax`.
- CSRF protection untuk mutation jika auth berbasis cookie dan cross-origin dimungkinkan.

## Testing pyramid

1. Unit: formatter, mapper, client validation, score band label.
2. Component: profile form, manual fallback, report limitations.
3. Contract: mock API response sesuai schema.
4. E2E: profile → scan manual → loading → report; OCR fallback; unauthorized report.
5. PWA: manifest, service-worker registration, offline fallback, no API caching.

CI minimum menjalankan `npm run lint`, type check, test, dan `npm run build`.
