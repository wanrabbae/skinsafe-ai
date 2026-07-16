# Analysis Pipeline

## Stage 0 — Intake

Validasi service token, schema, jumlah/jenis input, image URL scheme/host allowlist, ukuran maksimum, dan profile enum. Buat `inputFingerprint` dari canonical non-secret input untuk deduplication/audit; jangan masukkan signed URL token.

## Stage 1 — Input acquisition

Ambil image melalui signed URL dengan timeout, redirect limit, private-IP/SSRF protection, MIME sniffing, dimension limit, dan byte cap. Decode image dan lakukan orientation normalization. Input manual melewati acquisition image.

## Stage 2 — OCR/vision extraction

Ekstrak product name, brand, category, BPOM number, claims, ingredient text, dan evidence bounding box/source span. Provider harus diminta mengembalikan structured JSON. Response provider tetap dianggap untrusted dan divalidasi.

## Stage 3 — Normalization

- Unicode normalization dan whitespace cleanup.
- BPOM number canonicalization tanpa mengarang digit.
- Ingredient tokenization dengan awareness terhadap parenthesis dan separator.
- Alias resolution ke canonical INCI name.
- Fuzzy match hanya di bawah threshold terkontrol dan selalu menyimpan candidate/confidence.
- Deduplicate ingredient sambil mempertahankan order dan source text.

## Stage 4 — Sufficiency gate

Minimum untuk full analysis: ingredient list cukup terbaca atau manual ingredient text tersedia. BPOM boleh tidak ada tetapi status menjadi `unknown/no_visible_number`. Jika field penting ambigu, response `needs_input` berisi extracted draft, `missingFields`, dan instruksi capture yang spesifik.

## Stage 5 — Parallel analyzers

Setelah normalization, BPOM verification, overclaim detection, ingredient rules, skin compatibility, dan routine conflict dapat berjalan paralel karena membaca snapshot yang sama. Semua analyzer menghasilkan typed findings, bukan text bebas.

## Stage 6 — Scoring and safety gates

Hitung raw sub-score, terapkan hard overrides, hitung confidence dari kualitas data, lalu tentukan status band. Safety gate dapat menurunkan status meskipun weighted score tinggi.

## Stage 7 — Recommendation composition

Bangun recommendation dari template/rule findings. LLM opsional hanya boleh memperhalus bahasa dengan constrained facts; validator memeriksa bahwa code, severity, angka, dan negation tidak berubah. Jika validasi gagal, gunakan deterministic template.

## Latency budget

| Stage | Target p95 MVP |
|---|---|
| Intake + acquisition | 1.5s |
| OCR/vision | 8s |
| Normalization | 1s |
| Parallel analyzers | 3s |
| Scoring + composition | 2s |
| Network/queue margin | 4.5s |

Total target 10–20 detik. Setiap provider call memiliki timeout, bounded retry dengan jitter hanya untuk transient failure, dan circuit breaker di layer caller/infrastructure bila diperlukan.
