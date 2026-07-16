import Link from "next/link";
import {
  Bell,
  CircleCheck,
  Lightbulb,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="mobile-page home-page">
      <header className="home-header">
        <div className="avatar" aria-hidden="true">N</div>
        <div>
          <p className="micro-label">SELAMAT DATANG</p>
          <h1>Halo, Naya</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Buka notifikasi">
          <Bell aria-hidden="true" />
          <span className="notification-dot" />
        </button>
      </header>

      <section className="readiness-card" aria-labelledby="readiness-title">
        <div className="card-icon card-icon-primary">
          <Sparkles aria-hidden="true" />
        </div>
        <p className="micro-label">PROFIL SIAP</p>
        <h2 id="readiness-title">Kulitmu siap dianalisis</h2>
        <p className="supporting-text">
          Profil kulitmu sudah lengkap. Mulai scan produk untuk melihat
          kecocokannya.
        </p>
        <div className="progress-label">
          <span>Kelengkapan profil</span>
          <strong>100%</strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Kelengkapan profil"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
        >
          <span style={{ width: "100%" }} />
        </div>
        <Link className="primary-button" href="/scan">
          <ScanLine aria-hidden="true" />
          Scan produk
        </Link>
      </section>

      <section className="content-section" aria-labelledby="latest-result">
        <div className="section-heading">
          <div>
            <p className="micro-label">HASIL TERBARU</p>
            <h2 id="latest-result">Terakhir kamu cek</h2>
          </div>
          <Link href="/history">Lihat semua</Link>
        </div>

        <Link className="result-card" href="/history">
          <div className="product-mark" aria-hidden="true">
            <span />
            <ShieldCheck />
          </div>
          <div className="result-copy">
            <h3>Gentle Barrier Serum</h3>
            <p>Skinfiction · Hari ini</p>
            <div className="chip-row" aria-label="Bahan utama">
              <span className="chip chip-safe">Ceramide</span>
              <span className="chip chip-safe">Hyaluronic Acid</span>
              <span className="chip chip-safe">Centella</span>
            </div>
          </div>
          <div className="score-block score-safe">
            <strong>92</strong>
            <span><CircleCheck aria-hidden="true" /> Aman</span>
          </div>
        </Link>
      </section>

      <section className="insight-card" aria-labelledby="insight-title">
        <div className="card-icon">
          <Lightbulb aria-hidden="true" />
        </div>
        <div>
          <p className="micro-label">WAWASAN KULIT</p>
          <h2 id="insight-title">Wangi belum tentu ramah</h2>
          <p>
            Karena kulitmu sensitif, hindari produk dengan “Fragrance” atau
            parfum buatan pada lima komposisi teratas.
          </p>
        </div>
      </section>

      <p className="trust-note">
        <ShieldCheck aria-hidden="true" />
        Analisis berbasis bukti untuk edukasi, bukan pengganti diagnosis dokter.
      </p>
    </main>
  );
}
