"use client";

import { ClipboardList, ImageIcon } from "lucide-react";
import Link from "next/link";

import { ProfileSummaryCard, useProfileResult } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { Chip, MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

type Tone = "safe" | "caution" | "danger";

const toneMeta: Record<Tone, { label: string; score: string }> = {
  safe: { label: "Aman", score: "text-safe" },
  caution: { label: "Hati-hati", score: "text-caution" },
  danger: { label: "Hindari", score: "text-danger" },
};

const products: Array<{
  id: string;
  name: string;
  category: string;
  tone: Tone;
  score: number;
}> = [
  { id: "1", name: "Gentle Hydrating Cleanser", category: "Pembersih Wajah", tone: "safe", score: 92 },
  { id: "2", name: "Barrier Repair Moisturizer", category: "Pelembap", tone: "safe", score: 88 },
  { id: "3", name: "Niacinamide 10% Serum", category: "Serum", tone: "caution", score: 74 },
  { id: "4", name: "Brightening Vitamin C Ampoule", category: "Serum", tone: "caution", score: 68 },
  { id: "5", name: "Instant Whitening Night Cream", category: "Krim Malam", tone: "danger", score: 41 },
];

export function RecommendationView() {
  const { result, loaded } = useProfileResult();

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

      <section className="mt-6" aria-labelledby="products-title">
        <h2 id="products-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
          Produk untukmu
        </h2>
        <div className="space-y-3">
          {products.map(({ id, name, category, tone, score }) => (
            <article
              key={id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-3 shadow-card"
            >
              <div className="flex aspect-[4/5] w-16 items-center justify-center overflow-hidden rounded-2xl bg-surface-container text-outline [&_svg]:size-6">
                <ImageIcon aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[0.9rem] font-bold">{name}</h3>
                <p className="text-[0.75rem] text-on-surface-variant">{category}</p>
                <Chip tone={tone} className="mt-1.5">
                  {toneMeta[tone].label}
                </Chip>
              </div>
              <div className="pr-1 text-right">
                <p className={`text-[1.3rem] font-bold leading-none ${toneMeta[tone].score}`}>
                  {score}
                </p>
                <p className="mt-0.5 text-[0.6rem] text-on-surface-variant">/100</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageMain>
  );
}
