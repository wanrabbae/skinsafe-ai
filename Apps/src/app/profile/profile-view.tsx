import { Bell, ShieldCheck, UserRound } from "lucide-react";

import { SkinProfileIntake } from "@/modules/profile";

export function ProfileView() {
  return (
    <main className="mobile-page profile-page">
      <header className="profile-topbar">
        <div className="avatar" aria-hidden="true">
          <UserRound />
        </div>
        <div className="brand-lockup">
          <span className="brand-mark">
            <ShieldCheck aria-hidden="true" />
          </span>
          <span>SkinSafe AI</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Buka notifikasi"
        >
          <Bell aria-hidden="true" />
        </button>
      </header>

      <header className="profile-heading">
        <div>
          <p className="micro-label">PROFIL PRIBADI</p>
          <h1>Ceritakan kulitmu</h1>
          <p>Jawabanmu diproses lokal oleh service SkinSafe AI.</p>
        </div>
      </header>

      <SkinProfileIntake />
    </main>
  );
}
