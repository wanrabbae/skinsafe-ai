"use client";

import { AlertTriangle, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";

import { useCurrentProfileResult } from "../profile-cache";
import { formatProfileLabel } from "../profile-display";

export function CurrentProfileCard() {
  const { data: result } = useCurrentProfileResult();
  const resolution = result?.resolution;
  const profile = resolution?.profile;
  const confidence = resolution?.confidence.score ?? 0;
  const ready = resolution?.canRecommend ?? false;
  const status = !resolution
    ? "PROFIL BELUM DIISI"
    : ready
      ? "PROFIL SIAP"
      : "PROFIL PERLU KONFIRMASI";

  return (
    <section className="readiness-card" aria-labelledby="readiness-title">
      <div className="card-icon card-icon-primary">
        {resolution && !ready ? (
          <AlertTriangle aria-hidden="true" />
        ) : (
          <Sparkles aria-hidden="true" />
        )}
      </div>
      <p className="micro-label">{status}</p>
      <h2 id="readiness-title">
        {profile
          ? `${formatProfileLabel(profile.skinType)} · sensitivitas ${formatProfileLabel(profile.sensitivityLevel).toLowerCase()}`
          : "Kenali kebutuhan kulitmu"}
      </h2>
      <p className="supporting-text">
        {!resolution
          ? "Ceritakan kondisi kulitmu agar rekomendasi produk tidak memakai asumsi umum."
          : ready
            ? "Profil ini berasal dari jawabanmu dan siap dipakai untuk personalisasi rekomendasi."
            : "AI membutuhkan konfirmasi tambahan sebelum memberikan ranking produk."}
      </p>

      {profile && [...profile.concerns, ...profile.conditions].length > 0 ? (
        <div className="chip-row profile-card-chips" aria-label="Kebutuhan kulit yang terbaca">
          {profile.concerns.slice(0, 3).map((concern) => (
            <span className="chip" key={concern}>
              {formatProfileLabel(concern)}
            </span>
          ))}
          {profile.conditions.slice(0, 2).map((condition) => (
            <span className="chip chip-caution" key={condition}>
              {formatProfileLabel(condition)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="progress-label">
        <span>{resolution ? "Keyakinan pemahaman AI" : "Profil tersedia"}</span>
        <strong>{confidence}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={resolution ? "Keyakinan pemahaman AI" : "Kelengkapan profil"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={confidence}
      >
        <span style={{ width: `${confidence}%` }} />
      </div>
      <Link className="primary-button" href={ready ? "/scan" : "/profile"}>
        {ready ? <ScanLine aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {ready ? "Scan produk" : resolution ? "Lengkapi profil" : "Isi profil kulit"}
      </Link>
    </section>
  );
}
