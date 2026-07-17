"use client";

import {
  AlertTriangle,
  Ban,
  BookOpen,
  CircleCheck,
  FlaskConical,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { useScanResult } from "@/modules/scan";
import type { AnalysisReport } from "@/modules/scan";
import { AppHeader } from "@/shared/components/app-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { PageMain } from "@/shared/components/page-main";
import { Button } from "@/shared/components/ui/button";

const CIRCUMFERENCE = 2 * Math.PI * 52;

type Tone = "safe" | "caution" | "danger";

const statusMeta: Record<
  AnalysisReport["status"],
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  recommended: { label: "Direkomendasikan", tone: "safe", icon: CircleCheck },
  generally_ok: { label: "Umumnya Aman", tone: "safe", icon: CircleCheck },
  use_with_caution: { label: "Gunakan dengan Hati-hati", tone: "caution", icon: AlertTriangle },
  high_caution: { label: "Perlu Kewaspadaan Tinggi", tone: "caution", icon: AlertTriangle },
  avoid: { label: "Hindari", tone: "danger", icon: Ban },
};

const toneRing: Record<Tone, string> = {
  safe: "text-safe-bright",
  caution: "text-caution-bright",
  danger: "text-danger",
};

const toneBadge: Record<Tone, string> = {
  safe: "bg-safe-soft text-safe",
  caution: "bg-caution-soft text-caution",
  danger: "bg-danger-soft text-danger",
};

const toneText: Record<Tone, string> = {
  safe: "text-safe",
  caution: "text-caution",
  danger: "text-danger",
};

const severityIcon: Record<string, LucideIcon> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  caution: FlaskConical,
  info: FlaskConical,
};

function scoreTone(score: number): Tone {
  if (score >= 70) return "safe";
  if (score >= 50) return "caution";
  return "danger";
}

function scoreBand(score: number): string {
  if (score >= 70) return "Tinggi";
  if (score >= 50) return "Sedang";
  return "Rendah";
}

function riskMeta(risk: string): { label: string; cls: string } {
  switch (risk) {
    case "beneficial":
      return { label: "Bermanfaat", cls: "bg-safe-soft text-safe" };
    case "caution":
      return { label: "Perhatian", cls: "bg-caution-soft text-caution" };
    case "high_risk":
      return { label: "Risiko tinggi", cls: "bg-danger-soft text-danger" };
    default:
      return { label: "Belum dikenali", cls: "bg-surface-container text-on-surface-variant" };
  }
}

export function ScanResultView() {
  const { result, loaded } = useScanResult();

  if (loaded && !result) {
    return (
      <PageMain>
        <AppHeader backHref="/scan" />
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
            <ScanLine aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-[1.1rem] font-bold">Belum ada hasil analisis</h1>
            <p className="mt-1 max-w-[20rem] text-[0.82rem] leading-normal text-on-surface-variant">
              Analisis produk terlebih dahulu untuk melihat rincian keamanannya.
            </p>
          </div>
          <Button asChild variant="primary" size="pill" className="mt-1">
            <Link href="/scan">Mulai scan produk</Link>
          </Button>
        </div>
      </PageMain>
    );
  }

  if (!result) return null;

  const { product, report } = result;
  const meta = statusMeta[report.status];
  const StatusIcon = meta.icon;
  const dashOffset = CIRCUMFERENCE * (1 - report.overallScore / 100);

  const bpomBadge = (() => {
    if (!product.bpomNumber) return null;
    const codes = new Set(report.findings.map((finding) => finding.code));
    if (codes.has("BPOM_NOT_REGISTERED"))
      return { label: "Tidak terdaftar di BPOM", tone: "danger" as Tone, icon: ShieldAlert };
    if (codes.has("BPOM_NOT_ACTIVE"))
      return { label: "Registrasi BPOM tidak aktif", tone: "danger" as Tone, icon: ShieldAlert };
    const trust = report.subScores.bpomTrust ?? 0;
    if (trust >= 30)
      return { label: "Terverifikasi BPOM", tone: "safe" as Tone, icon: ShieldCheck };
    if (trust >= 25)
      return { label: "Format BPOM valid, belum terverifikasi live", tone: "caution" as Tone, icon: ShieldCheck };
    return { label: "BPOM belum terverifikasi", tone: "caution" as Tone, icon: ShieldCheck };
  })();
  const BpomIcon = bpomBadge?.icon;

  const warnings = [
    ...report.findings
      .filter((finding) => finding.severity !== "info")
      .map((finding) => ({
        key: finding.code,
        icon: severityIcon[finding.severity] ?? FlaskConical,
        title: finding.code.replace(/_/g, " ").toLowerCase(),
        desc: finding.message,
      })),
    ...(report.interactionWarnings ?? []).map((warning) => ({
      key: warning.code,
      icon: severityIcon[warning.severity] ?? FlaskConical,
      title: warning.code.replace(/_/g, " ").toLowerCase(),
      desc: warning.message,
    })),
  ];

  const sub = report.subScores;
  const details: Array<{
    id: string;
    icon: LucideIcon;
    label: string;
    value: string;
    tone: Tone;
    content: string;
  }> = [];
  if (typeof sub.bpomTrust === "number") {
    details.push({
      id: "bpom",
      icon: ShieldCheck,
      label: "Skor Kepercayaan BPOM",
      value: scoreBand(sub.bpomTrust),
      tone: scoreTone(sub.bpomTrust),
      content:
        "Menilai keandalan status notifikasi BPOM produk berdasarkan data yang tersedia.",
    });
  }
  if (typeof sub.ingredientSafety === "number") {
    details.push({
      id: "ingredients",
      icon: SlidersHorizontal,
      label: "Keamanan Kandungan",
      value: `${sub.ingredientSafety}/100`,
      tone: scoreTone(sub.ingredientSafety),
      content:
        "Ringkasan keamanan kandungan berdasarkan basis data bahan dan profil kulitmu.",
    });
  }
  if (typeof sub.skinCompatibility === "number") {
    details.push({
      id: "compatibility",
      icon: SlidersHorizontal,
      label: "Kecocokan dengan Kulit",
      value: `${sub.skinCompatibility}/100`,
      tone: scoreTone(sub.skinCompatibility),
      content:
        "Seberapa cocok kandungan produk dengan tipe dan sensitivitas kulitmu.",
    });
  }
  if (typeof sub.overclaimRaw === "number") {
    const risk = sub.overclaimRaw;
    const tone: Tone = risk >= 50 ? "danger" : risk >= 30 ? "caution" : "safe";
    details.push({
      id: "claims",
      icon: ShieldAlert,
      label: "Risiko Klaim Berlebih",
      value: risk >= 50 ? "Tinggi" : risk >= 30 ? "Sedang" : "Rendah",
      tone,
      content:
        "Mengukur adanya klaim pemasaran yang berpotensi menyesatkan atau tidak terbukti.",
    });
  }

  return (
    <PageMain>
      <AppHeader backHref="/scan" />

      <div className="text-center">
        <h1 className="text-[1.5rem] font-bold leading-[1.25] tracking-[-0.02em]">
          {product.name ?? "Produk dianalisis"}
        </h1>
        {product.brand ? (
          <p className="mt-1 text-[0.85rem] text-on-surface-variant">oleh {product.brand}</p>
        ) : null}
        {bpomBadge && BpomIcon ? (
          <div className="mt-3 flex flex-col items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.72rem] font-bold [&_svg]:size-[15px] ${toneBadge[bpomBadge.tone]}`}
            >
              <BpomIcon aria-hidden="true" />
              {bpomBadge.label}
            </span>
            <span className="font-mono text-[0.7rem] text-on-surface-variant">
              {product.bpomNumber}
            </span>
          </div>
        ) : null}
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
              className={toneRing[meta.tone]}
              stroke="currentColor"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[3rem] font-bold leading-none text-on-surface">
              {report.overallScore}
            </span>
            <span className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-on-surface-variant">
              Skor SkinSafe
            </span>
          </div>
        </div>
        <span
          className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.8rem] font-bold [&_svg]:size-[17px] ${toneBadge[meta.tone]}`}
        >
          <StatusIcon aria-hidden="true" />
          {meta.label}
        </span>
      </section>

      {report.recommendation ? (
        <p className="mt-4 text-center text-[0.82rem] leading-normal text-on-surface-variant">
          {report.recommendation}
        </p>
      ) : null}

      {warnings.length ? (
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
            {warnings.map(({ key, icon: Icon, title, desc }) => (
              <div className="flex items-start gap-3" key={key}>
                <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-danger" />
                <div>
                  <h3 className="text-[0.85rem] font-bold capitalize">{title}</h3>
                  <p className="mt-0.5 text-[0.75rem] leading-normal text-on-surface-variant">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {details.length ? (
        <section className="mt-6" aria-labelledby="details-title">
          <h2 id="details-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
            Rincian Analisis
          </h2>
          <Accordion type="single" collapsible className="space-y-2.5">
            {details.map(({ id, icon: Icon, label, value, tone, content }) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger>
                  <Icon aria-hidden="true" className={`size-[18px] shrink-0 ${toneText[tone]}`} />
                  <span className="flex-1">{label}</span>
                  <span className={`text-[0.85rem] font-bold ${toneText[tone]}`}>{value}</span>
                </AccordionTrigger>
                <AccordionContent>{content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      {report.ingredientDetails?.length ? (
        <section className="mt-6" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
            Detail Bahan
          </h2>
          <Accordion type="single" collapsible className="space-y-2.5">
            {report.ingredientDetails.map((ingredient, index) => {
              const rmeta = riskMeta(ingredient.riskLevel);
              const hasDetail =
                ingredient.benefitsSummary ||
                ingredient.cautionNotes ||
                ingredient.compatibilityNotes ||
                ingredient.usageFrequency ||
                ingredient.relevantSymptoms.length > 0;
              return (
                <AccordionItem key={`${ingredient.name}-${index}`} value={`ingredient-${index}`}>
                  <AccordionTrigger>
                    <span className="flex-1 truncate capitalize">
                      {ingredient.canonicalName ?? ingredient.name}
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold ${rmeta.cls}`}>
                      {rmeta.label}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 text-[0.78rem] leading-normal">
                      {ingredient.benefitsSummary ? (
                        <p><strong className="font-semibold">Manfaat:</strong> {ingredient.benefitsSummary}</p>
                      ) : null}
                      {ingredient.cautionNotes ? (
                        <p><strong className="font-semibold">Perhatian:</strong> {ingredient.cautionNotes}</p>
                      ) : null}
                      {ingredient.compatibilityNotes ? (
                        <p><strong className="font-semibold">Kecocokan:</strong> {ingredient.compatibilityNotes}</p>
                      ) : null}
                      {ingredient.usageFrequency ? (
                        <p><strong className="font-semibold">Frekuensi:</strong> {ingredient.usageFrequency}</p>
                      ) : null}
                      {ingredient.relevantSymptoms.length ? (
                        <p className="capitalize">
                          <strong className="font-semibold normal-case">Relevan untuk:</strong>{" "}
                          {ingredient.relevantSymptoms.join(", ")}
                        </p>
                      ) : null}
                      {ingredient.chemicalType ? (
                        <p className="text-on-surface-variant">Tipe: {ingredient.chemicalType}</p>
                      ) : null}
                      {!hasDetail ? (
                        <p className="text-on-surface-variant">
                          Belum ada catatan detail untuk bahan ini pada dataset.
                        </p>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      ) : null}

      {report.education?.length ? (
        <section className="mt-6" aria-labelledby="education-title">
          <h2 id="education-title" className="mb-3 text-[1.08rem] font-bold tracking-[-0.02em]">
            Edukasi
          </h2>
          <div className="space-y-2.5">
            {report.education.map((item) => (
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

      <div className="mt-6 text-center">
        <p className="text-[0.85rem] font-bold text-primary-strong">
          Tingkat Keyakinan: {report.confidence.score}%
        </p>
        <p className="mx-auto mt-2 max-w-[20rem] text-[0.72rem] leading-normal text-on-surface-variant">
          Disclaimer: Analisis ini berdasarkan data yang tersedia dan pemodelan AI. Tidak
          menggantikan saran medis profesional. Selalu lakukan patch test produk baru.
        </p>
      </div>
    </PageMain>
  );
}
