import Link from "next/link";
import { CheckCircle2, Cloud, Home, RefreshCw, WifiOff } from "lucide-react";

import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

export function OfflineView() {
  return (
    <PageMain className="flex flex-col items-stretch justify-center pt-9 text-center">
      <div className="offline-visual" aria-hidden="true">
        <Cloud className="cloud cloud-one" />
        <Cloud className="cloud cloud-two" />
        <span><WifiOff /></span>
        <i className="connection-dot dot-one" />
        <i className="connection-dot dot-two" />
        <i className="connection-dot dot-three" />
      </div>

      <div>
        <MicroLabel>KONEKSI TERPUTUS</MicroLabel>
        <h1 className="mt-1.5 text-[1.55rem] font-bold leading-[1.22] tracking-[-0.03em] text-primary-strong">
          Kamu sedang offline
        </h1>
        <p className="mx-auto mt-[9px] max-w-[19rem] text-[0.875rem] leading-[1.55] text-on-surface-variant">
          Sinkronisasi profil, unggahan, dan laporan memerlukan koneksi internet.
        </p>
      </div>

      <section
        className="mt-5 mb-3.5 rounded-3xl border border-[rgb(109_40_217/8%)] bg-white p-[15px] text-left shadow-card"
        aria-labelledby="offline-available"
      >
        <h2 id="offline-available" className="text-[0.85rem] font-bold leading-[1.35] tracking-[-0.02em]">
          Yang tetap bisa diakses
        </h2>
        <ul className="mt-3 mb-0 grid list-none gap-[9px] p-0 [&>li]:flex [&>li]:items-center [&>li]:gap-2 [&>li]:text-[0.78rem] [&>li]:text-on-surface-variant [&_svg]:size-4 [&_svg]:text-primary">
          <li><CheckCircle2 aria-hidden="true" /> Riwayat scan lokal</li>
          <li><CheckCircle2 aria-hidden="true" /> Detail produk tersimpan</li>
          <li><CheckCircle2 aria-hidden="true" /> Panduan bahan dasar</li>
        </ul>
      </section>

      <Button asChild variant="primary" size="pill">
        <a href="/offline">
          <RefreshCw aria-hidden="true" /> Coba lagi
        </a>
      </Button>
      <Button asChild variant="text" size="pill" className="mt-[6px]">
        <Link href="/">
          <Home aria-hidden="true" /> Kembali ke beranda
        </Link>
      </Button>
    </PageMain>
  );
}
