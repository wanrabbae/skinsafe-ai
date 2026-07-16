"use client";

import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Search,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ScanHistoryItem, ScanHistoryTone } from "@/modules/scan";

import { PageMain } from "@/shared/components/page-main";
import { BrandLockup, MicroLabel } from "@/shared/components/primitives";

const TONE_ICON: Record<ScanHistoryTone, LucideIcon> = {
  safe: CircleCheck,
  caution: CircleAlert,
  danger: ShieldAlert,
};

const SCORE_FILL: Record<ScanHistoryTone, string> = {
  safe: "bg-safe-bright",
  caution: "bg-caution-bright",
  danger: "bg-danger-bright",
};

const STATUS_PILL: Record<ScanHistoryTone, string> = {
  safe: "bg-safe-soft text-safe",
  caution: "bg-caution-soft text-caution",
  danger: "bg-danger-soft text-danger",
};

async function fetchScanHistory(): Promise<ScanHistoryItem[]> {
  const response = await fetch("/api/v1/scan/history");
  if (!response.ok) {
    throw new Error("Gagal memuat riwayat scan");
  }
  return response.json();
}

export function HistoryView() {
  const { data: scans = [] } = useQuery({
    queryKey: ["scan", "history"],
    queryFn: fetchScanHistory,
  });

  return (
    <PageMain>
      <header className="mb-5">
        <BrandLockup className="mb-5" />
        <MicroLabel>ARSIP PRIBADI</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Riwayat scan
        </h1>
        <p className="mt-2 max-w-[22rem] text-[0.8rem] leading-normal text-on-surface-variant">
          Temukan kembali produk yang pernah kamu analisis.
        </p>
      </header>

      <label className="flex h-[50px] items-center gap-2.5 rounded-[16px] border border-outline-variant bg-white px-[15px] focus-within:border-2 focus-within:border-primary focus-within:px-[14px] [&>svg]:size-[19px] [&>svg]:text-outline">
        <Search aria-hidden="true" />
        <input
          className="h-full w-full border-0 bg-transparent text-on-surface outline-0 placeholder:text-[#928a9e]"
          type="search"
          name="search"
          placeholder="Cari produk atau merek"
        />
      </label>

      <div
        className="mt-3 -mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[360px]:-mx-4 max-[360px]:px-4"
        aria-label="Filter status keamanan"
      >
        {["Semua", "Aman", "Waspada", "Hindari"].map((label, index) => (
          <button
            key={label}
            className="min-h-[34px] flex-none rounded-full border-0 bg-surface-highest px-[13px] text-[0.75rem] font-[650] text-on-surface-variant cursor-pointer data-[active=true]:bg-primary data-[active=true]:text-white"
            data-active={index === 0 ? "true" : undefined}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-3.5 grid gap-2.5" aria-label="Daftar riwayat scan">
        {scans.map((scan) => {
          const StatusIcon = TONE_ICON[scan.tone];
          return (
            <article
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[rgb(109_40_217/7%)] bg-white p-2.5 shadow-card max-[360px]:gap-[9px]"
              key={scan.name}
            >
              <div className={`product-thumbnail product-thumbnail-${scan.tone}`} aria-hidden="true">
                <span />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-bold leading-[1.35] tracking-[-0.02em]">
                    {scan.name}
                  </h2>
                  <span className="flex-none text-[0.63rem] text-outline">{scan.date}</span>
                </div>
                <p className="mt-0.5 text-[0.7rem] text-on-surface-variant">{scan.brand}</p>
                <div className="mt-[9px] grid grid-cols-[auto_minmax(42px,1fr)_auto] items-center gap-[7px]">
                  <strong className="text-[0.9rem]">{scan.score}</strong>
                  <div
                    className="h-[5px] overflow-hidden rounded-full bg-surface-highest"
                    role="progressbar"
                    aria-label={`Skor keamanan ${scan.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={scan.score}
                  >
                    <span
                      className={`block h-full rounded-[inherit] ${SCORE_FILL[scan.tone]}`}
                      style={{ width: `${scan.score}%` }}
                    />
                  </div>
                  <span
                    className={`inline-flex items-center gap-[3px] rounded-full px-[7px] py-1 text-[0.52rem] font-extrabold uppercase tracking-[0.03em] [&_svg]:size-[10px] max-[360px]:px-[5px] ${STATUS_PILL[scan.tone]}`}
                  >
                    <StatusIcon aria-hidden="true" /> {scan.status}
                  </span>
                </div>
              </div>
              <button
                className="inline-flex h-10 w-[34px] items-center justify-center rounded-full border-0 bg-transparent text-outline cursor-pointer hover:bg-surface-container hover:text-primary [&_svg]:size-[18px]"
                type="button"
                aria-label={`Buka hasil ${scan.name}`}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </section>

      <div
        className="mx-auto mt-[26px] flex flex-col items-center text-center text-outline [&>svg]:mb-2 [&>svg]:size-[22px]"
        id="saved"
      >
        <Search aria-hidden="true" />
        <p className="text-[0.78rem]">Tidak menemukan yang kamu cari?</p>
        <span className="mt-[3px] text-[0.75rem] font-[650] text-primary-strong">
          Coba kata kunci atau filter lain.
        </span>
      </div>
    </PageMain>
  );
}
