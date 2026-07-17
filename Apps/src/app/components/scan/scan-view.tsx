import {
  Camera,
  FileText,
  Image as ImageIcon,
  LockKeyhole,
  ScanLine,
  Search,
  ShoppingBag,
} from "lucide-react";

import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

export function ScanView() {
  return (
    <PageMain>
      <AppHeader />

      <header className="mb-[18px]">
        <MicroLabel>ANALISIS PRODUK</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Scan produk
        </h1>
        <p className="mt-2 max-w-[22rem] text-[0.8rem] leading-normal text-on-surface-variant">
          Arahkan kamera ke label komposisi agar semua bahan terbaca jelas.
        </p>
      </header>

      <section
        className="rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-2.5 shadow-card"
        aria-labelledby="capture-title"
      >
        <div className="viewfinder" aria-hidden="true">
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />
          <span className="scan-beam" />
          <span className="viewfinder-icon"><ScanLine /></span>
        </div>
        <div className="px-1 pt-2.5 pb-[9px] text-center">
          <h2 id="capture-title" className="text-[0.94rem] font-bold leading-[1.35] tracking-[-0.02em]">
            Pastikan komposisi terlihat
          </h2>
          <p className="mx-auto mt-[5px] max-w-[18rem] text-[0.7rem] leading-normal text-on-surface-variant">
            Gunakan pencahayaan terang dan hindari pantulan pada kemasan.
          </p>
        </div>
        <Button asChild variant="primary" size="pill" className="min-h-[46px]">
          <label htmlFor="camera-upload">
            <Camera aria-hidden="true" />
            Ambil foto
          </label>
        </Button>
        <input
          className="sr-only"
          id="camera-upload"
          name="camera-upload"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <Button asChild variant="secondary" size="pill" className="mt-[6px] min-h-[46px]">
          <label htmlFor="gallery-upload">
            <ImageIcon aria-hidden="true" />
            Unggah dari galeri
          </label>
        </Button>
        <input
          className="sr-only"
          id="gallery-upload"
          name="gallery-upload"
          type="file"
          accept="image/*"
        />
      </section>

      <div className="divider"><span>ATAU</span></div>

      <section aria-labelledby="manual-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <MicroLabel>INPUT MANUAL</MicroLabel>
            <h2 id="manual-title" className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
              Tempel daftar bahan
            </h2>
          </div>
        </div>
        <label className="flex min-h-[86px] items-start gap-2.5 rounded-[16px] border border-outline-variant bg-white p-[13px] focus-within:border-2 focus-within:border-primary focus-within:p-[14px] [&>svg]:mt-0.5 [&>svg]:size-[19px] [&>svg]:shrink-0 [&>svg]:text-outline">
          <Search aria-hidden="true" />
          <textarea
            className="min-h-[58px] w-full resize-y border-0 bg-transparent leading-[1.45] text-on-surface outline-0 placeholder:text-[#928a9e]"
            aria-label="Daftar bahan produk"
            name="ingredients"
            placeholder="Contoh: Aqua, Glycerin, Niacinamide..."
            rows={3}
          />
        </label>
      </section>

      <section className="mt-5" aria-labelledby="supported-title">
        <MicroLabel id="supported-title">FORMAT YANG DIDUKUNG</MicroLabel>
        <div className="mt-2.5 grid grid-cols-3 gap-2 [&>div]:flex [&>div]:min-h-[64px] [&>div]:flex-col [&>div]:items-center [&>div]:justify-center [&>div]:gap-[7px] [&>div]:rounded-[14px] [&>div]:bg-surface-container [&>div]:px-1.5 [&>div]:py-2.5 [&>div]:text-center [&>div]:text-[0.68rem] [&>div]:font-[650] [&>div]:text-on-surface-variant [&_svg]:size-5 [&_svg]:text-primary">
          <div><ShoppingBag aria-hidden="true" /><span>Kemasan</span></div>
          <div><ImageIcon aria-hidden="true" /><span>Screenshot</span></div>
          <div><FileText aria-hidden="true" /><span>Daftar bahan</span></div>
        </div>
      </section>

      <p className="mt-4 flex items-start gap-[7px] text-[0.7rem] leading-normal text-on-surface-variant [&>svg]:mt-px [&>svg]:size-[15px] [&>svg]:shrink-0">
        <LockKeyhole aria-hidden="true" />
        Foto diproses secara privat dan tidak dipakai untuk melatih model.
      </p>
    </PageMain>
  );
}
