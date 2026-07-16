import Link from "next/link";
import {
  ClipboardList,
  LineChart,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageMain } from "@/shared/components/page-main";
import { CardIcon, MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

import { HomeHeader } from "./home-header";

export function HomeOnboardingView() {
  return (
    <PageMain>
      <HomeHeader />

      <section
        className="rounded-3xl bg-[linear-gradient(150deg,var(--primary)_0%,var(--primary-strong)_100%)] px-5 py-[22px] text-white shadow-card"
        aria-labelledby="onboarding-hero-title"
      >
        <CardIcon className="bg-white/16 text-white">
          <ClipboardList aria-hidden="true" />
        </CardIcon>
        <h2
          id="onboarding-hero-title"
          className="mt-[14px] max-w-[15rem] text-[1.28rem] font-bold leading-[1.35] tracking-[-0.02em] text-white"
        >
          Temukan Produk yang Tepat untuk Kulitmu
        </h2>
        <p className="mt-2 max-w-[19rem] text-[0.82rem] leading-normal text-white/85">
          Ambil kuis profil kulit singkat kami untuk mendapatkan rekomendasi
          produk yang dipersonalisasi dan aman.
        </p>
        <Button
          asChild
          variant="primary"
          size="pill"
          className="mt-4 bg-white text-primary-strong hover:bg-white/90 hover:shadow-none"
        >
          <Link href="/test">
            <Play aria-hidden="true" />
            Mulai Tes Profil Kulit
          </Link>
        </Button>
      </section>

      <section className="mt-6" aria-labelledby="trending-title">
        <div className="mb-[11px] flex items-end justify-between gap-4">
          <div>
            <h2
              id="trending-title"
              className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]"
            >
              Trending Populer
            </h2>
          </div>
        </div>

        <article
          className="overflow-hidden rounded-[20px] border border-[rgb(109_40_217/8%)] bg-surface-lowest shadow-card"
          aria-label="Kunci rekomendasi personalisasi"
        >
          <div
            className="relative flex aspect-[16/9] items-center justify-center bg-surface-container blur-[6px]"
            aria-hidden="true"
          >
            <div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-1.5 bg-[rgb(29_26_36/55%)] text-center text-white filter-none [&_svg]:size-[22px]">
              <Lock aria-hidden="true" />
              <span className="px-3 text-[0.62rem] font-bold uppercase tracking-[0.06em]">
                Personalize to see matches
              </span>
            </div>
          </div>
          <div className="pointer-events-none p-[14px] opacity-60 blur-[2px]">
            <MicroLabel>DERMA-GLOW</MicroLabel>
            <h3 className="text-[0.9rem] font-bold leading-[1.4]">Advanced Hydrating Serum</h3>
            <div className="mt-4 flex items-center justify-between text-[0.75rem] text-on-surface-variant">
              <span>Kecocokan</span>
              <strong className="text-[0.75rem] text-on-surface-variant">??% Match</strong>
            </div>
            <div className="mt-[7px] h-1.5 overflow-hidden rounded-full bg-surface-highest" role="presentation">
              <span className="block h-full rounded-[inherit] bg-primary" style={{ width: "60%" }} />
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6" aria-labelledby="why-profile-title">
        <div className="mb-[11px] flex items-end justify-between gap-4">
          <div>
            <h2
              id="why-profile-title"
              className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]"
            >
              Mengapa Profil Kulit?
            </h2>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-[rgb(109_40_217/8%)] bg-surface-lowest p-4 shadow-card">
            <CardIcon variant="primary">
              <ShieldCheck aria-hidden="true" />
            </CardIcon>
            <h3 className="mt-3 text-[0.9rem] font-bold leading-[1.4]">Keamanan Terjamin</h3>
            <p className="mt-1 text-[0.76rem] leading-normal text-on-surface-variant">
              Hindari bahan yang tidak cocok dengan tipe kulitmu.
            </p>
          </div>
          <div className="rounded-[20px] border border-[rgb(109_40_217/8%)] bg-surface-lowest p-4 shadow-card">
            <CardIcon variant="primary">
              <Sparkles aria-hidden="true" />
            </CardIcon>
            <h3 className="mt-3 text-[0.9rem] font-bold leading-[1.4]">Rekomendasi AI</h3>
            <p className="mt-1 text-[0.76rem] leading-normal text-on-surface-variant">
              Dapatkan kurasi produk yang tepat sasaran.
            </p>
          </div>
          <div className="col-span-2 rounded-[20px] border border-[rgb(109_40_217/8%)] bg-surface-lowest p-4 shadow-card">
            <CardIcon variant="primary">
              <LineChart aria-hidden="true" />
            </CardIcon>
            <h3 className="mt-3 text-[0.9rem] font-bold leading-[1.4]">Lacak Perubahan</h3>
            <p className="mt-1 text-[0.76rem] leading-normal text-on-surface-variant">
              Lihat bagaimana kondisi kulitmu berkembang setiap minggu.
            </p>
          </div>
        </div>
      </section>
    </PageMain>
  );
}
