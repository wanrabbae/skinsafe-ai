import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

import { Chip, MicroLabel } from "@/shared/components/primitives";
import { cn } from "@/shared/lib/utils";

import { formatProfileLabel } from "../profile-display";
import type { ProfileRecommendationResult } from "../profile.types";

const heading2 = "text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]";
const alertBase =
  "flex items-start gap-[9px] rounded-[18px] p-3 text-[0.7rem] leading-normal [&>svg]:size-[19px] [&>svg]:shrink-0";

export function ProfileResult({ result }: { result: ProfileRecommendationResult }) {
  const { resolution, recommendations } = result;
  return (
    <div className="mt-[18px] grid gap-3" aria-live="polite">
      <section className="rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[15px] shadow-card">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[9px]">
          <CheckCircle2 aria-hidden="true" className="size-6 text-safe" />
          <div>
            <MicroLabel>HASIL PEMAHAMAN PROFIL</MicroLabel>
            <h2 className={heading2}>Profil yang terbaca</h2>
          </div>
          <span
            data-level={resolution.confidence.level}
            className="rounded-full bg-safe-soft px-2 py-1.5 text-[0.68rem] font-extrabold text-safe data-[level=low]:bg-caution-soft data-[level=low]:text-caution"
          >
            {resolution.confidence.score}%
          </span>
        </div>
        <dl className="my-3.5 grid grid-cols-3 gap-[7px]">
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Tipe kulit</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.skinType)}</dd></div>
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Sensitivitas</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.sensitivityLevel)}</dd></div>
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Safety status</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.pregnancyStatus)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {resolution.profile.concerns.map((concern) => <Chip className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={concern}>{formatProfileLabel(concern)}</Chip>)}
          {resolution.profile.conditions.map((condition) => <Chip tone="caution" className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={condition}>{formatProfileLabel(condition)}</Chip>)}
        </div>
      </section>

      {resolution.redFlags.map((flag) => (
        <section className={cn(alertBase, "bg-danger-soft text-danger")} role="alert" key={flag.code}>
          <ShieldAlert aria-hidden="true" /><div><strong>{flag.message}</strong><p className="mt-1">{flag.action}</p></div>
        </section>
      ))}
      {[...resolution.contradictions, ...resolution.clarificationQuestions].length ? (
        <section className={cn(alertBase, "bg-caution-soft text-caution")}>
          <AlertTriangle aria-hidden="true" />
          <div><strong>Perlu konfirmasi</strong><ul className="mt-1 mb-0 pl-[17px]">{[...resolution.contradictions, ...resolution.clarificationQuestions].map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
      ) : null}

      {recommendations ? (
        <section className="mt-2" aria-labelledby="recommendation-title">
          <div className="mb-3 flex items-end justify-between gap-4"><div><MicroLabel>MODEL LOKAL</MicroLabel><h2 id="recommendation-title" className={cn("mt-1", heading2)}>Produk yang paling relevan</h2></div></div>
          <div className="grid gap-[9px]">
            {recommendations.products.map((product) => (
              <article className="grid grid-cols-[1fr_auto] gap-2 rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[13px] shadow-card" key={`${product.brand}-${product.name}`}>
                <div><p className="text-[0.6rem] font-bold uppercase text-primary-strong">{product.brand}</p><h3 className="mt-0.5 text-[0.9rem] font-bold leading-[1.4]">{product.name}</h3></div>
                <span className="text-[0.68rem] font-extrabold text-safe">{Math.round(product.relevanceScore)}% cocok</span>
                <p className="col-span-2 text-[0.65rem] leading-normal text-on-surface-variant">{product.reasons[0]}</p>
                <div className="col-span-2 flex flex-wrap gap-1.5">{product.matchingChemicals.slice(0, 3).map((ingredient) => <Chip key={ingredient}>{ingredient}</Chip>)}</div>
                {product.cautions.length ? <small className="col-span-2 rounded-[10px] bg-caution-soft px-2 py-[7px] text-[0.65rem] leading-normal text-caution">{product.cautions[0]}</small> : null}
                {product.link ? <a className="col-span-2 flex items-center justify-self-end gap-1 text-[0.67rem] font-bold text-primary-strong [&_svg]:size-[13px]" href={product.link} target="_blank" rel="noreferrer">Lihat sumber <ExternalLink aria-hidden="true" /></a> : null}
              </article>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[0.65rem] leading-normal text-on-surface-variant">Relevansi bukan diagnosis atau jaminan bebas iritasi. Lakukan patch test dan hentikan pemakaian bila muncul reaksi.</p>
        </section>
      ) : null}
    </div>
  );
}
