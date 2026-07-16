# Scoring, Confidence, and Safety

## Weighted score

```text
overall = 0.25 × bpom_trust_score
        + 0.25 × ingredient_safety_score
        + 0.20 × (100 - overclaim_raw_score)
        + 0.15 × skin_compatibility_score
        + 0.10 × (100 - routine_conflict_raw_score)
        + 0.05 × data_confidence_score
```

Round hanya pada output akhir. Simpan raw values untuk audit.

## BPOM baseline

| Kondisi | Score |
|---|---:|
| Valid + identity match | 100 |
| Valid record tetapi mismatch | 40 |
| Format valid, tidak ditemukan pada dataset | 30 |
| Tidak ada nomor terlihat | 20 |
| Revoked/dangerous | 0 |

## Status bands

| Range | Status |
|---|---|
| 85–100 | recommended |
| 70–84 | generally_ok |
| 50–69 | use_with_caution |
| 30–49 | high_caution |
| 0–29 | avoid |

## Hard safety gates

Weighted average tidak boleh menutupi red flag kritis:

- Confirmed prohibited/dangerous ingredient → `avoid`, terlepas dari score.
- BPOM record `revoked_or_dangerous` → maksimum `avoid`.
- BPOM identity mismatch → maksimum `high_caution` sampai diverifikasi.
- Pregnancy rule `avoid` dengan exact high-confidence ingredient match → maksimum `high_caution/avoid` sesuai reviewed policy.
- Data confidence sangat rendah → jangan tampilkan `recommended`; maksimum `use_with_caution` dan tampilkan limited recommendation.

Setiap override dicatat dalam `appliedGates[]`.

## Confidence score

Confidence menilai kualitas input, bukan safety. Candidate factors:

- image/OCR quality 25%;
- ingredient resolution coverage 30%;
- BPOM field reliability 15%;
- cross-image agreement 10%;
- dataset coverage/freshness 15%;
- analyzer completeness 5%.

Band awal: high ≥85, medium 60–84, low <60. Threshold wajib dikalibrasi dengan evaluation set.

## Recommendation policy

Recommendation berisi summary, strongest positive evidence, top cautions, profile-specific notes, action, safer criteria, limitations, dan medical disclaimer. Hindari kata “pasti”, “menyembuhkan”, atau “aman untuk semua”. Untuk severe reaction symptom, arahkan berhenti menggunakan produk dan mencari bantuan profesional tanpa mendiagnosis.
