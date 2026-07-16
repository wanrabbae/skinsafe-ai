import Link from "next/link";

const steps = [
  ["1", "Unggah", "Foto kemasan, screenshot marketplace, atau isi data manual."],
  ["2", "Analisis", "Sistem memeriksa evidence, bahan, klaim, dan profil kulitmu."],
  ["3", "Pahami", "Lihat score, confidence, alasan, batasan, dan langkah berikutnya."],
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Navigasi utama">
          <Link className="brand" href="/">SkinSafe AI</Link>
          <div className="nav-links">
            <Link href="/profile">Profil</Link>
            <Link href="/scan">Scan</Link>
            <Link href="/history">Riwayat</Link>
          </div>
        </nav>
        <div className="hero-content">
          <p className="eyebrow">Skincare safety assistant</p>
          <h1>Cek aman dulu, baru pakai.</h1>
          <p className="lede">Pahami status BPOM, klaim berlebihan, risiko bahan, kecocokan kulit, dan konflik rutinitas dalam satu laporan yang mudah dibaca.</p>
          <div className="actions">
            <Link className="button primary" href="/profile">Mulai cek produk</Link>
            <Link className="button secondary" href="/scan">Saya sudah punya profil</Link>
          </div>
          <p className="disclaimer">Informasi edukatif, bukan diagnosis atau pengganti dokter.</p>
        </div>
      </section>
      <section className="feature-grid" aria-label="Cara kerja">
        {steps.map(([number, title, body]) => (
          <article className="card" key={number}>
            <span className="step">{number}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
