# Backend Data Model

## SkinProfile

```text
id UUID
owner_id/session_id UUID
skin_type normal|dry|oily|combination|sensitive
sensitivity_level low|medium|high
conditions TEXT[]
concerns TEXT[]
goals TEXT[]
pregnancy_status none|pregnant|breastfeeding
current_routine JSONB
created_at, updated_at TIMESTAMPTZ
```

Pregnancy status adalah data sensitif. Kumpulkan hanya karena memengaruhi caution rule, jelaskan tujuan, dan sertakan dalam account/session deletion.

## Scan

```text
id UUID
owner_id/session_id UUID
profile_id UUID
input_method screenshot|packaging_photo|ingredient_photo|manual
status queued|extracting|normalizing|evaluating|finalizing|completed|needs_input|failed|cancelled
missing_fields TEXT[]
failure_code TEXT nullable
attempt_count INT
created_at, updated_at, completed_at TIMESTAMPTZ nullable
```

## UploadAsset

Menyimpan object key, MIME type hasil sniffing server, bytes, checksum, encryption/storage metadata, dan deletion timestamp. Jangan simpan public URL permanen; hasilkan signed URL berumur pendek untuk internal processing.

## ProductSnapshot

Identity dan text hasil scan: name, brand, category, BPOM number, claims, raw ingredient text, normalized ingredients, source spans, extraction confidence, dan user corrections. Snapshot tidak mengubah master ingredient dataset.

## AnalysisReport

Menyimpan overall score, status band, confidence, sub-scores, BPOM result, claim flags, ingredient findings, compatibility findings, routine conflicts, recommendation, limitations, dan evidence references. Tambahkan:

- `engineVersion`
- `rulesetVersion`
- `ingredientDatasetVersion`
- `bpomDatasetVersion`
- `modelVersions`
- `inputFingerprint`

Report bersifat immutable. Re-analysis membuat revision baru agar hasil lama dapat diaudit.

## Indexes and constraints

- Unique `(owner_id, id)` access path untuk resource lookup.
- Index scan history `(owner_id, created_at DESC)`.
- Unique idempotency key per owner dan operation.
- Check score range 0–100.
- Foreign key deletion policy eksplisit; jangan meninggalkan upload orphan.
- Status transition divalidasi di application layer dan, bila praktis, transaction/constraint database.
