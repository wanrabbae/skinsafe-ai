# Extraction and Normalization

## Extraction output

Setiap extracted field berbentuk value + confidence + evidence:

```json
{
  "value": "Salicylic Acid",
  "confidence": 0.94,
  "evidence": {
    "sourceImage": 1,
    "text": "SALICYLIC ACID",
    "boundingBox": [0.12, 0.44, 0.31, 0.49]
  }
}
```

Coordinate dinormalisasi 0–1 agar tidak bergantung pada resolusi. Manual user correction memiliki provenance `user_provided` dan mengalahkan OCR, tetapi tetap divalidasi.

## Image quality checks

Deteksi blur, glare/overexposure, crop, text terlalu kecil, dan orientation. Jika quality terlalu rendah, jangan mengandalkan model confidence semata. Berikan instruksi konkret: dekatkan kamera, sejajarkan label, hindari pantulan, atau unggah bagian ingredient secara terpisah.

## Ingredient parser

Parser melakukan:

1. Unicode/whitespace normalization.
2. Menghapus heading seperti “Ingredients:” tanpa menghapus isi.
3. Split separator koma/semicolon dengan perlakuan khusus parenthesis.
4. Mempertahankan urutan label yang dapat mengindikasikan konsentrasi relatif.
5. Alias exact match terlebih dahulu.
6. Normalized token match.
7. Fuzzy candidate hanya untuk typo OCR dan tidak auto-accept di bawah threshold.

Unknown ingredient dipertahankan sebagai `unresolved`, bukan dibuang. Unresolved ratio menurunkan confidence.

## BPOM normalization

Canonicalization menghapus space/dash yang jelas, mengubah huruf ke uppercase, lalu memeriksa pola yang didukung. OCR confusion seperti O/0 tidak diperbaiki diam-diam; simpan candidate alternatif dan minta input bila perubahan memengaruhi lookup.

## Claim extraction

Pisahkan claim menjadi phrase yang dekat dengan teks sumber. Pertahankan bahasa asli dan hasil normalized lowercase untuk matching. Jangan menganggap copy marketplace identik dengan klaim resmi kemasan; provenance harus `marketplace`, `packaging`, atau `manual`.

## Confidence calibration

Provider confidence bukan probabilitas yang otomatis terkalibrasi. Kalibrasi terhadap labeled dataset menggunakan bucket reliability. Field confidence digabung dengan quality signal, agreement antargambar, exact alias match, dan unresolved ratio.
