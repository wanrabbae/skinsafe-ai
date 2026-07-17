"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Camera,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BpomSearchItem, BpomSearchResponse } from "@/modules/bpom";
import { saveScanResult } from "@/modules/scan";
import type { AnalysisResponse, ScanProfile } from "@/modules/scan";
import { useProfileResult } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

type ProfileShape = ReturnType<typeof useProfileResult>["result"];

function buildScanProfile(result: ProfileShape): ScanProfile {
  const profile = result?.resolution.profile;
  return {
    skinType: profile?.skinType ?? "normal",
    sensitivityLevel: profile?.sensitivityLevel ?? "medium",
    conditions: profile?.conditions ?? [],
    concerns: profile?.concerns ?? [],
    pregnancyStatus:
      (profile?.pregnancyStatus as ScanProfile["pregnancyStatus"]) ?? "none",
    currentRoutine: profile?.currentIngredients?.length
      ? [
          {
            productName: "Rutinitas saat ini",
            activeIngredients: profile.currentIngredients,
          },
        ]
      : [],
  };
}

export function ScanView() {
  const router = useRouter();
  const { result } = useProfileResult();
  const [ingredientsText, setIngredientsText] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selected, setSelected] = useState<BpomSearchItem | null>(null);

  const search = useQuery({
    queryKey: ["bpom-search", submittedQuery],
    enabled: submittedQuery.length >= 3,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BpomSearchResponse> => {
      const response = await fetch(
        `/api/v1/bpom/search?q=${encodeURIComponent(submittedQuery)}`,
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (body as { error?: { message?: string } } | null)?.error?.message ??
          "Pencarian BPOM sedang tidak tersedia.";
        throw new Error(message);
      }
      return body as BpomSearchResponse;
    },
  });

  const selectProduct = (item: BpomSearchItem) => {
    setSelected(item);
    if (item.composition) setIngredientsText(item.composition);
    setSubmittedQuery("");
    setSearchTerm("");
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<AnalysisResponse> => {
      const response = await fetch("/api/v1/scans/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId: crypto.randomUUID(),
          input: {
            method: "manual",
            ingredientsText: ingredientsText.trim(),
            bpomNumber: selected?.number ?? null,
          },
          profile: buildScanProfile(result),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (body as { error?: { message?: string } } | null)?.error?.message ??
          "Layanan analisis sedang tidak tersedia. Coba lagi nanti.";
        throw new Error(message);
      }
      return body as AnalysisResponse;
    },
    onSuccess: (data) => {
      if (data.status === "completed") {
        saveScanResult(data, {
          productName: selected?.productName,
          brand: selected?.registrant,
        });
        router.push("/scan/hasil");
      }
    },
  });

  const needsInput =
    mutation.data?.status === "needs_input" ? mutation.data : null;
  const canSubmit = ingredientsText.trim().length > 0 && !mutation.isPending;

  return (
    <PageMain>
      <AppHeader />

      <header className="mb-[18px]">
        <MicroLabel>ANALISIS PRODUK</MicroLabel>
        <h1 className="mt-1.5 text-[1.72rem] font-bold leading-[1.22] tracking-[-0.03em]">
          Scan produk
        </h1>
        <p className="mt-2 max-w-[22rem] text-[0.8rem] leading-normal text-on-surface-variant">
          Arahkan kamera ke label komposisi agar semua bahan terbaca jelas.
        </p>
      </header>

      <section
        className="rounded-3xl border border-[rgb(109_40_217/8%)] bg-surface-lowest p-2.5 shadow-card"
        aria-labelledby="capture-title"
      >
        <div className="viewfinder" aria-hidden="true">
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />
          <span className="scan-beam" />
          <span className="viewfinder-icon"><ScanLine /></span>
        </div>
        <div className="px-1 pt-2.5 pb-[9px] text-center">
          <h2 id="capture-title" className="text-[0.94rem] font-bold leading-[1.35] tracking-[-0.02em]">
            Pastikan komposisi terlihat
          </h2>
          <p className="mx-auto mt-[5px] max-w-[18rem] text-[0.7rem] leading-normal text-on-surface-variant">
            Gunakan pencahayaan terang dan hindari pantulan pada kemasan.
          </p>
        </div>
        <Button asChild variant="primary" size="pill" className="min-h-[46px]">
          <label htmlFor="camera-upload">
            <Camera aria-hidden="true" />
            Ambil foto
          </label>
        </Button>
        <input
          className="sr-only"
          id="camera-upload"
          name="camera-upload"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? null)}
        />
        <Button asChild variant="secondary" size="pill" className="mt-[6px] min-h-[46px]">
          <label htmlFor="gallery-upload">
            <ImageIcon aria-hidden="true" />
            Unggah dari galeri
          </label>
        </Button>
        <input
          className="sr-only"
          id="gallery-upload"
          name="gallery-upload"
          type="file"
          accept="image/*"
          onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? null)}
        />
        {photoName ? (
          <p className="mt-2.5 px-1 text-center text-[0.7rem] leading-normal text-on-surface-variant">
            <span className="font-semibold">{photoName}</span> dipilih. Pembacaan
            teks otomatis (OCR) belum tersedia — tempel daftar bahan di bawah agar
            bisa dianalisis.
          </p>
        ) : null}
      </section>

      <div className="divider"><span>ATAU</span></div>

      <section aria-labelledby="bpom-title" className="mb-5">
        <div className="mb-3">
          <MicroLabel>VERIFIKASI BPOM</MicroLabel>
          <h2 id="bpom-title" className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
            Cari produk di BPOM
          </h2>
          <p className="mt-1 text-[0.72rem] leading-normal text-on-surface-variant">
            Cari nama atau merek untuk mengambil nomor notifikasi resmi sekaligus memverifikasi status registrasinya.
          </p>
        </div>

        {selected ? (
          <div
            className={`flex items-start gap-3 rounded-[16px] border p-3.5 ${
              selected.active === false
                ? "border-danger/20 bg-danger-soft"
                : selected.active
                  ? "border-safe/20 bg-safe-soft"
                  : "border-caution/20 bg-caution-soft"
            }`}
          >
            {selected.active === false ? (
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-danger" />
            ) : (
              <ShieldCheck
                aria-hidden="true"
                className={`mt-0.5 size-[18px] shrink-0 ${selected.active ? "text-safe" : "text-caution"}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[0.9rem] font-bold">
                {selected.productName ?? "Produk BPOM terpilih"}
              </h3>
              {selected.registrant ? (
                <p className="truncate text-[0.75rem] text-on-surface-variant">{selected.registrant}</p>
              ) : null}
              {selected.number ? (
                <p className="mt-0.5 font-mono text-[0.75rem] text-on-surface">{selected.number}</p>
              ) : null}
              <p className="mt-1 text-[0.72rem] font-bold">
                {selected.active === false
                  ? "Status: tidak aktif"
                  : selected.active
                    ? "Terdaftar & aktif"
                    : `Status: ${selected.status ?? "tidak diketahui"}`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Hapus produk terpilih"
              className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-black/5 [&_svg]:size-[18px]"
              onClick={() => setSelected(null)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <form
              className="flex items-stretch gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedQuery(searchTerm.trim());
              }}
            >
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-outline-variant bg-white p-[13px] focus-within:border-2 focus-within:border-primary focus-within:p-[14px] [&>svg]:size-[19px] [&>svg]:shrink-0 [&>svg]:text-outline">
                <Search aria-hidden="true" />
                <input
                  className="w-full min-w-0 border-0 bg-transparent leading-[1.45] text-on-surface outline-0 placeholder:text-[#928a9e]"
                  aria-label="Cari produk di BPOM"
                  type="search"
                  placeholder="Nama atau merek produk"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <Button
                type="submit"
                variant="secondary"
                size="pill"
                className="min-h-[46px] w-auto shrink-0 px-6"
                disabled={searchTerm.trim().length < 3 || search.isFetching}
              >
                {search.isFetching ? <Loader2 aria-hidden="true" className="spin" /> : "Cari"}
              </Button>
            </form>

            {search.isError ? (
              <p className="mt-3 rounded-[16px] border border-danger/20 bg-danger-soft p-3.5 text-[0.78rem] leading-normal text-danger">
                {search.error.message}
              </p>
            ) : null}

            {search.data && search.data.results.length === 0 && !search.isFetching ? (
              <p className="mt-3 rounded-[16px] border border-outline-variant bg-surface-container p-3.5 text-[0.78rem] leading-normal text-on-surface-variant">
                {!search.data.configured
                  ? "Pencarian BPOM belum dikonfigurasi di server. Kamu tetap bisa menempel daftar bahan manual."
                  : !search.data.reachable
                    ? "Layanan verifikasi BPOM sedang tidak aktif, jadi produk belum bisa dicari otomatis. Tempel daftar bahan secara manual dulu."
                    : "Produk tidak ditemukan di registry BPOM. Periksa ejaan atau tempel daftar bahan secara manual."}
              </p>
            ) : null}

            {search.data && search.data.results.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {search.data.results.map((item, index) => (
                  <li key={`${item.number ?? item.productName ?? "item"}-${index}`}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[16px] border border-outline-variant bg-white p-3 text-left hover:border-primary"
                      onClick={() => selectProduct(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.85rem] font-bold">
                          {item.productName ?? "Produk BPOM"}
                        </p>
                        {item.registrant ? (
                          <p className="truncate text-[0.72rem] text-on-surface-variant">
                            {item.registrant}
                          </p>
                        ) : null}
                        {item.number ? (
                          <p className="mt-0.5 font-mono text-[0.72rem] text-on-surface-variant">
                            {item.number}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold ${
                          item.active === false
                            ? "bg-danger-soft text-danger"
                            : item.active
                              ? "bg-safe-soft text-safe"
                              : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {item.active === false
                          ? "Tidak aktif"
                          : item.active
                            ? "Aktif"
                            : item.status ?? "?"}
                      </span>
                      <Check aria-hidden="true" className="size-[18px] shrink-0 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>

      <section aria-labelledby="manual-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <MicroLabel>INPUT MANUAL</MicroLabel>
            <h2 id="manual-title" className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
              Tempel daftar bahan
            </h2>
          </div>
        </div>
        <label className="flex min-h-[86px] items-start gap-2.5 rounded-[16px] border border-outline-variant bg-white p-[13px] focus-within:border-2 focus-within:border-primary focus-within:p-[14px] [&>svg]:mt-0.5 [&>svg]:size-[19px] [&>svg]:shrink-0 [&>svg]:text-outline">
          <Search aria-hidden="true" />
          <textarea
            className="min-h-[58px] w-full resize-y border-0 bg-transparent leading-[1.45] text-on-surface outline-0 placeholder:text-[#928a9e]"
            aria-label="Daftar bahan produk"
            name="ingredients"
            placeholder="Contoh: Aqua, Glycerin, Niacinamide..."
            rows={3}
            value={ingredientsText}
            onChange={(event) => setIngredientsText(event.target.value)}
          />
        </label>

        <Button
          type="button"
          variant="primary"
          size="pill"
          className="mt-3 min-h-[46px] w-full"
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 aria-hidden="true" className="spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <ScanLine aria-hidden="true" />
              Analisis produk
            </>
          )}
        </Button>

        {needsInput ? (
          <div className="mt-3 rounded-[16px] border border-caution/20 bg-caution-soft p-3.5 text-[0.78rem] leading-normal text-on-surface-variant">
            {needsInput.instructions.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        {mutation.isError ? (
          <p className="mt-3 rounded-[16px] border border-danger/20 bg-danger-soft p-3.5 text-[0.78rem] leading-normal text-danger">
            {mutation.error.message}
          </p>
        ) : null}
      </section>

      <section className="mt-5" aria-labelledby="supported-title">
        <MicroLabel id="supported-title">FORMAT YANG DIDUKUNG</MicroLabel>
        <div className="mt-2.5 grid grid-cols-3 gap-2 [&>div]:flex [&>div]:min-h-[64px] [&>div]:flex-col [&>div]:items-center [&>div]:justify-center [&>div]:gap-[7px] [&>div]:rounded-[14px] [&>div]:bg-surface-container [&>div]:px-1.5 [&>div]:py-2.5 [&>div]:text-center [&>div]:text-[0.68rem] [&>div]:font-[650] [&>div]:text-on-surface-variant [&_svg]:size-5 [&_svg]:text-primary">
          <div><ShoppingBag aria-hidden="true" /><span>Kemasan</span></div>
          <div><ImageIcon aria-hidden="true" /><span>Screenshot</span></div>
          <div><FileText aria-hidden="true" /><span>Daftar bahan</span></div>
        </div>
      </section>

      <p className="mt-4 flex items-start gap-[7px] text-[0.7rem] leading-normal text-on-surface-variant [&>svg]:mt-px [&>svg]:size-[15px] [&>svg]:shrink-0">
        <LockKeyhole aria-hidden="true" />
        Foto diproses secara privat dan tidak dipakai untuk melatih model.
      </p>
    </PageMain>
  );
}
