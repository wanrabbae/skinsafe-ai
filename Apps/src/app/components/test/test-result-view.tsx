"use client";

import { CheckCircle2, ClipboardList, HelpCircle, LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  fetchRecommendations,
  mergeProductIntoProfile,
  ProfileResult,
  useProfileResult,
} from "@/modules/profile";
import { clearProfileResult, saveProfileResult } from "@/modules/profile/profile-storage";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import {
  ProductSearchModal,
  type ProductSearchResult,
} from "@/shared/components/product-search-modal";
import { Button } from "@/shared/components/ui/button";

export function TestResultView() {
  const { result, loaded } = useProfileResult();
  const router = useRouter();
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const stage = result?.flow?.stage ?? "final";

  async function confirmSuitable() {
    if (!result) return;
    setFinalizing(true);
    const recommendations = await fetchRecommendations(result.resolution.profile);
    saveProfileResult({
      resolution: result.resolution,
      flow: {
        stage: "final",
        personalizationAnswers: result.flow?.personalizationAnswers ?? {},
        pendingPersonalization: false,
      },
      recommendations,
    });
    setFinalizing(false);
  }

  function refineMore() {
    if (!result) return;
    saveProfileResult({
      resolution: result.resolution,
      flow: {
        stage: "review",
        personalizationAnswers: result.flow?.personalizationAnswers ?? {},
        pendingPersonalization: true,
      },
      recommendations: null,
    });
    router.push("/test");
  }

  function updateContext(found: ProductSearchResult) {
    if (!result) return;
    setSearchOpen(false);
    const profile = mergeProductIntoProfile(result.resolution.profile, found.ingredients);
    saveProfileResult({
      resolution: { ...result.resolution, profile },
      flow: { stage: "review", personalizationAnswers: {}, pendingPersonalization: true },
      recommendations: null,
    });
    router.push("/test");
  }

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

          {stage === "review" ? (
            <section className="mt-5 rounded-[22px] border border-primary/20 bg-primary-softest/50 p-[18px] shadow-card">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-[18px]">
                  <HelpCircle aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[1.02rem] font-bold leading-snug tracking-[-0.02em]">
                    Apakah profil ini sudah sesuai?
                  </h2>
                  <p className="mt-1 text-[0.76rem] leading-normal text-on-surface-variant">
                    Kalau sudah pas, kami tampilkan rekomendasi produknya. Kalau belum, kami perdalam
                    dengan beberapa pertanyaan lagi.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="pill"
                  className="disabled:cursor-wait disabled:opacity-65"
                  disabled={finalizing}
                  onClick={confirmSuitable}
                >
                  {finalizing ? <LoaderCircle className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {finalizing ? "Menyiapkan rekomendasi…" : "Ya, tampilkan rekomendasi"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="pill"
                  disabled={finalizing}
                  onClick={refineMore}
                >
                  Belum, perdalam dulu
                </Button>
              </div>
            </section>
          ) : (
            <div className="mt-5 grid gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="pill"
                className="h-auto flex-col items-start gap-1 whitespace-normal py-3.5 text-left"
                onClick={() => setSearchOpen(true)}
              >
                <span className="flex items-start gap-2 text-[0.92rem] font-bold leading-snug">
                  <RefreshCcw aria-hidden="true" className="mt-0.5 shrink-0" />
                  Perbarui skin konteks
                </span>
                <span className="pl-7 text-[0.72rem] font-normal leading-normal text-on-surface-variant">
                  Sudah coba produk baru? Pilih produknya, lalu jawab pertanyaan lagi untuk memperbarui profil.
                </span>
              </Button>
            </div>
          )}

          <div className="mt-2.5">
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
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={updateContext}
        title="Pilih produk baru"
        description="Produk yang dipilih dipakai untuk memperbarui konteks kulitmu."
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
