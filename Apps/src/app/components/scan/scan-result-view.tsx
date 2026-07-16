"use client";

import {
  AlertTriangle,
  CircleCheck,
  FlaskConical,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppHeader } from "@/shared/components/app-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { PageMain } from "@/shared/components/page-main";

const SCORE = 85;
const CIRCUMFERENCE = 2 * Math.PI * 52;

const warnings = [
  {
    icon: Megaphone,
    title: "Klaim Berlebih Terdeteksi",
    desc: 'Klaim pemasaran "Instant permanent whitening" melanggar pedoman periklanan kosmetik BPOM.',
  },
  {
    icon: FlaskConical,
    title: "Potensi Iritasi",
    desc: "Mengandung Fragrance Mix konsentrasi tinggi (Linalool, Limonene) yang dapat memicu dermatitis kontak.",
  },
];

const details: Array<{
  id: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  valueClass: string;
  content: string;
}> = [
  {
    id: "bpom",
    icon: ShieldCheck,
    iconClass: "text-safe",
    label: "Skor Kepercayaan BPOM",
    value: "Tinggi",
    valueClass: "text-safe",
    content:
      "Nomor notifikasi BPOM terverifikasi dan terdaftar aktif untuk kategori produk ini.",
  },
  {
    id: "ingredients",
    icon: SlidersHorizontal,
    iconClass: "text-primary-strong",
    label: "Keamanan Kandungan",
    value: "82/100",
    valueClass: "text-primary-strong",
    content:
      "Mayoritas kandungan tergolong aman untuk profil kulitmu, dengan beberapa bahan yang perlu diperhatikan bila kulit sensitif.",
  },
  {
    id: "claims",
    icon: ShieldAlert,
    iconClass: "text-danger",
    label: "Risiko Klaim Berlebih",
    value: "Tinggi",
    valueClass: "text-danger",
    content:
      "Terdapat klaim pemasaran yang tidak dapat dibuktikan secara ilmiah dan berpotensi menyesatkan.",
  },
];

export function ScanResultView() {
  const dashOffset = CIRCUMFERENCE * (1 - SCORE / 100);

  return (
    <PageMain>
      <AppHeader backHref="/scan" />

      <div className="text-center">
        <h1 className="text-[1.5rem] font-bold leading-[1.25] tracking-[-0.02em]">
          Radiance Glow Serum
        </h1>
        <p className="mt-1 text-[0.85rem] text-on-surface-variant">oleh SkinGlow Co.</p>
      </div>

      <section className="mt-6 flex flex-col items-center" aria-label="Skor SkinSafe">
        <div className="relative size-[180px]">
          <svg
            className="size-full -rotate-90"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="12"
              className="text-surface-high"
              stroke="currentColor"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              className="text-safe-bright"
              stroke="currentColor"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[3rem] font-bold leading-none text-on-surface">{SCORE}</span>
            <span className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
              Skor SkinSafe
            </span>
          </div>
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-safe-soft px-3.5 py-2 text-[0.8rem] font-bold text-safe [&_svg]:size-[17px]">
          <CircleCheck aria-hidden="true" />
          Direkomendasikan
        </span>
      </section>

      <section
        className="mt-6 rounded-3xl border border-danger/10 bg-danger-soft p-[18px]"
        aria-labelledby="warnings-title"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle aria-hidden="true" className="size-[18px] text-danger" />
          <h2 id="warnings-title" className="text-[0.95rem] font-bold text-danger">
            Peringatan Terdeteksi
          </h2>
        </div>
        <div className="mt-3 space-y-3.5">
          {warnings.map(({ icon: Icon, title, desc }) => (
            <div className="flex items-start gap-3" key={title}>
              <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-danger" />
              <div>
                <h3 className="text-[0.85rem] font-bold">{title}</h3>
                <p className="mt-0.5 text-[0.75rem] leading-normal text-on-surface-variant">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="details-title">
        <h2 id="details-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
          Rincian Analisis
        </h2>
        <Accordion type="single" collapsible className="space-y-2.5">
          {details.map(({ id, icon: Icon, iconClass, label, value, valueClass, content }) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger>
                <Icon aria-hidden="true" className={`size-[18px] shrink-0 ${iconClass}`} />
                <span className="flex-1">{label}</span>
                <span className={`text-[0.85rem] font-bold ${valueClass}`}>{value}</span>
              </AccordionTrigger>
              <AccordionContent>{content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <div className="mt-6 text-center">
        <p className="text-[0.85rem] font-bold text-primary-strong">Tingkat Keyakinan: 98%</p>
        <p className="mx-auto mt-2 max-w-[20rem] text-[0.72rem] leading-normal text-on-surface-variant">
          Disclaimer: Analisis ini berdasarkan data yang tersedia dan pemodelan AI. Tidak
          menggantikan saran medis profesional. Selalu lakukan patch test produk baru.
        </p>
      </div>
    </PageMain>
  );
}
