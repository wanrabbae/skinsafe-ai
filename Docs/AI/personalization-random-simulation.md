# Random Personalization and Training Inspection

Report ini dihasilkan oleh engine FastAPI lokal melalui kontrak endpoint sebenarnya. Seed membuat random answers dapat direproduksi.

Re-run dari folder `AI`: `.venv\Scripts\python -m evaluation.simulate_personalization --seeds 20260717 20260718`.

## Simulasi 1 — seed `20260717`

Semua jawaban dipilih RNG. Safety status dibatasi A-C agar mencapai recommendation; dependent answer yang mustahil secara logis juga dikeluarkan dari kandidat.

### 10 pertanyaan generik

| # | ID | Pertanyaan | Random | Jawaban |
|---:|---|---|:---:|---|
| 1 | `skin_feel` | Dua jam setelah membersihkan wajah, kulitmu biasanya bagaimana? | C | Berminyak |
| 2 | `reactivity` | Seberapa sering kulit bereaksi terhadap produk baru? | C | Sering |
| 3 | `primary_concern` | Masalah kulit yang paling ingin kamu tangani dulu? | B | Kering/dehidrasi |
| 4 | `concern_duration` | Sudah berapa lama masalah kulit utama ini terasa? | B | 1-3 bulan |
| 5 | `concern_severity` | Seberapa besar masalah itu mengganggu kondisi kulitmu saat ini? | B | Sedang |
| 6 | `barrier_status` | Bagaimana kondisi skin barrier-mu dalam dua minggu terakhir? | A | Nyaman |
| 7 | `routine_complexity` | Rutinitas skincare harianmu paling mendekati yang mana? | D | Kompleks |
| 8 | `active_usage` | Active kuat apa yang paling menggambarkan rutinitasmu sekarang? | D | Lebih dari satu/tidak yakin |
| 9 | `environment` | Lingkungan yang paling sering memengaruhi kulitmu sehari-hari? | A | Ruangan ber-AC |
| 10 | `safety_status` | Pilih status yang penting untuk filter keamanan bahan. | A | Tidak hamil/menyusui |

SCP awal:

```json
{
  "avoidIngredients": [],
  "concernDuration": "persistent",
  "concernSeverity": "moderate",
  "concerns": [
    "dryness",
    "hydrating"
  ],
  "conditions": [],
  "contextSignals": {
    "active_usage": "multiple_or_unknown",
    "barrier_status": "comfortable"
  },
  "currentIngredients": [],
  "environmentalFactors": [
    "air_conditioned"
  ],
  "excludedProducts": [],
  "feedbackCount": 0,
  "pregnancyStatus": "none",
  "productPreferences": [],
  "routineComplexity": "complex",
  "sensitivityLevel": "high",
  "skinType": "oily",
  "successfulProducts": []
}
```

### 20 pertanyaan personalisasi adaptif

Urutan berikut adalah urutan aktual dari engine. Setelah setiap random answer, semua jawaban akumulatif dikirim ulang dan pertanyaan tersisa diprioritaskan ulang.

| Step | ID | Pertanyaan aktual | Kenapa ditanya | Random | Jawaban |
|---:|---|---|---|:---:|---|
| 1 | `reaction_onset` | Jika tidak cocok dengan produk, kapan reaksi biasanya mulai terasa? | Waktu reaksi membantu menilai pola sensitivitas. | D | Belum pernah |
| 2 | `reaction_symptoms` | Di luar reaksi produk, ketidaknyamanan kulit apa yang pernah kamu alami? | Memisahkan tipe respons user terhadap produk. | C | Bruntusan/breakout |
| 3 | `recovery_time` | Saat kulit sedang bermasalah karena faktor apa pun, biasanya berapa lama sampai pulih? | Durasi pemulihan memperkuat safety context SCP. | C | Lebih dari 3 hari |
| 4 | `fragrance_tolerance` | Bagaimana toleransimu terhadap fragrance/parfum pada skincare? | Toleransi fragrance memengaruhi safety penalty rekomendasi. | D | Belum tahu |
| 5 | `concern_area` | Untuk kulit kering, area mana yang paling sering terdampak? | Memetakan lokasi concern agar SCP lebih spesifik. | B | T-zone |
| 6 | `cleanser_afterfeel` | Dengan tipe kulit oily, bagaimana rasa kulit setelah cleanser? | Menguji ulang skin type dan kondisi barrier dari pengalaman rutin. | D | Perih/merah |
| 7 | `concern_frequency` | Seberapa sering kulit kering muncul atau memburuk? | Mengkalibrasi severity berdasarkan pola nyata. | B | Mingguan |
| 8 | `midday_skin` | Menjelang siang, kondisi kulitmu paling sering bagaimana? | Menambah observasi harian untuk skin type. | A | Seimbang |
| 9 | `concern_trigger` | Pemicu apa yang paling sering mendahului kulit kering? | Menambah konteks pemicu, bukan menebak diagnosis. | D | Produk/tidak tahu |
| 10 | `moisturizer_texture` | Tekstur moisturizer yang paling nyaman untukmu? | Personalisasi format produk tanpa klaim medis. | C | Cream |
| 11 | `active_frequency` | Seberapa sering kamu memakai active treatment? | Frekuensi active membantu mencegah penumpukan bahan. | B | 1-2 kali/minggu |
| 12 | `exfoliant_use` | Jenis exfoliant yang sedang dipakai? | Mendeteksi potensi konflik dengan rekomendasi baru. | B | AHA |
| 13 | `retinoid_use` | Apakah ada retinoid dalam rutinitasmu? | Mendeteksi potensi konflik retinoid dengan active lain. | A | Tidak ada |
| 14 | `routine_layers` | Berapa banyak layer produk dalam satu kali routine? | Mengukur kompleksitas agar rekomendasi tetap realistis. | B | 3-4 |
| 15 | `patch_test` | Seberapa rutin kamu melakukan patch test produk baru? | Perilaku patch test memengaruhi edukasi keamanan. | C | Tidak pernah |
| 16 | `sunscreen_tolerance` | Masalah apa yang paling sering muncul saat memakai sunscreen? | Menyesuaikan konteks produk harian yang wajib dipakai hati-hati. | D | Breakout |
| 17 | `climate_exposure` | Paparan lingkungan dominanmu belakangan ini? | Lingkungan dapat mengubah respons kulit tanpa mengubah diagnosis. | C | Matahari/polusi |
| 18 | `routine_consistency` | Seberapa konsisten rutinitasmu dijalankan? | Outcome hanya bisa dinilai bersama konteks konsistensi. | D | Pagi dan malam |
| 19 | `sleep_stress` | Seberapa sering stres atau kurang tidur bertepatan dengan memburuknya kulit kering? | Menyimpan faktor kebiasaan sebagai konteks, bukan sebab pasti. | D | Sangat kuat |
| 20 | `desired_pace` | Pendekatan hasil yang paling kamu prioritaskan? | Menyesuaikan intensitas rekomendasi dengan preferensi user. | C | Secepat mungkin |

Perubahan SCP setelah personalisasi:

```json
{
  "concernSeverity": {
    "after": "mild",
    "before": "moderate"
  },
  "concerns": {
    "after": [
      "dryness",
      "hydrating",
      "acne"
    ],
    "before": [
      "dryness",
      "hydrating"
    ]
  },
  "contextSignals": {
    "after": {
      "active_frequency": "one_two_weekly",
      "active_usage": "multiple_or_unknown",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "sun_pollution",
      "concern_area": "t_zone",
      "concern_frequency": "weekly",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "aha",
      "fragrance_tolerance": "unknown",
      "midday_skin": "balanced",
      "moisturizer_texture": "cream",
      "patch_test": "never",
      "reaction_onset": "no_known_reaction",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "over_three_days",
      "retinoid_use": "none",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "breakout"
    },
    "before": {
      "active_usage": "multiple_or_unknown",
      "barrier_status": "comfortable"
    }
  },
  "currentIngredients": {
    "after": [
      "aha"
    ],
    "before": []
  },
  "environmentalFactors": {
    "after": [
      "air_conditioned",
      "sun_pollution"
    ],
    "before": [
      "air_conditioned"
    ]
  },
  "productPreferences": {
    "after": [
      "moisturizer_cream",
      "pace_fast"
    ],
    "before": []
  },
  "routineComplexity": {
    "after": "basic",
    "before": "complex"
  }
}
```

SCP final:

```json
{
  "avoidIngredients": [],
  "concernDuration": "persistent",
  "concernSeverity": "mild",
  "concerns": [
    "dryness",
    "hydrating",
    "acne"
  ],
  "conditions": [],
  "contextSignals": {
    "active_frequency": "one_two_weekly",
    "active_usage": "multiple_or_unknown",
    "barrier_status": "comfortable",
    "cleanser_afterfeel": "stinging_red",
    "climate_exposure": "sun_pollution",
    "concern_area": "t_zone",
    "concern_frequency": "weekly",
    "concern_trigger": "product_or_unknown",
    "desired_pace": "fast",
    "exfoliant_use": "aha",
    "fragrance_tolerance": "unknown",
    "midday_skin": "balanced",
    "moisturizer_texture": "cream",
    "patch_test": "never",
    "reaction_onset": "no_known_reaction",
    "reaction_symptoms": "bumps_breakout",
    "recovery_time": "over_three_days",
    "retinoid_use": "none",
    "routine_consistency": "daily",
    "routine_layers": "three_four",
    "sleep_stress": "high",
    "sunscreen_tolerance": "breakout"
  },
  "currentIngredients": [
    "aha"
  ],
  "environmentalFactors": [
    "air_conditioned",
    "sun_pollution"
  ],
  "excludedProducts": [],
  "feedbackCount": 0,
  "pregnancyStatus": "none",
  "productPreferences": [
    "moisturizer_cream",
    "pace_fast"
  ],
  "routineComplexity": "basic",
  "sensitivityLevel": "high",
  "skinType": "oily",
  "successfulProducts": []
}
```

### Recommendation dan feedback learning

Produk teratas sebelum feedback:

```json
{
  "brand": "Skintific",
  "cautions": [],
  "confidence": "medium",
  "link": "https://incidecoder.com/products/skintific-msh-niacinamide-brightening-moisture-gel",
  "matchingChemicals": [
    "Butylene Glycol",
    "Isononyl Isononanoate",
    "Glycerin",
    "Niacinamide",
    "Ceramide EOP"
  ],
  "matchingSymptoms": [
    "dryness",
    "hydrating",
    "acne"
  ],
  "modelScore": 84.11,
  "name": "Skintific Msh Niacinamide Brightening Moisture Gel",
  "overallScore": 82.49,
  "price": null,
  "reasons": [
    "Model lokal mencocokkan produk dengan: dryness, hydrating, acne.",
    "Evidence ingredient utama: Butylene Glycol, Isononyl Isononanoate, Glycerin, Niacinamide, Ceramide EOP.",
    "Nama produk secara eksplisit menargetkan: dryness, hydrating."
  ],
  "relevanceScore": 82.49,
  "scoreBreakdown": {
    "concernCoverage": 15.0,
    "explicitProductIntent": 5.0,
    "ingredientEvidence": 7.82,
    "intentMismatchPenalty": 0.0,
    "modelRelevance": 54.67,
    "safetyPenalty": 0.0,
    "uncertaintyReserve": 5.0
  },
  "source": "incidecoder"
}
```

Feedback yang diuji:

```json
{
  "consentToLearning": true,
  "outcome": "improved",
  "product": {
    "brand": "Skintific",
    "matchingChemicals": [
      "Butylene Glycol",
      "Isononyl Isononanoate",
      "Glycerin",
      "Niacinamide",
      "Ceramide EOP"
    ],
    "modelVersion": "local-recommender-2026.07.1",
    "name": "Skintific Msh Niacinamide Brightening Moisture Gel"
  },
  "profile": {
    "avoidIngredients": [],
    "concernDuration": "persistent",
    "concernSeverity": "mild",
    "concerns": [
      "dryness",
      "hydrating",
      "acne"
    ],
    "conditions": [],
    "contextSignals": {
      "active_frequency": "one_two_weekly",
      "active_usage": "multiple_or_unknown",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "sun_pollution",
      "concern_area": "t_zone",
      "concern_frequency": "weekly",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "aha",
      "fragrance_tolerance": "unknown",
      "midday_skin": "balanced",
      "moisturizer_texture": "cream",
      "patch_test": "never",
      "reaction_onset": "no_known_reaction",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "over_three_days",
      "retinoid_use": "none",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "breakout"
    },
    "currentIngredients": [
      "aha"
    ],
    "environmentalFactors": [
      "air_conditioned",
      "sun_pollution"
    ],
    "excludedProducts": [],
    "feedbackCount": 0,
    "pregnancyStatus": "none",
    "productPreferences": [
      "moisturizer_cream",
      "pace_fast"
    ],
    "routineComplexity": "basic",
    "sensitivityLevel": "high",
    "skinType": "oily",
    "successfulProducts": []
  },
  "reactionSeverity": "none",
  "suspectedIngredients": [],
  "usageDays": 28
}
```

Perubahan SCP dari feedback:

```json
{
  "contextSignals": {
    "after": {
      "active_frequency": "one_two_weekly",
      "active_usage": "multiple_or_unknown",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "sun_pollution",
      "concern_area": "t_zone",
      "concern_frequency": "weekly",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "aha",
      "fragrance_tolerance": "unknown",
      "last_product_outcome": "improved",
      "last_product_usage_days": "28",
      "midday_skin": "balanced",
      "moisturizer_texture": "cream",
      "patch_test": "never",
      "reaction_onset": "no_known_reaction",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "over_three_days",
      "retinoid_use": "none",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "breakout"
    },
    "before": {
      "active_frequency": "one_two_weekly",
      "active_usage": "multiple_or_unknown",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "sun_pollution",
      "concern_area": "t_zone",
      "concern_frequency": "weekly",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "aha",
      "fragrance_tolerance": "unknown",
      "midday_skin": "balanced",
      "moisturizer_texture": "cream",
      "patch_test": "never",
      "reaction_onset": "no_known_reaction",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "over_three_days",
      "retinoid_use": "none",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "breakout"
    }
  },
  "feedbackCount": {
    "after": 1,
    "before": 0
  },
  "successfulProducts": {
    "after": [
      "Skintific::Skintific Msh Niacinamide Brightening Moisture Gel"
    ],
    "before": []
  }
}
```

**PASS: Skintific::Skintific Msh Niacinamide Brightening Moisture Gel tetap tercatat sebagai successful product.**

## Simulasi 2 — seed `20260718`

Semua jawaban dipilih RNG. Safety status dibatasi A-C agar mencapai recommendation; dependent answer yang mustahil secara logis juga dikeluarkan dari kandidat.

### 10 pertanyaan generik

| # | ID | Pertanyaan | Random | Jawaban |
|---:|---|---|:---:|---|
| 1 | `skin_feel` | Dua jam setelah membersihkan wajah, kulitmu biasanya bagaimana? | C | Berminyak |
| 2 | `reactivity` | Seberapa sering kulit bereaksi terhadap produk baru? | A | Jarang |
| 3 | `primary_concern` | Masalah kulit yang paling ingin kamu tangani dulu? | D | Kusam/noda |
| 4 | `concern_duration` | Sudah berapa lama masalah kulit utama ini terasa? | C | 3-12 bulan |
| 5 | `concern_severity` | Seberapa besar masalah itu mengganggu kondisi kulitmu saat ini? | C | Berat |
| 6 | `barrier_status` | Bagaimana kondisi skin barrier-mu dalam dua minggu terakhir? | A | Nyaman |
| 7 | `routine_complexity` | Rutinitas skincare harianmu paling mendekati yang mana? | C | Dengan active |
| 8 | `active_usage` | Active kuat apa yang paling menggambarkan rutinitasmu sekarang? | A | Tidak ada |
| 9 | `environment` | Lingkungan yang paling sering memengaruhi kulitmu sehari-hari? | B | Panas dan lembap |
| 10 | `safety_status` | Pilih status yang penting untuk filter keamanan bahan. | B | Hamil |

SCP awal:

```json
{
  "avoidIngredients": [],
  "concernDuration": "persistent",
  "concernSeverity": "high",
  "concerns": [
    "dullness",
    "uneven skintone"
  ],
  "conditions": [],
  "contextSignals": {
    "active_usage": "none",
    "barrier_status": "comfortable"
  },
  "currentIngredients": [],
  "environmentalFactors": [
    "hot_humid"
  ],
  "excludedProducts": [],
  "feedbackCount": 0,
  "pregnancyStatus": "pregnant",
  "productPreferences": [],
  "routineComplexity": "active",
  "sensitivityLevel": "low",
  "skinType": "oily",
  "successfulProducts": []
}
```

### 20 pertanyaan personalisasi adaptif

Urutan berikut adalah urutan aktual dari engine. Setelah setiap random answer, semua jawaban akumulatif dikirim ulang dan pertanyaan tersisa diprioritaskan ulang.

| Step | ID | Pertanyaan aktual | Kenapa ditanya | Random | Jawaban |
|---:|---|---|---|:---:|---|
| 1 | `concern_area` | Untuk kulit kusam, area mana yang paling sering terdampak? | Memetakan lokasi concern agar SCP lebih spesifik. | B | T-zone |
| 2 | `concern_frequency` | Seberapa sering kulit kusam muncul atau memburuk? | Mengkalibrasi severity berdasarkan pola nyata. | A | Jarang |
| 3 | `concern_trigger` | Pemicu apa yang paling sering mendahului kulit kusam? | Menambah konteks pemicu, bukan menebak diagnosis. | D | Produk/tidak tahu |
| 4 | `reaction_onset` | Jika tidak cocok dengan produk, kapan reaksi biasanya mulai terasa? | Waktu reaksi membantu menilai pola sensitivitas. | A | Dalam menit |
| 5 | `reaction_symptoms` | Reaksi produk yang paling sering kamu alami seperti apa? | Memisahkan tipe respons user terhadap produk. | C | Bruntusan/breakout |
| 6 | `recovery_time` | Biasanya berapa lama kulit pulih setelah reaksi? | Durasi pemulihan memperkuat safety context SCP. | D | Butuh pertolongan |
| 7 | `fragrance_tolerance` | Bagaimana toleransimu terhadap fragrance/parfum pada skincare? | Toleransi fragrance memengaruhi safety penalty rekomendasi. | A | Baik |
| 8 | `active_frequency` | Seberapa sering kamu memakai active treatment? | Frekuensi active membantu mencegah penumpukan bahan. | D | Setiap hari |
| 9 | `exfoliant_use` | Jenis exfoliant yang sedang dipakai? | Mendeteksi potensi konflik dengan rekomendasi baru. | D | Lebih dari satu |
| 10 | `cleanser_afterfeel` | Dengan tipe kulit oily, bagaimana rasa kulit setelah cleanser? | Menguji ulang skin type dan kondisi barrier dari pengalaman rutin. | D | Perih/merah |
| 11 | `retinoid_use` | Apakah ada retinoid dalam rutinitasmu? | Mendeteksi potensi konflik retinoid dengan active lain. | B | Sesekali |
| 12 | `midday_skin` | Menjelang siang, kondisi kulitmu paling sering bagaimana? | Menambah observasi harian untuk skin type. | B | Berminyak |
| 13 | `routine_layers` | Berapa banyak layer produk dalam satu kali routine? | Mengukur kompleksitas agar rekomendasi tetap realistis. | B | 3-4 |
| 14 | `moisturizer_texture` | Tekstur moisturizer yang paling nyaman untukmu? | Personalisasi format produk tanpa klaim medis. | B | Lotion |
| 15 | `patch_test` | Seberapa rutin kamu melakukan patch test produk baru? | Perilaku patch test memengaruhi edukasi keamanan. | A | Selalu |
| 16 | `sunscreen_tolerance` | Masalah apa yang paling sering muncul saat memakai sunscreen? | Menyesuaikan konteks produk harian yang wajib dipakai hati-hati. | B | Terlalu berminyak |
| 17 | `routine_consistency` | Seberapa konsisten rutinitasmu dijalankan? | Outcome hanya bisa dinilai bersama konteks konsistensi. | D | Pagi dan malam |
| 18 | `climate_exposure` | Paparan lingkungan dominanmu belakangan ini? | Lingkungan dapat mengubah respons kulit tanpa mengubah diagnosis. | B | Panas/lembap |
| 19 | `sleep_stress` | Seberapa sering stres atau kurang tidur bertepatan dengan memburuknya kulit kusam? | Menyimpan faktor kebiasaan sebagai konteks, bukan sebab pasti. | D | Sangat kuat |
| 20 | `desired_pace` | Pendekatan hasil yang paling kamu prioritaskan? | Menyesuaikan intensitas rekomendasi dengan preferensi user. | C | Secepat mungkin |

Perubahan SCP setelah personalisasi:

```json
{
  "concernSeverity": {
    "after": "mild",
    "before": "high"
  },
  "contextSignals": {
    "after": {
      "active_frequency": "daily",
      "active_usage": "none",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "hot_humid",
      "concern_area": "t_zone",
      "concern_frequency": "rare",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "multiple_acids",
      "fragrance_tolerance": "tolerates",
      "midday_skin": "oily",
      "moisturizer_texture": "lotion",
      "patch_test": "always",
      "reaction_onset": "minutes",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "needs_treatment",
      "retinoid_use": "low_frequency",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "greasy"
    },
    "before": {
      "active_usage": "none",
      "barrier_status": "comfortable"
    }
  },
  "currentIngredients": {
    "after": [
      "aha",
      "salicylic acid",
      "retinoid"
    ],
    "before": []
  },
  "productPreferences": {
    "after": [
      "moisturizer_lotion",
      "pace_fast"
    ],
    "before": []
  },
  "routineComplexity": {
    "after": "basic",
    "before": "active"
  },
  "sensitivityLevel": {
    "after": "high",
    "before": "low"
  }
}
```

SCP final:

```json
{
  "avoidIngredients": [],
  "concernDuration": "persistent",
  "concernSeverity": "mild",
  "concerns": [
    "dullness",
    "uneven skintone"
  ],
  "conditions": [],
  "contextSignals": {
    "active_frequency": "daily",
    "active_usage": "none",
    "barrier_status": "comfortable",
    "cleanser_afterfeel": "stinging_red",
    "climate_exposure": "hot_humid",
    "concern_area": "t_zone",
    "concern_frequency": "rare",
    "concern_trigger": "product_or_unknown",
    "desired_pace": "fast",
    "exfoliant_use": "multiple_acids",
    "fragrance_tolerance": "tolerates",
    "midday_skin": "oily",
    "moisturizer_texture": "lotion",
    "patch_test": "always",
    "reaction_onset": "minutes",
    "reaction_symptoms": "bumps_breakout",
    "recovery_time": "needs_treatment",
    "retinoid_use": "low_frequency",
    "routine_consistency": "daily",
    "routine_layers": "three_four",
    "sleep_stress": "high",
    "sunscreen_tolerance": "greasy"
  },
  "currentIngredients": [
    "aha",
    "salicylic acid",
    "retinoid"
  ],
  "environmentalFactors": [
    "hot_humid"
  ],
  "excludedProducts": [],
  "feedbackCount": 0,
  "pregnancyStatus": "pregnant",
  "productPreferences": [
    "moisturizer_lotion",
    "pace_fast"
  ],
  "routineComplexity": "basic",
  "sensitivityLevel": "high",
  "skinType": "oily",
  "successfulProducts": []
}
```

### Recommendation dan feedback learning

Produk teratas sebelum feedback:

```json
{
  "brand": "Skintific",
  "cautions": [],
  "confidence": "medium",
  "link": "https://incidecoder.com/products/skintific-msh-niacinamide-brightening-moisture-gel",
  "matchingChemicals": [
    "Niacinamide",
    "Undecylenoyl Phenylalanine",
    "(Msh)，Centella Asiatica Extract",
    "Alpha-Arbutin",
    "Tranexamic Acid"
  ],
  "matchingSymptoms": [
    "dullness",
    "uneven skintone"
  ],
  "modelScore": 82.67,
  "name": "Skintific Msh Niacinamide Brightening Moisture Gel",
  "overallScore": 78.89,
  "price": null,
  "reasons": [
    "Model lokal mencocokkan produk dengan: dullness, uneven skintone.",
    "Evidence ingredient utama: Niacinamide, Undecylenoyl Phenylalanine, (Msh)，Centella Asiatica Extract, Alpha-Arbutin, Tranexamic Acid.",
    "Nama produk secara eksplisit menargetkan: dullness, uneven skintone."
  ],
  "relevanceScore": 78.89,
  "scoreBreakdown": {
    "concernCoverage": 15.0,
    "explicitProductIntent": 5.0,
    "ingredientEvidence": 5.15,
    "intentMismatchPenalty": 0.0,
    "modelRelevance": 53.74,
    "safetyPenalty": 0.0,
    "uncertaintyReserve": 5.0
  },
  "source": "incidecoder"
}
```

Feedback yang diuji:

```json
{
  "consentToLearning": true,
  "outcome": "reaction",
  "product": {
    "brand": "Skintific",
    "matchingChemicals": [
      "Niacinamide",
      "Undecylenoyl Phenylalanine",
      "(Msh)，Centella Asiatica Extract",
      "Alpha-Arbutin",
      "Tranexamic Acid"
    ],
    "modelVersion": "local-recommender-2026.07.1",
    "name": "Skintific Msh Niacinamide Brightening Moisture Gel"
  },
  "profile": {
    "avoidIngredients": [],
    "concernDuration": "persistent",
    "concernSeverity": "mild",
    "concerns": [
      "dullness",
      "uneven skintone"
    ],
    "conditions": [],
    "contextSignals": {
      "active_frequency": "daily",
      "active_usage": "none",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "hot_humid",
      "concern_area": "t_zone",
      "concern_frequency": "rare",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "multiple_acids",
      "fragrance_tolerance": "tolerates",
      "midday_skin": "oily",
      "moisturizer_texture": "lotion",
      "patch_test": "always",
      "reaction_onset": "minutes",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "needs_treatment",
      "retinoid_use": "low_frequency",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "greasy"
    },
    "currentIngredients": [
      "aha",
      "salicylic acid",
      "retinoid"
    ],
    "environmentalFactors": [
      "hot_humid"
    ],
    "excludedProducts": [],
    "feedbackCount": 0,
    "pregnancyStatus": "pregnant",
    "productPreferences": [
      "moisturizer_lotion",
      "pace_fast"
    ],
    "routineComplexity": "basic",
    "sensitivityLevel": "high",
    "skinType": "oily",
    "successfulProducts": []
  },
  "reactionSeverity": "moderate",
  "suspectedIngredients": [],
  "usageDays": 8
}
```

Perubahan SCP dari feedback:

```json
{
  "conditions": {
    "after": [
      "damaged_barrier"
    ],
    "before": []
  },
  "contextSignals": {
    "after": {
      "active_frequency": "daily",
      "active_usage": "none",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "hot_humid",
      "concern_area": "t_zone",
      "concern_frequency": "rare",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "multiple_acids",
      "fragrance_tolerance": "tolerates",
      "last_product_outcome": "reaction",
      "last_product_usage_days": "8",
      "midday_skin": "oily",
      "moisturizer_texture": "lotion",
      "patch_test": "always",
      "reaction_onset": "minutes",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "needs_treatment",
      "retinoid_use": "low_frequency",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "greasy"
    },
    "before": {
      "active_frequency": "daily",
      "active_usage": "none",
      "barrier_status": "comfortable",
      "cleanser_afterfeel": "stinging_red",
      "climate_exposure": "hot_humid",
      "concern_area": "t_zone",
      "concern_frequency": "rare",
      "concern_trigger": "product_or_unknown",
      "desired_pace": "fast",
      "exfoliant_use": "multiple_acids",
      "fragrance_tolerance": "tolerates",
      "midday_skin": "oily",
      "moisturizer_texture": "lotion",
      "patch_test": "always",
      "reaction_onset": "minutes",
      "reaction_symptoms": "bumps_breakout",
      "recovery_time": "needs_treatment",
      "retinoid_use": "low_frequency",
      "routine_consistency": "daily",
      "routine_layers": "three_four",
      "sleep_stress": "high",
      "sunscreen_tolerance": "greasy"
    }
  },
  "excludedProducts": {
    "after": [
      "Skintific::Skintific Msh Niacinamide Brightening Moisture Gel"
    ],
    "before": []
  },
  "feedbackCount": {
    "after": 1,
    "before": 0
  }
}
```

**PASS: Skintific::Skintific Msh Niacinamide Brightening Moisture Gel dikeluarkan dari recommendation berikutnya.**

## Epoch, train loss, dan validation metrics

Personalisasi SCP memperbarui konteks user secara langsung dan tidak menjalankan training epoch per user. Tabel ini berasal dari artifact model recommender global yang dipakai runtime.

- Model: `local-recommender-2026.07.1`
- Total epoch: **55**
- Train loss turun **54.47%**.
- Validation loss turun **44.8%**.
- Validation loss terbaik: **0.324865** pada epoch **52**.
- Validation F1 terbaik: **0.8964** pada epoch **38**.
- Final generalization gap: **0.064025**.

Interpretasi: train dan validation loss sama-sama turun tanpa divergensi besar. Validation F1 sudah plateau sekitar epoch 38, sedangkan validation loss minimum di epoch 52; epoch 53-55 memberi improvement yang sangat kecil sehingga early stopping sekitar titik itu layak dipertimbangkan pada retraining berikutnya.

| Epoch | Train loss | Validation loss | Validation F1 |
|---:|---:|---:|---:|
| 1 | 0.576560 | 0.591584 | 0.7622 |
| 5 | 0.450495 | 0.477553 | 0.8250 |
| 10 | 0.380883 | 0.418469 | 0.8492 |
| 20 | 0.322341 | 0.372778 | 0.8744 |
| 30 | 0.293807 | 0.350442 | 0.8874 |
| 40 | 0.279821 | 0.340217 | 0.8830 |
| 50 | 0.267024 | 0.329876 | 0.8914 |
| 55 | 0.262528 | 0.326553 | 0.8963 |

Aggregate metrics:

```json
{
  "macroAveragePrecisionAt10": 0.9908,
  "macroF1": 0.9082,
  "macroNdcgAt10": 0.9945,
  "macroRecallAt10": 0.1924,
  "macroRocAuc": 0.9422
}
```

Brand-holdout metrics:

```json
{
  "macroF1": 0.8217,
  "macroNdcgAt10": 0.9629,
  "macroRecallAt10": 0.3412,
  "macroRocAuc": 0.902
}
```

Kurva visual: [`AI/images/local-recommender-2026.07.1/training-metrics.jpg`](../../AI/images/local-recommender-2026.07.1/training-metrics.jpg).

Metrik memakai weak labels dan bukan clinical accuracy. Learning signal ber-consent tetap harus melewati review/evaluation sebelum batch retraining global.
