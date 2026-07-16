import { House } from "lucide-react";
import Link from "next/link";

import { PageMain } from "@/shared/components/page-main";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <PageMain className="flex flex-col items-center justify-center text-center">
      <p className="bg-[linear-gradient(150deg,var(--primary)_0%,var(--primary-strong)_100%)] bg-clip-text text-[6rem] font-extrabold leading-none tracking-[-0.04em] text-transparent">
        404
      </p>
      <h1 className="mt-4 text-[1.4rem] font-bold tracking-[-0.02em]">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-[20rem] text-[0.85rem] leading-normal text-on-surface-variant">
        Maaf, halaman yang kamu cari tidak ada atau sudah dipindahkan. Yuk kembali
        ke beranda.
      </p>
      <Button asChild variant="primary" size="pill" className="mt-6 max-w-[16rem]">
        <Link href="/">
          <House aria-hidden="true" />
          Kembali ke beranda
        </Link>
      </Button>
    </PageMain>
  );
}
