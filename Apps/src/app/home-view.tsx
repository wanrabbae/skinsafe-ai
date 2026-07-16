import Link from "next/link";
import {
  Bell,
  CircleCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { CurrentProfileCard, CurrentProfileInsight } from "@/modules/profile";

export function HomeView() {
  return (
    <main className="mobile-page home-page">
      <header className="home-header">
        <div className="avatar" aria-hidden="true"><UserRound /></div>
        <div>
          <p className="micro-label">SELAMAT DATANG</p>
          <h1>Halo!</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Buka notifikasi">
          <Bell aria-hidden="true" />
          <span className="notification-dot" />
        </button>
      </header>

      <CurrentProfileCard />

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

      <CurrentProfileInsight />

      <p className="trust-note">
        <ShieldCheck aria-hidden="true" />
        Analisis berbasis bukti untuk edukasi, bukan pengganti diagnosis dokter.
      </p>
    </main>
  );
}
