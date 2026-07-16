import {
  AlertTriangle,
  Ban,
  CircleCheck,
  CircleX,
  Droplet,
  Droplets,
  Leaf,
  ChevronRight,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageMain } from "@/shared/components/page-main";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import { HomeHeader } from "./home-header";

const cardShell =
  "rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-[18px] shadow-card";

const problems = [
  {
    icon: Target,
    title: "Jerawat Aktif",
    desc: "Fokus pada penyembuhan tanpa membuat kulit semakin kering.",
  },
  {
    icon: Droplet,
    title: "Kemerahan",
    desc: "Reaksi sensitif akibat skin barrier yang terganggu.",
  },
];

const recommended = [
  { name: "Niacinamide", desc: "Mencerahkan & memperkuat barrier kulit." },
  { name: "Centella Asiatica", desc: "Menenangkan peradangan & kemerahan." },
  { name: "Salicylic Acid (BHA)", desc: "Membersihkan pori & mengontrol minyak." },
  { name: "Ceramide", desc: "Menjaga kelembapan & elastisitas." },
];

const avoid = [
  { name: "Fragrance (Parfum)", desc: "Potensi iritasi tinggi pada kulit sensitif." },
  { name: "Simple Alcohols", desc: "Dapat mengikis minyak alami & membuat kering." },
  { name: "Essential Oils", desc: "Sering memicu reaksi alergi pada barrier lemah." },
];

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

export function HomeWithProfileView() {
  return (
    <PageMain>
      <HomeHeader />

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
          Berminyak &amp; Sensitif
        </h2>
        <p className="relative mt-2 text-[0.82rem] leading-relaxed text-on-surface-variant">
          Kulit Anda cenderung memproduksi sebum berlebih namun memiliki skin
          barrier yang rentan terhadap iritasi.
        </p>
      </section>

      <section className={cn(cardShell, "mt-4")} aria-labelledby="problems-title">
        <CardHeading icon={AlertTriangle} iconClass="text-caution" id="problems-title">
          Masalah Utama
        </CardHeading>
        <div className="mt-3 space-y-3">
          {problems.map(({ icon: Icon, title, desc }) => (
            <div className="flex items-start gap-3" key={title}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary [&_svg]:size-[16px]">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[0.85rem] font-bold">{title}</h3>
                <p className="mt-0.5 text-[0.75rem] leading-normal text-on-surface-variant">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(cardShell, "mt-4")} aria-labelledby="recommended-title">
        <CardHeading icon={CircleCheck} iconClass="text-safe" id="recommended-title">
          Kandungan yang Dianjurkan
        </CardHeading>
        <div className="mt-3 space-y-2">
          {recommended.map(({ name, desc }) => (
            <div className="rounded-[14px] bg-safe-soft p-3" key={name}>
              <div className="flex items-center gap-2 [&_svg]:size-[15px]">
                <Leaf aria-hidden="true" className="text-safe" />
                <h3 className="text-[0.8rem] font-bold text-safe">{name}</h3>
              </div>
              <p className="mt-1 text-[0.72rem] leading-snug text-on-surface-variant">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(cardShell, "mt-4")} aria-labelledby="avoid-title">
        <CardHeading icon={CircleX} iconClass="text-danger" id="avoid-title">
          Kandungan yang Dihindari
        </CardHeading>
        <div className="mt-3 space-y-2">
          {avoid.map(({ name, desc }) => (
            <div className="rounded-[14px] bg-danger-soft p-3" key={name}>
              <div className="flex items-center gap-2 [&_svg]:size-[15px]">
                <Ban aria-hidden="true" className="text-danger" />
                <h3 className="text-[0.8rem] font-bold text-danger">{name}</h3>
              </div>
              <p className="mt-1 text-[0.72rem] leading-snug text-on-surface-variant">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PageMain>
  );
}
