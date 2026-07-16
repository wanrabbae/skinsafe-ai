"use client";

import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ScanHistoryItem, ScanHistoryTone } from "@/modules/scan";

const TONE_ICON: Record<ScanHistoryTone, LucideIcon> = {
  safe: CircleCheck,
  caution: CircleAlert,
  danger: ShieldAlert,
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
    <main className="mobile-page history-page">
      <header className="page-header history-header">
        <div className="brand-lockup">
          <span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>
          <span>SkinSafe AI</span>
        </div>
        <p className="micro-label">ARSIP PRIBADI</p>
        <h1>Riwayat scan</h1>
        <p>Temukan kembali produk yang pernah kamu analisis.</p>
      </header>

      <label className="search-field">
        <Search aria-hidden="true" />
        <input type="search" name="search" placeholder="Cari produk atau merek" />
      </label>

      <div className="filter-row" aria-label="Filter status keamanan">
        <button className="filter-chip" data-active="true" type="button">Semua</button>
        <button className="filter-chip" type="button">Aman</button>
        <button className="filter-chip" type="button">Waspada</button>
        <button className="filter-chip" type="button">Hindari</button>
      </div>

      <section className="history-list" aria-label="Daftar riwayat scan">
        {scans.map((scan) => {
          const StatusIcon = TONE_ICON[scan.tone];
          return (
            <article className="history-card" key={scan.name}>
              <div className={`product-thumbnail product-thumbnail-${scan.tone}`} aria-hidden="true">
                <span />
              </div>
              <div className="history-copy">
                <div className="history-title-row">
                  <h2>{scan.name}</h2>
                  <span>{scan.date}</span>
                </div>
                <p>{scan.brand}</p>
                <div className="history-score-row">
                  <strong>{scan.score}</strong>
                  <div
                    className="score-track"
                    role="progressbar"
                    aria-label={`Skor keamanan ${scan.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={scan.score}
                  >
                    <span className={`score-fill score-fill-${scan.tone}`} style={{ width: `${scan.score}%` }} />
                  </div>
                  <span className={`status-pill status-${scan.tone}`}>
                    <StatusIcon aria-hidden="true" /> {scan.status}
                  </span>
                </div>
              </div>
              <button className="card-action" type="button" aria-label={`Buka hasil ${scan.name}`}>
                <ChevronRight aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </section>

      <div className="history-hint" id="saved">
        <Search aria-hidden="true" />
        <p>Tidak menemukan yang kamu cari?</p>
        <span>Coba kata kunci atau filter lain.</span>
      </div>
    </main>
  );
}
