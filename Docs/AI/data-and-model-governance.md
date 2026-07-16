# Data and Model Governance

## Dataset lifecycle

Setiap dataset memiliki semantic version/date, schema version, source list, license, reviewer, generated timestamp, dan checksum. Update dilakukan melalui validation pipeline: schema check, duplicate/alias collision, invalid enum, dangling evidence ref, score range, regression suite, lalu approval.

Seed MVP minimum sebaiknya mencakup diverse ingredients, alias Indonesia/INCI, positive/negative BPOM fixtures, dan overclaim phrase Indonesia/Inggris. Jumlah record bukan quality metric; coverage dan review evidence lebih penting.

## Golden analysis fixtures

Fixture berisi redacted input, expected normalized fields, expected fired rules, allowed score range, status, confidence range, dan version. Golden fixture mencegah perubahan model/rule menggeser verdict tanpa review.

## Prompt governance

Prompt disimpan sebagai versioned text/template di source control. Prompt extraction hanya meminta field schema dan evidence, bukan diagnosis. Prompt recommendation menerima findings terstruktur dan dilarang menambah fact. Catat prompt version dan provider model ID pada response metadata, bukan isi sensitif prompt/user image di log.

## Model provider controls

- Adapter boundary dan strict timeout.
- Region/data-retention setting terdokumentasi.
- Provider response JSON schema validation.
- No training/data sharing option bila tersedia.
- Fallback provider atau manual path untuk outage.
- Cost cap per scan dan token/image accounting tanpa menyimpan content.

## Reproducibility

Report menyimpan input fingerprint, normalized product snapshot, fired rule IDs, score components, hard gates, dataset/rules/model versions, dan timestamp. Exact reproduction model generatif tidak selalu mungkin; keputusan safety tetap reproducible karena final gate/rule deterministic.

Local model menyimpan feature dimension, seed, epoch, threshold per concern,
validation metric, source checksum, model version, dan timestamp di artifact
JSON. AI/training/train_recommender.py adalah satu-satunya generator artifact
dan tidak menggunakan external AI/LLM API.

## Privacy

Minimalkan image retention, hapus EXIF, jangan kirim owner identity ke provider, redact logs, dan batasi debug output ke non-production. Dataset evaluasi dari user upload memerlukan consent dan de-identification.
