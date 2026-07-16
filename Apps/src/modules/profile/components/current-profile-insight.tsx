"use client";

import { Lightbulb } from "lucide-react";

import { useCurrentProfileResult } from "../profile-cache";

function getInsight(result: ReturnType<typeof useCurrentProfileResult>["data"]) {
  const resolution = result?.resolution;
  const profile = resolution?.profile;

  if (!resolution || !profile) {
    return {
      title: "Personalisasi dimulai dari profil",
      body: "Isi kondisi kulitmu terlebih dahulu agar literasi dan rekomendasi tidak dibuat dari profil contoh.",
    };
  }

  if (resolution.redFlags[0]) {
    return {
      title: "Utamakan evaluasi tenaga kesehatan",
      body: resolution.redFlags[0].action,
    };
  }

  if (resolution.clarificationQuestions[0]) {
    return {
      title: "Ada informasi yang perlu dilengkapi",
      body: resolution.clarificationQuestions[0],
    };
  }

  if (profile.pregnancyStatus === "pregnant" || profile.pregnancyStatus === "breastfeeding") {
    return {
      title: "Filter keamanan sedang aktif",
      body: "Periksa kembali active ingredient bersama tenaga kesehatan sebelum menambah produk baru ke rutinitas.",
    };
  }

  if (profile.sensitivityLevel === "high" || profile.conditions.includes("sensitive")) {
    return {
      title: "Perkenalkan produk secara perlahan",
      body: "Lakukan patch test dan tambahkan satu produk baru pada satu waktu agar pemicu reaksi lebih mudah dikenali.",
    };
  }

  if (profile.concerns.some((concern) => concern === "dryness" || concern === "hydrating")) {
    return {
      title: "Jaga skin barrier tetap sederhana",
      body: "Prioritaskan pembersih lembut, pelembap, dan sunscreen sebelum menumpuk banyak active ingredient.",
    };
  }

  return {
    title: "Uji kecocokan secara bertahap",
    body: "Rekomendasi membantu menyaring pilihan, tetapi patch test dan pemantauan reaksi kulit tetap penting.",
  };
}

export function CurrentProfileInsight() {
  const query = useCurrentProfileResult();
  const insight = getInsight(query.data);

  return (
    <section className="insight-card" aria-labelledby="insight-title">
      <div className="card-icon">
        <Lightbulb aria-hidden="true" />
      </div>
      <div>
        <p className="micro-label">WAWASAN KULIT</p>
        <h2 id="insight-title">{insight.title}</h2>
        <p>{insight.body}</p>
      </div>
    </section>
  );
}
