import Link from "next/link";
import { CheckCircle2, Cloud, Home, RefreshCw, WifiOff } from "lucide-react";

export function OfflineView() {
  return (
    <main className="mobile-page offline-page">
      <div className="offline-visual" aria-hidden="true">
        <Cloud className="cloud cloud-one" />
        <Cloud className="cloud cloud-two" />
        <span><WifiOff /></span>
        <i className="connection-dot dot-one" />
        <i className="connection-dot dot-two" />
        <i className="connection-dot dot-three" />
      </div>

      <div className="offline-copy">
        <p className="micro-label">KONEKSI TERPUTUS</p>
        <h1>Kamu sedang offline</h1>
        <p>Sinkronisasi profil, unggahan, dan laporan memerlukan koneksi internet.</p>
      </div>

      <section className="offline-card" aria-labelledby="offline-available">
        <h2 id="offline-available">Yang tetap bisa diakses</h2>
        <ul>
          <li><CheckCircle2 aria-hidden="true" /> Riwayat scan lokal</li>
          <li><CheckCircle2 aria-hidden="true" /> Detail produk tersimpan</li>
          <li><CheckCircle2 aria-hidden="true" /> Panduan bahan dasar</li>
        </ul>
      </section>

      <a className="primary-button" href="/offline">
        <RefreshCw aria-hidden="true" /> Coba lagi
      </a>
      <Link className="text-button" href="/">
        <Home aria-hidden="true" /> Kembali ke beranda
      </Link>
    </main>
  );
}
