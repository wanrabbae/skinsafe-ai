# Knowledge Base and Rule Engines

## Ingredient dictionary

Minimal record:

```text
canonical_name, display_name, aliases, categories
benefits[], cautions[], contraindications[]
good_for[], avoid_if[]
pregnancy_policy allowed|caution|avoid|insufficient_evidence
risk_weight, evidence_refs[], reviewed_at, version
```

Risk harus kontekstual; ingredient tidak dilabel “buruk” secara universal kecuali banned/prohibited pada konteks regulasi yang relevan. Data menyimpan alasan dan sumber review.

## BPOM verifier

Status internal:

- `verified_match`: number valid dan product/brand match.
- `mismatch`: number ditemukan tetapi identity tidak cocok.
- `not_found`: format dapat dibaca tetapi dataset tidak menemukan record.
- `no_visible_number`: input tidak menyediakan nomor.
- `revoked_or_dangerous`: record revoked/dangerous.
- `unknown`: dataset/provider tidak dapat menentukan.

Mock dataset harus diberi label jelas. “Not found” pada dataset mock tidak boleh ditampilkan seolah hasil live registry.

## Overclaim detector

Categories: `instant_result`, `medical_claim`, `absolute_claim`, `racikan_red_flag`, `aggressive_whitening`. Matching memakai exact phrase, normalized regex, dan optional semantic classifier. Semantic match harus mengembalikan source phrase dan threshold; low-confidence finding tidak masuk hard gate.

## Ingredient analyzer

Untuk setiap ingredient, evaluasi base safety, profile modifiers, condition modifiers, pregnancy policy, dan interaction notes. Output groups: beneficial, neutral, caution, high risk, unresolved. Severity memiliki reason code yang stabil.

## Skin compatibility

Rules merupakan matrix ingredient/category × skin type/condition/sensitivity. Contoh: sensitizer meningkatkan caution untuk sensitivity high; strong exfoliant lebih berat pada damaged barrier; occlusive dapat membantu dry/barrier tetapi kurang ideal pada sebagian acne-prone user. Jangan menyimpulkan alergi individual.

## Routine conflicts

MVP conflict codes:

- `retinoid_exfoliant_frequency`
- `multiple_exfoliants`
- `strong_active_no_spf`
- `damaged_barrier_strong_active`
- `duplicate_active_load`

Rule membutuhkan active category, frequency bila tersedia, dan profile context. Jika frequency tidak tersedia, phrasing menjadi pertanyaan/caution, bukan konflik pasti.

## Rule format

Rule data sebaiknya deklaratif: `id`, `version`, `when`, `severity`, `scoreImpact`, `messageKey`, `evidenceRefs`. Rule engine mencatat rule ID yang fired agar report reproducible dan dapat diaudit.
