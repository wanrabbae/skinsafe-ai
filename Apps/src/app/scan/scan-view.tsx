import {
  Camera,
  FileText,
  Image as ImageIcon,
  LockKeyhole,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export function ScanView() {
  return (
    <main className="mobile-page scan-page">
      <header className="page-header">
        <div className="brand-lockup">
          <span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>
          <span>SkinSafe AI</span>
        </div>
        <p className="micro-label">ANALISIS PRODUK</p>
        <h1>Scan produk</h1>
        <p>Arahkan kamera ke label komposisi agar semua bahan terbaca jelas.</p>
      </header>

      <section className="capture-card" aria-labelledby="capture-title">
        <div className="viewfinder" aria-hidden="true">
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />
          <span className="scan-beam" />
          <span className="viewfinder-icon"><ScanLine /></span>
        </div>
        <div className="capture-copy">
          <h2 id="capture-title">Pastikan komposisi terlihat</h2>
          <p>Gunakan pencahayaan terang dan hindari pantulan pada kemasan.</p>
        </div>
        <label className="primary-button" htmlFor="camera-upload">
          <Camera aria-hidden="true" />
          Ambil foto
        </label>
        <input
          className="sr-only"
          id="camera-upload"
          name="camera-upload"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <label className="secondary-button" htmlFor="gallery-upload">
          <ImageIcon aria-hidden="true" />
          Unggah dari galeri
        </label>
        <input
          className="sr-only"
          id="gallery-upload"
          name="gallery-upload"
          type="file"
          accept="image/*"
        />
      </section>

      <div className="divider"><span>ATAU</span></div>

      <section className="manual-section" aria-labelledby="manual-title">
        <div className="section-heading compact">
          <div>
            <p className="micro-label">INPUT MANUAL</p>
            <h2 id="manual-title">Tempel daftar bahan</h2>
          </div>
        </div>
        <label className="manual-input">
          <Search aria-hidden="true" />
          <textarea
            aria-label="Daftar bahan produk"
            name="ingredients"
            placeholder="Contoh: Aqua, Glycerin, Niacinamide..."
            rows={3}
          />
        </label>
      </section>

      <section className="supported-section" aria-labelledby="supported-title">
        <p className="micro-label" id="supported-title">FORMAT YANG DIDUKUNG</p>
        <div className="source-grid">
          <div><ShoppingBag aria-hidden="true" /><span>Kemasan</span></div>
          <div><ImageIcon aria-hidden="true" /><span>Screenshot</span></div>
          <div><FileText aria-hidden="true" /><span>Daftar bahan</span></div>
        </div>
      </section>

      <p className="privacy-note">
        <LockKeyhole aria-hidden="true" />
        Foto diproses secara privat dan tidak dipakai untuk melatih model.
      </p>
    </main>
  );
}
