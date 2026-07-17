"use client";

import { ClipboardList, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ProfileResult, useProfileResult } from "@/modules/profile";
import { clearProfileResult, saveRetestContext } from "@/modules/profile/profile-storage";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { ProductSearchModal } from "@/shared/components/product-search-modal";
import { Button } from "@/shared/components/ui/button";

export function TestResultView() {
  const { result, loaded } = useProfileResult();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  return (
    <PageMain>
      <AppHeader backHref="/test" />

      <div>
        <MicroLabel>HASIL KAMU</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Profil &amp; rekomendasi
        </h1>
      </div>

      {loaded && !result ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-6 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
            <ClipboardList aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[1rem] font-bold">Belum ada hasil</h2>
            <p className="mt-1 text-[0.8rem] leading-normal text-on-surface-variant">
              Lakukan tes profil kulit dulu untuk melihat rekomendasi.
            </p>
          </div>
          <Button asChild variant="primary" size="pill" className="mt-1">
            <Link href="/test">Mulai tes profil kulit</Link>
          </Button>
        </div>
      ) : null}

      {result ? (
        <>
          <ProfileResult result={result} />
          <div className="mt-5 grid gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="pill"
              className="h-auto flex-col items-start gap-1 whitespace-normal py-3.5 text-left"
              onClick={() => setPickerOpen(true)}
            >
              <span className="flex items-start gap-2 text-[0.92rem] font-bold leading-snug">
                <RotateCcw aria-hidden="true" className="mt-0.5 shrink-0" />
                Tes ulang setelah coba rekomendasi
              </span>
              <span className="pl-7 text-[0.72rem] font-normal leading-normal text-on-surface-variant">
                Sudah coba produknya? Cari produk itu untuk bikin profil baru.
              </span>
            </Button>
            <Button
              type="button"
              variant="text"
              size="pill"
              className="text-danger"
              onClick={() => resetDialogRef.current?.showModal()}
            >
              <Trash2 aria-hidden="true" />
              Reset Profil Kulit
            </Button>
          </div>
        </>
      ) : null}

      <ProductSearchModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(product) => {
          saveRetestContext({
            productName: product.name,
            brand: product.brand,
            slug: product.slug,
          });
          router.push("/test");
        }}
        title="Produk yang sudah dicoba"
        description="Pilih produk yang sudah kamu coba dari rekomendasi sebelumnya."
      />

      <dialog
        ref={resetDialogRef}
        className="m-auto w-full max-w-[min(22rem,calc(100vw-2rem))] rounded-[20px] border border-danger/20 bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">Hapus profil kulit?</h3>
          <p className="mt-2 text-[0.8rem] leading-normal text-on-surface-variant">
            Seluruh konteks profil kulitmu akan dihapus dan tidak bisa dikembalikan.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="pill"
              onClick={() => resetDialogRef.current?.close()}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="pill"
              className="bg-danger hover:bg-danger"
              onClick={() => {
                clearProfileResult();
                resetDialogRef.current?.close();
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </dialog>
    </PageMain>
  );
}
