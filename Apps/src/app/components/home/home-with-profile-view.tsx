import {
  AlertTriangle,
  Droplet,
  Droplets,
  ChevronRight,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RecommendedChemicalsAccordion } from "@/app/components/home/recommended-chemicals-accordion";
import { formatProfileLabel } from "@/modules/profile";
import type { ProfileRecommendationResult } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const cardShell =
  "rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-[18px] shadow-card";

const problemIcons: Record<string, LucideIcon> = {
  acne: Target,
  redness: Droplet,
  oiliness: Droplets,
  dryness: Droplet,
  dullness: Droplet,
  aging: Target,
  discomfort: AlertTriangle,
  hydrating: Droplet,
  "uneven skintone": Droplet,
};

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function CardHeading({
  icon: Icon,
  iconClass,
  id,
  children,
}: {
  icon: LucideIcon;
  iconClass: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon aria-hidden="true" className={cn("size-[18px]", iconClass)} />
      <h2 id={id} className="text-[0.95rem] font-bold">
        {children}
      </h2>
    </div>
  );
}

export function HomeWithProfileView({
  result,
}: {
  result: ProfileRecommendationResult | null;
}) {
  const profile = result?.resolution.profile;

  const skinTypeTitle = profile?.skinType
    ? `${formatProfileLabel(profile.skinType)}${
        profile.sensitivityLevel !== "low" ? " & Sensitif" : ""
      }`
    : "Berminyak & Sensitif";

  const skinTypeDesc = profile?.skinType
    ? `Sensitivitas kulit Anda tergolong ${formatProfileLabel(
        profile.sensitivityLevel,
      ).toLowerCase()}. Rawat sesuai kebutuhan tipe kulit Anda.`
    : "Kulit Anda cenderung memproduksi sebum berlebih namun memiliki skin barrier yang rentan terhadap iritasi.";

  const problemCodes = profile
    ? [...new Set([...profile.concerns, ...profile.conditions])]
    : [];
  const problems = problemCodes.map((code) => ({
    icon: problemIcons[code] ?? Target,
    title: formatProfileLabel(code),
  }));

  const products = result?.recommendations?.products ?? [];
  const recommendedChems = unique(products.flatMap((product) => product.matchingChemicals));
  const attentionNotes = unique(products.flatMap((product) => product.cautions));

  return (
    <PageMain>
      <AppHeader />

      <div>
        <h1 className="text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Profil Kulit Anda
        </h1>
        <p className="mt-2 max-w-[22rem] text-[0.82rem] leading-normal text-on-surface-variant">
          Berdasarkan hasil kuis, berikut adalah analisis dan rekomendasi khusus
          untuk kulit Anda.
        </p>
        <Button asChild variant="primary" size="pill" className="mt-4">
          <Link href="/test/hasil">
            Lihat hasil kamu
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <section
        className={cn(cardShell, "relative mt-4 overflow-hidden")}
        aria-labelledby="skin-type-title"
      >
        <div
          className="absolute -right-8 -top-8 size-28 rounded-full border-[6px] border-primary-soft"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2.5">
          <Droplets aria-hidden="true" className="size-[18px] text-primary" />
          <p className="text-[0.8rem] font-semibold text-on-surface-variant">Jenis Kulit Utama</p>
        </div>
        <h2
          id="skin-type-title"
          className="relative mt-2 text-[1.6rem] font-bold leading-[1.2] text-primary-strong"
        >
          {skinTypeTitle}
        </h2>
        <p className="relative mt-2 text-[0.82rem] leading-relaxed text-on-surface-variant">
          {skinTypeDesc}
        </p>
      </section>

      <section className={cn(cardShell, "mt-4")} aria-labelledby="problems-title">
        <CardHeading icon={AlertTriangle} iconClass="text-caution" id="problems-title">
          Masalah Utama
        </CardHeading>
        {problems.length ? (
          <div className="mt-3 space-y-3">
            {problems.map(({ icon: Icon, title }) => (
              <div className="flex items-start gap-3" key={title}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary [&_svg]:size-[16px]">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[0.85rem] font-bold">{title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[0.8rem] leading-normal text-on-surface-variant">
            Belum ada masalah kulit yang terdeteksi dari profilmu. Lengkapi{" "}
            <Link href="/test" className="font-bold text-primary-strong">
              tes profil kulit
            </Link>{" "}
            untuk analisis yang lebih akurat.
          </p>
        )}
      </section>

      {recommendedChems.length ? (
        <RecommendedChemicalsAccordion
          chemicals={recommendedChems}
          profileCodes={problemCodes}
        />
      ) : null}

      {attentionNotes.length ? (
        <section className={cn(cardShell, "mt-4")} aria-labelledby="attention-title">
          <CardHeading icon={AlertTriangle} iconClass="text-danger" id="attention-title">
            Hal yang Perlu Diperhatikan
          </CardHeading>
          <div className="mt-3 space-y-2">
            {attentionNotes.map((note) => (
              <div className="rounded-[14px] bg-danger-soft p-3" key={note}>
                <p className="text-[0.75rem] leading-snug text-on-surface-variant">{note}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageMain>
  );
}
