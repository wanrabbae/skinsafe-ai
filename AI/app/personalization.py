"""Adaptive SCP refinement and consented product-outcome feedback."""

from __future__ import annotations

from .schemas import (
    FeedbackLearningSignal,
    PERSONALIZATION_QUESTION_IDS,
    ProductFeedbackRequest,
    ProductFeedbackResponse,
    ProfilePersonalizationRequest,
    ProfilePersonalizationResponse,
    QuestionnaireOption,
    QuestionnaireQuestion,
    ResolvedSkinProfile,
)


PERSONALIZATION_VERSION = "scp-personalization-2026.07.1"
FEEDBACK_SCHEMA_VERSION = "product-outcome-2026.07.1"

_CONCERN_LABELS = {
    "acne": "jerawat",
    "aging": "tanda penuaan",
    "discomfort": "rasa tidak nyaman",
    "dryness": "kulit kering",
    "dullness": "kulit kusam",
    "hydrating": "kebutuhan hidrasi",
    "oiliness": "minyak berlebih",
    "redness": "kemerahan",
    "rough": "tekstur kasar",
    "sun protectant": "perlindungan matahari",
    "uneven skintone": "warna kulit tidak merata",
}

_ANSWER_SIGNALS: dict[str, dict[str, str]] = {
    "concern_area": {"A": "single_area", "B": "t_zone", "C": "cheeks", "D": "widespread"},
    "concern_frequency": {"A": "rare", "B": "weekly", "C": "frequent", "D": "daily"},
    "concern_trigger": {"A": "hormonal", "B": "stress_sleep", "C": "weather", "D": "product_or_unknown"},
    "reaction_onset": {"A": "minutes", "B": "hours", "C": "days", "D": "no_known_reaction"},
    "reaction_symptoms": {"A": "stinging", "B": "itching_redness", "C": "bumps_breakout", "D": "none"},
    "recovery_time": {"A": "under_one_day", "B": "two_three_days", "C": "over_three_days", "D": "needs_treatment"},
    "cleanser_afterfeel": {"A": "comfortable", "B": "tight", "C": "quickly_oily", "D": "stinging_red"},
    "midday_skin": {"A": "balanced", "B": "oily", "C": "dry", "D": "mixed"},
    "moisturizer_texture": {"A": "gel", "B": "lotion", "C": "cream", "D": "no_preference"},
    "fragrance_tolerance": {"A": "tolerates", "B": "sometimes_reacts", "C": "avoid", "D": "unknown"},
    "sunscreen_tolerance": {"A": "comfortable", "B": "greasy", "C": "stinging", "D": "breakout"},
    "active_frequency": {"A": "none", "B": "one_two_weekly", "C": "three_four_weekly", "D": "daily"},
    "exfoliant_use": {"A": "none", "B": "aha", "C": "bha", "D": "multiple_acids"},
    "retinoid_use": {"A": "none", "B": "low_frequency", "C": "frequent", "D": "prescription"},
    "routine_layers": {"A": "one_two", "B": "three_four", "C": "five_plus", "D": "changes_often"},
    "routine_consistency": {"A": "rare", "B": "sometimes", "C": "most_days", "D": "daily"},
    "climate_exposure": {"A": "air_conditioned", "B": "hot_humid", "C": "sun_pollution", "D": "mixed_environment"},
    "sleep_stress": {"A": "stable", "B": "occasional", "C": "frequent", "D": "high"},
    "desired_pace": {"A": "gentle", "B": "balanced", "C": "fast", "D": "unsure"},
    "patch_test": {"A": "always", "B": "sometimes", "C": "never", "D": "unknown_how"},
}


def _append_unique(values: list[str], additions: list[str]) -> None:
    for value in additions:
        if value and value not in values:
            values.append(value)


def _question(
    question_id: str,
    prompt: str,
    options: tuple[tuple[str, str], tuple[str, str], tuple[str, str], tuple[str, str]],
    why: str,
) -> QuestionnaireQuestion:
    return QuestionnaireQuestion(
        id=question_id,
        prompt=prompt,
        kind="personalized",
        why_asked=why,
        options=[
            QuestionnaireOption(value=value, label=label, description=description)
            for value, (label, description) in zip(("A", "B", "C", "D"), options, strict=True)
        ],
    )


def _build_questions(profile: ResolvedSkinProfile) -> list[QuestionnaireQuestion]:
    concern = _CONCERN_LABELS.get(profile.concerns[0], profile.concerns[0]) if profile.concerns else "masalah kulit utama"
    skin_type = profile.skin_type or "belum terpetakan"
    no_known_product_reaction = profile.context_signals.get("reaction_onset") == "no_known_reaction"
    reaction_symptoms_prompt = (
        "Di luar reaksi produk, ketidaknyamanan kulit apa yang pernah kamu alami?"
        if no_known_product_reaction
        else "Reaksi produk yang paling sering kamu alami seperti apa?"
    )
    recovery_prompt = (
        "Saat kulit sedang bermasalah karena faktor apa pun, biasanya berapa lama sampai pulih?"
        if no_known_product_reaction
        else "Biasanya berapa lama kulit pulih setelah reaksi?"
    )
    questions = [
        _question("concern_area", f"Untuk {concern}, area mana yang paling sering terdampak?", (("Satu area kecil", "Hanya muncul pada satu area."), ("T-zone", "Dahi, hidung, atau dagu."), ("Pipi/rahang", "Dominan pada pipi atau rahang."), ("Menyebar", "Muncul di banyak area wajah.")), "Memetakan lokasi concern agar SCP lebih spesifik."),
        _question("concern_frequency", f"Seberapa sering {concern} muncul atau memburuk?", (("Jarang", "Kurang dari sekali per bulan."), ("Mingguan", "Sekitar satu kali per minggu."), ("Sering", "Beberapa kali per minggu."), ("Hampir setiap hari", "Terjadi atau terasa hampir setiap hari.")), "Mengkalibrasi severity berdasarkan pola nyata."),
        _question("concern_trigger", f"Pemicu apa yang paling sering mendahului {concern}?", (("Siklus hormonal", "Berhubungan dengan perubahan hormonal."), ("Stres/kurang tidur", "Muncul saat stres atau tidur terganggu."), ("Cuaca", "Memburuk saat lingkungan berubah."), ("Produk/tidak tahu", "Setelah produk tertentu atau belum tahu pemicunya.")), "Menambah konteks pemicu, bukan menebak diagnosis."),
        _question("reaction_onset", "Jika tidak cocok dengan produk, kapan reaksi biasanya mulai terasa?", (("Dalam menit", "Reaksi terasa hampir langsung."), ("Dalam beberapa jam", "Reaksi muncul pada hari yang sama."), ("Setelah beberapa hari", "Reaksi tertunda setelah pemakaian berulang."), ("Belum pernah", "Belum mengenali reaksi produk.")), "Waktu reaksi membantu menilai pola sensitivitas."),
        _question("reaction_symptoms", reaction_symptoms_prompt, (("Perih/panas", "Terasa menyengat atau panas."), ("Gatal/merah", "Muncul gatal atau kemerahan."), ("Bruntusan/breakout", "Muncul benjolan atau jerawat."), ("Tidak ada", "Belum pernah mengalami reaksi tersebut.")), "Memisahkan tipe respons user terhadap produk."),
        _question("recovery_time", recovery_prompt, (("Kurang dari sehari", "Pulih tanpa tindakan khusus."), ("2-3 hari", "Perlu routine yang lebih sederhana."), ("Lebih dari 3 hari", "Reaksi bertahan cukup lama."), ("Butuh pertolongan", "Pernah memerlukan obat atau tenaga medis.")), "Durasi pemulihan memperkuat safety context SCP."),
        _question("cleanser_afterfeel", f"Dengan tipe kulit {skin_type}, bagaimana rasa kulit setelah cleanser?", (("Nyaman", "Tidak tertarik atau licin berlebih."), ("Tertarik/kering", "Terasa kencang setelah mencuci."), ("Cepat berminyak", "Minyak cepat kembali."), ("Perih/merah", "Muncul perih atau kemerahan.")), "Menguji ulang skin type dan kondisi barrier dari pengalaman rutin."),
        _question("midday_skin", "Menjelang siang, kondisi kulitmu paling sering bagaimana?", (("Seimbang", "Tetap nyaman dan tidak mengilap."), ("Berminyak", "Mengilap di sebagian besar wajah."), ("Kering", "Terasa kering atau tertarik."), ("Campuran", "T-zone berminyak, area lain kering.")), "Menambah observasi harian untuk skin type."),
        _question("moisturizer_texture", "Tekstur moisturizer yang paling nyaman untukmu?", (("Gel", "Ringan dan cepat menyerap."), ("Lotion", "Sedang dan mudah diratakan."), ("Cream", "Lebih rich dan oklusif."), ("Belum tahu", "Belum menemukan preferensi.")), "Personalisasi format produk tanpa klaim medis."),
        _question("fragrance_tolerance", "Bagaimana toleransimu terhadap fragrance/parfum pada skincare?", (("Baik", "Biasanya tidak ada masalah."), ("Kadang bereaksi", "Pernah tidak nyaman pada beberapa produk."), ("Ingin menghindari", "Pilih produk tanpa fragrance."), ("Belum tahu", "Belum dapat menilai.")), "Toleransi fragrance memengaruhi safety penalty rekomendasi."),
        _question("sunscreen_tolerance", "Masalah apa yang paling sering muncul saat memakai sunscreen?", (("Tidak ada", "Nyaman dipakai rutin."), ("Terlalu berminyak", "Terasa berat atau cepat mengilap."), ("Perih", "Perih terutama di kulit atau sekitar mata."), ("Breakout", "Sering muncul bruntusan atau jerawat.")), "Menyesuaikan konteks produk harian yang wajib dipakai hati-hati."),
        _question("active_frequency", "Seberapa sering kamu memakai active treatment?", (("Tidak memakai", "Belum ada active treatment."), ("1-2 kali/minggu", "Pemakaian rendah."), ("3-4 kali/minggu", "Pemakaian cukup sering."), ("Setiap hari", "Ada active pada routine harian.")), "Frekuensi active membantu mencegah penumpukan bahan."),
        _question("exfoliant_use", "Jenis exfoliant yang sedang dipakai?", (("Tidak ada", "Tidak memakai acid exfoliant."), ("AHA", "Misalnya glycolic atau lactic acid."), ("BHA", "Misalnya salicylic acid."), ("Lebih dari satu", "Menggabungkan beberapa acid.")), "Mendeteksi potensi konflik dengan rekomendasi baru."),
        _question("retinoid_use", "Apakah ada retinoid dalam rutinitasmu?", (("Tidak ada", "Tidak memakai retinoid."), ("Sesekali", "Retinoid frekuensi rendah."), ("Sering", "Retinoid beberapa kali per minggu."), ("Resep dokter", "Memakai tretinoin/adapalene berdasarkan arahan medis.")), "Mendeteksi potensi konflik retinoid dengan active lain."),
        _question("routine_layers", "Berapa banyak layer produk dalam satu kali routine?", (("1-2", "Routine sangat sederhana."), ("3-4", "Routine basic hingga sedang."), ("5 atau lebih", "Routine cukup kompleks."), ("Sering berubah", "Produk/layer sering diganti.")), "Mengukur kompleksitas agar rekomendasi tetap realistis."),
        _question("routine_consistency", "Seberapa konsisten rutinitasmu dijalankan?", (("Jarang", "Kurang dari dua hari per minggu."), ("Kadang", "Beberapa hari per minggu."), ("Hampir setiap hari", "Cukup konsisten."), ("Pagi dan malam", "Konsisten dua kali sehari.")), "Outcome hanya bisa dinilai bersama konteks konsistensi."),
        _question("climate_exposure", "Paparan lingkungan dominanmu belakangan ini?", (("AC/udara kering", "Banyak waktu di ruangan dingin."), ("Panas/lembap", "Sering berkeringat."), ("Matahari/polusi", "Banyak aktivitas luar ruang."), ("Campuran", "Paparan sering berubah.")), "Lingkungan dapat mengubah respons kulit tanpa mengubah diagnosis."),
        _question("sleep_stress", f"Seberapa sering stres atau kurang tidur bertepatan dengan memburuknya {concern}?", (("Tidak terlihat", "Tidak ada pola yang jelas."), ("Kadang", "Sesekali terjadi bersamaan."), ("Sering", "Polanya cukup konsisten."), ("Sangat kuat", "Hampir selalu memburuk bersamaan.")), "Menyimpan faktor kebiasaan sebagai konteks, bukan sebab pasti."),
        _question("desired_pace", "Pendekatan hasil yang paling kamu prioritaskan?", (("Pelan dan gentle", "Minimalkan risiko iritasi."), ("Seimbang", "Seimbang antara toleransi dan progres."), ("Secepat mungkin", "Bersedia menjalani routine lebih aktif."), ("Belum tahu", "Butuh pendekatan paling aman dahulu.")), "Menyesuaikan intensitas rekomendasi dengan preferensi user."),
        _question("patch_test", "Seberapa rutin kamu melakukan patch test produk baru?", (("Selalu", "Menguji area kecil terlebih dahulu."), ("Kadang", "Hanya pada active tertentu."), ("Tidak pernah", "Langsung memakai pada wajah."), ("Belum tahu caranya", "Belum memahami langkah patch test.")), "Perilaku patch test memengaruhi edukasi keamanan."),
    ]
    assert {question.id for question in questions} == set(PERSONALIZATION_QUESTION_IDS)
    return questions


def _apply_answer(profile: ResolvedSkinProfile, question_id: str, answer: str, updates: list[str]) -> None:
    signal = _ANSWER_SIGNALS[question_id][answer]
    profile.context_signals[question_id] = signal
    updates.append(f"{question_id}={signal}")

    if question_id == "concern_frequency":
        profile.concern_severity = {"A": "mild", "B": "mild", "C": "moderate", "D": "high"}[answer]
    elif question_id == "reaction_symptoms" and answer in {"A", "B", "C"}:
        profile.sensitivity_level = "high"
    elif question_id == "recovery_time" and answer in {"B", "C", "D"}:
        profile.sensitivity_level = "high"
    elif question_id == "cleanser_afterfeel":
        if answer == "B":
            _append_unique(profile.concerns, ["dryness"])
        elif answer == "D":
            profile.sensitivity_level = "high"
    elif question_id == "fragrance_tolerance":
        if answer == "C":
            _append_unique(profile.avoid_ingredients, ["fragrance"])
        elif answer == "B":
            profile.sensitivity_level = "high"
    elif question_id == "sunscreen_tolerance":
        if answer == "C":
            profile.sensitivity_level = "high"
        elif answer == "D":
            _append_unique(profile.concerns, ["acne"])
    elif question_id == "exfoliant_use":
        _append_unique(profile.current_ingredients, {"B": ["aha"], "C": ["salicylic acid"], "D": ["aha", "salicylic acid"]}.get(answer, []))
    elif question_id == "retinoid_use" and answer != "A":
        _append_unique(profile.current_ingredients, ["retinoid"])
    elif question_id == "routine_layers":
        profile.routine_complexity = {"A": "basic", "B": "basic", "C": "complex", "D": "complex"}[answer]
    elif question_id == "climate_exposure":
        _append_unique(profile.environmental_factors, [signal])
    elif question_id == "moisturizer_texture" and answer != "D":
        _append_unique(profile.product_preferences, [f"moisturizer_{signal}"])
    elif question_id == "desired_pace":
        _append_unique(profile.product_preferences, [f"pace_{signal}"])


def _question_priority(profile: ResolvedSkinProfile, question_id: str) -> int:
    priority = PERSONALIZATION_QUESTION_IDS.index(question_id) * 10
    if profile.sensitivity_level == "high":
        focus = ("reaction_onset", "reaction_symptoms", "recovery_time", "fragrance_tolerance", "patch_test")
        if question_id in focus:
            priority -= 100 - focus.index(question_id)
    if "acne" in profile.concerns:
        focus = ("concern_area", "concern_frequency", "concern_trigger", "sunscreen_tolerance")
        if question_id in focus:
            priority -= 80 - focus.index(question_id)
    if {"dryness", "hydrating"}.intersection(profile.concerns):
        focus = ("cleanser_afterfeel", "midday_skin", "moisturizer_texture", "climate_exposure")
        if question_id in focus:
            priority -= 60 - focus.index(question_id)
    if profile.routine_complexity in {"active", "complex"}:
        focus = ("active_frequency", "exfoliant_use", "retinoid_use", "routine_layers")
        if question_id in focus:
            priority -= 70 - focus.index(question_id)
    return priority


def personalize_profile(request: ProfilePersonalizationRequest) -> ProfilePersonalizationResponse:
    profile = request.profile.model_copy(deep=True)
    updates: list[str] = []
    for question_id in PERSONALIZATION_QUESTION_IDS:
        if answer := request.answers.get(question_id):
            _apply_answer(profile, question_id, answer, updates)

    remaining = [question for question in _build_questions(profile) if question.id not in request.answers]
    remaining.sort(key=lambda question: _question_priority(profile, question.id))
    return ProfilePersonalizationResponse(
        version=PERSONALIZATION_VERSION,
        profile=profile,
        questions=remaining,
        answered_count=len(request.answers),
        completed=not remaining,
        profile_updates=updates,
    )


def learn_from_product_feedback(request: ProductFeedbackRequest) -> ProductFeedbackResponse:
    profile = request.profile.model_copy(deep=True)
    product_key = f"{request.product.brand}::{request.product.name}"
    profile.feedback_count += 1
    profile.context_signals["last_product_outcome"] = request.outcome
    profile.context_signals["last_product_usage_days"] = str(request.usage_days)
    updates = [f"feedback_count={profile.feedback_count}", f"last_product_outcome={request.outcome}"]
    action = "monitor"
    safety_message: str | None = None

    if request.outcome == "improved":
        _append_unique(profile.successful_products, [product_key])
        if product_key in profile.excluded_products:
            profile.excluded_products.remove(product_key)
        action = "continue"
        updates.append(f"successful_product={product_key}")
    elif request.outcome in {"worsened", "reaction"}:
        _append_unique(profile.excluded_products, [product_key])
        _append_unique(profile.avoid_ingredients, request.suspected_ingredients)
        action = "stop"
        updates.append(f"excluded_product={product_key}")
        if request.suspected_ingredients:
            updates.append("suspected ingredients ditambahkan ke avoid list user")

    if request.outcome in {"worsened", "reaction"} and request.reaction_severity in {"moderate", "severe"}:
        profile.sensitivity_level = "high"
        _append_unique(profile.conditions, ["damaged_barrier"])
        updates.append("sensitivity dan barrier context dinaikkan karena reaksi")
    if request.reaction_severity == "severe":
        action = "stop_and_seek_care"
        safety_message = "Hentikan produk dan cari pertolongan medis, terutama bila ada bengkak, sesak napas, lepuh, atau nyeri hebat."

    learning_signal = None
    if request.consent_to_learning:
        learning_signal = FeedbackLearningSignal(
            schema_version=FEEDBACK_SCHEMA_VERSION,
            outcome=request.outcome,
            usage_days=request.usage_days,
            reaction_severity=request.reaction_severity,
            product_name=request.product.name,
            product_brand=request.product.brand,
            matching_chemicals=request.product.matching_chemicals,
            model_version=request.product.model_version,
            skin_type=profile.skin_type,
            concerns=profile.concerns,
            conditions=profile.conditions,
            eligible_for_offline_training=request.usage_days >= 7 or request.reaction_severity in {"moderate", "severe"},
        )

    return ProductFeedbackResponse(
        profile=profile,
        action=action,
        profile_updates=updates,
        safety_message=safety_message,
        learning_signal=learning_signal,
    )
