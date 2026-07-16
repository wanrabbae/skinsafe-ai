import { ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

import { HomeHeader } from "../home/home-header";

export function RecommendationView() {
  return (
    <PageMain>
      <HomeHeader />

      <div>
        <MicroLabel>REKOMENDASI</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Rekomendasi produk
        </h1>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-6 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[1rem] font-bold">Belum ada rekomendasi</h2>
          <p className="mt-1 text-[0.8rem] leading-normal text-on-surface-variant">
            Scan produk dulu untuk melihat rekomendasi yang cocok dengan kulitmu.
          </p>
        </div>
        <Button asChild variant="primary" size="pill" className="mt-1">
          <Link href="/scan">
            <ScanLine aria-hidden="true" />
            Scan produk
          </Link>
        </Button>
      </div>
    </PageMain>
  );
}
