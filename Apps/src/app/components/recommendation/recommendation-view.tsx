"use client";

import {
  AlertTriangle,
  Ban,
  BookOpen,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { ProfileSummaryCard, useProfileResult } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { Chip, MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type Tone = "safe" | "caution" | "danger";

const toneMeta: Record<Tone, { label: string; icon: LucideIcon; color: string }> = {
  safe: { label: "Aman", icon: CircleCheck, color: "text-safe" },
  caution: { label: "Hati-hati", icon: AlertTriangle, color: "text-caution" },
  danger: { label: "Hindari", icon: Ban, color: "text-danger" },
};

const RING_C = 2 * Math.PI * 26;

function scoreTone(score: number): Tone {
  if (score >= 70) return "safe";
  if (score >= 50) return "caution";
  return "danger";
}

export function RecommendationView() {
  const { result, loaded } = useProfileResult();
  const products = result?.recommendations?.products ?? [];

  return (
    <PageMain>
      <AppHeader />

      <div>
        <MicroLabel>REKOMENDASI</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Rekomendasi produk
        </h1>
      </div>

      {result ? (
        <div className="mt-5">
          <ProfileSummaryCard result={result} />
        </div>
      ) : null}

      {loaded && !result ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-6 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
            <ClipboardList aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[1rem] font-bold">Belum ada profil kulit</h2>
            <p className="mt-1 text-[0.8rem] leading-normal text-on-surface-variant">
              Lakukan tes profil kulit dulu agar rekomendasi lebih sesuai untukmu.
            </p>
          </div>
          <Button asChild variant="primary" size="pill" className="mt-1">
            <Link href="/test">Mulai tes profil kulit</Link>
          </Button>
        </div>
      ) : null}

      {result?.recommendations ? (
        <section className="mt-6" aria-labelledby="products-title">
          <h2 id="products-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
            Produk untukmu
          </h2>
          {products.length === 0 ? (
            <p className="rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-5 text-center text-[0.82rem] leading-normal text-on-surface-variant shadow-card">
              Belum ada produk yang cocok dari katalog lokal untuk profil ini.
            </p>
          ) : (
            <div className="space-y-3">
              {products.map(({ name, brand, link, matchingSymptoms, relevanceScore, cautions }) => {
                const score = Math.round(relevanceScore);
                const tone = scoreTone(score);
                const meta = toneMeta[tone];
                const Icon = meta.icon;
                const subtitle = matchingSymptoms.length
                  ? matchingSymptoms.join(" \u2022 ")
                  : cautions[0];
                return (
                  <article
                    key={`${brand}-${name}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-3 shadow-card"
                  >
                    <div className="flex aspect-[4/5] w-[68px] items-center justify-center overflow-hidden rounded-lg bg-primary-softest text-primary/40 [&_svg]:size-7">
                      <ImageIcon aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
                        {brand}
                      </p>
                      <h3 className="truncate text-[1rem] font-bold leading-[1.3]">{name}</h3>
                      {subtitle ? (
                        <p className="mt-0.5 truncate text-[0.78rem] capitalize text-on-surface-variant">
                          {subtitle}
                        </p>
                      ) : null}
                      <Chip
                        tone={tone}
                        className="mt-2 min-h-[26px] gap-1 px-2.5 text-[0.72rem] [&_svg]:size-3.5"
                      >
                        <Icon aria-hidden="true" />
                        {meta.label}
                      </Chip>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-16 w-px bg-outline-variant/60" />
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="relative size-[58px]">
                          <svg className="size-full -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
                            <circle
                              cx="30"
                              cy="30"
                              r="26"
                              fill="none"
                              strokeWidth="4"
                              className="text-surface-high"
                              stroke="currentColor"
                            />
                            <circle
                              cx="30"
                              cy="30"
                              r="26"
                              fill="none"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className={meta.color}
                              stroke="currentColor"
                              strokeDasharray={RING_C}
                              strokeDashoffset={RING_C * (1 - score / 100)}
                            />
                          </svg>
                          <span
                            className={cn(
                              "absolute inset-0 flex items-center justify-center text-[0.95rem] font-bold",
                              meta.color,
                            )}
                          >
                            {score}
                          </span>
                        </div>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-[0.78rem] font-bold text-primary-strong [&_svg]:size-3.5"
                          >
                            Lihat
                            <ChevronRight aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {result?.recommendations?.education?.length ? (
        <section className="mt-6" aria-labelledby="rec-education-title">
          <h2 id="rec-education-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
            Edukasi
          </h2>
          <div className="space-y-2.5">
            {result.recommendations.education.map((item) => (
              <div
                key={item.code}
                className="rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-4 shadow-card"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen aria-hidden="true" className="size-[18px] shrink-0 text-primary" />
                  <h3 className="text-[0.9rem] font-bold">{item.title}</h3>
                </div>
                <p className="mt-1.5 text-[0.78rem] leading-normal text-on-surface-variant">
                  {item.message}
                </p>
                {item.evidence?.length ? (
                  <p className="mt-1 text-[0.72rem] capitalize text-on-surface-variant">
                    {item.evidence.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {result && !result.recommendations ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-6 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
            <ClipboardList aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[1rem] font-bold">Rekomendasi belum bisa ditampilkan</h2>
            <p className="mt-1 text-[0.8rem] leading-normal text-on-surface-variant">
              Lengkapi atau konfirmasi jawaban profil kulitmu agar rekomendasi produk bisa dibuat.
            </p>
          </div>
          <Button asChild variant="primary" size="pill" className="mt-1">
            <Link href="/test">Lengkapi profil kulit</Link>
          </Button>
        </div>
      ) : null}
    </PageMain>
  );
}
