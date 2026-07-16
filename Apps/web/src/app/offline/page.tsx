import Link from "next/link";

export default function OfflinePage() {
  return <main className="page-shell"><section className="page-card"><p className="eyebrow">Koneksi terputus</p><h1>Kamu sedang offline.</h1><p>Profil, upload, dan laporan membutuhkan koneksi. Coba lagi setelah internet tersedia.</p><Link className="button primary" href="/">Kembali ke beranda</Link></section></main>;
}
