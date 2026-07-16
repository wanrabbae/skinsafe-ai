import {
  Bell,
  ChevronRight,
  Droplets,
  HeartPulse,
  LockKeyhole,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "Profil kulit" };

export default function ProfilePage() {
  return (
    <main className="mobile-page profile-page">
      <header className="profile-topbar">
        <div className="avatar" aria-hidden="true">N</div>
        <div className="brand-lockup">
          <span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>
          <span>SkinSafe AI</span>
        </div>
        <button className="icon-button" type="button" aria-label="Buka notifikasi">
          <Bell aria-hidden="true" />
        </button>
      </header>

      <header className="profile-heading">
        <div>
          <p className="micro-label">PROFIL PRIBADI</p>
          <h1>Profil kulit</h1>
          <p>Naya</p>
        </div>
        <button className="edit-button" type="button">
          <Pencil aria-hidden="true" /> Edit
        </button>
      </header>

      <section className="skin-summary" aria-labelledby="skin-type-title">
        <div className="card-icon card-icon-primary"><Droplets aria-hidden="true" /></div>
        <div>
          <p className="micro-label">TIPE KULIT</p>
          <h2 id="skin-type-title">Kombinasi dan sensitif</h2>
        </div>
        <div className="progress-label full-width">
          <span>Kelengkapan profil</span>
          <strong>85%</strong>
        </div>
        <div
          className="progress-track full-width"
          role="progressbar"
          aria-label="Kelengkapan profil"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={85}
        >
          <span style={{ width: "85%" }} />
        </div>
      </section>

      <section className="profile-section" aria-labelledby="concern-title">
        <div className="profile-section-title">
          <HeartPulse aria-hidden="true" />
          <div><p className="micro-label">KONDISI</p><h2 id="concern-title">Masalah kulit</h2></div>
        </div>
        <div className="chip-row large-gap">
          <span className="chip chip-danger">Jerawat</span>
          <span className="chip chip-caution">Kemerahan</span>
          <span className="chip">Barrier lemah</span>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="sensitivity-title">
        <div className="profile-section-title">
          <Sparkles aria-hidden="true" />
          <div><p className="micro-label">PEMICU</p><h2 id="sensitivity-title">Sensitivitas bahan</h2></div>
        </div>
        <div className="chip-row large-gap">
          <span className="chip chip-danger">Fragrance</span>
          <span className="chip chip-danger">Alcohol denat.</span>
        </div>
      </section>

      <section className="preference-card" aria-labelledby="preference-title">
        <div>
          <p className="micro-label">FILTER KEAMANAN</p>
          <h2 id="preference-title">Kehamilan atau menyusui</h2>
          <p>Sesuaikan rekomendasi bahan dengan kondisimu.</p>
        </div>
        <label className="switch-control">
          <span>Tidak</span>
          <input type="checkbox" aria-label="Sedang hamil atau menyusui" />
          <i aria-hidden="true" />
        </label>
      </section>

      <section className="settings-list" id="settings" aria-label="Pengaturan profil">
        <button type="button">
          <span className="settings-icon"><LockKeyhole aria-hidden="true" /></span>
          <span><strong>Privasi & penyimpanan</strong><small>Kelola data dan izin foto</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button type="button">
          <span className="settings-icon"><Settings aria-hidden="true" /></span>
          <span><strong>Preferensi aplikasi</strong><small>Bahasa, notifikasi, dan aksesibilitas</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
