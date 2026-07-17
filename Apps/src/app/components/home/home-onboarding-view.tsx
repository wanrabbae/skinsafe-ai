import Link from "next/link";
import {
  ClipboardList,
  LineChart,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { CardIcon, MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

export function HomeOnboardingView() {
  return (
    <PageMain>
      <AppHeader />

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
