import { CheckCircle2 } from "lucide-react";

import { Chip, MicroLabel } from "@/shared/components/primitives";

import { formatProfileLabel } from "../profile-display";
import type { ProfileRecommendationResult } from "../profile.types";

export function ProfileSummaryCard({
  result,
}: {
  result: ProfileRecommendationResult;
}) {
  const { resolution } = result;
  return (
    <section className="rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[15px] shadow-card">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[9px]">
        <CheckCircle2 aria-hidden="true" className="size-6 text-safe" />
        <div>
          <MicroLabel>HASIL PEMAHAMAN PROFIL</MicroLabel>
          <h2 className="text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
            Profil yang terbaca
          </h2>
        </div>
        <span
          data-level={resolution.confidence.level}
          className="rounded-full bg-safe-soft px-2 py-1.5 text-[0.68rem] font-extrabold text-safe data-[level=low]:bg-caution-soft data-[level=low]:text-caution"
        >
          {resolution.confidence.score}%
        </span>
      </div>
      <dl className="my-3.5 grid grid-cols-3 gap-[7px]">
        <div className="rounded-[12px] bg-surface-low p-2">
          <dt className="text-[0.56rem] text-outline">Tipe kulit</dt>
          <dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.skinType)}</dd>
        </div>
        <div className="rounded-[12px] bg-surface-low p-2">
          <dt className="text-[0.56rem] text-outline">Sensitivitas</dt>
          <dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.sensitivityLevel)}</dd>
        </div>
        <div className="rounded-[12px] bg-surface-low p-2">
          <dt className="text-[0.56rem] text-outline">Safety status</dt>
          <dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.pregnancyStatus)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {resolution.profile.concerns.map((concern) => (
          <Chip className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={concern}>
            {formatProfileLabel(concern)}
          </Chip>
        ))}
        {resolution.profile.conditions.map((condition) => (
          <Chip tone="caution" className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={condition}>
            {formatProfileLabel(condition)}
          </Chip>
        ))}
      </div>
    </section>
  );
}
