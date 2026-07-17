"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Loader2,
  LockKeyhole,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BpomSearchResponse } from "@/modules/bpom";
import { saveScanResult } from "@/modules/scan";
import type { AnalysisResponse, ScanProfile } from "@/modules/scan";
import { useProfileResult } from "@/modules/profile";
import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";
import { MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";

type ProfileShape = ReturnType<typeof useProfileResult>["result"];

type InciProduct = {
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  ingredients: string[];
  sourceUrl: string;
};

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bpomDialogRef = useRef<HTMLDialogElement>(null);

  const [ingredientsText, setIngredientsText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<InciProduct | null>(null);
  const [bpomResult, setBpomResult] = useState<BpomSearchResponse | null>(null);
  const [bpomLoading, setBpomLoading] = useState(false);

  // --- Product search (INCIDecoder) ---
  const search = useQuery({
    queryKey: ["product-search", submittedQuery],
    enabled: submittedQuery.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ results: InciProduct[] }> => {
      const response = await fetch(
        `/api/v1/products/search?q=${encodeURIComponent(submittedQuery)}`,
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (body as { error?: { message?: string } } | null)?.error?.message ??
          "Pencarian produk sedang tidak tersedia.";
        throw new Error(message);
      }
      return body as { results: InciProduct[] };
    },
  });

  // Show modal when search results arrive
  useEffect(() => {
    if (search.data && search.data.results.length > 0 && !selectedProduct) {
      dialogRef.current?.showModal();
    }
  }, [search.data, selectedProduct]);

  // --- Select product → save to DB → verify BPOM ---
  const selectProduct = useCallback(
    async (product: InciProduct) => {
      setSelectedProduct(product);
      dialogRef.current?.close();
      setBpomLoading(true);
      setBpomResult(null);

      // Auto-fill ingredients
      if (product.ingredients.length > 0) {
        setIngredientsText(product.ingredients.join(", "));
      }

      // Save to DB
      try {
        await fetch("/api/v1/products/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            imageUrl: product.imageUrl,
            ingredients: product.ingredients.join(", "),
            sourceUrl: product.sourceUrl,
          }),
        });
      } catch {
        // non-blocking — DB save failure shouldn't block the user
      }

      // Verify BPOM
      try {
        const bpomResponse = await fetch(
          `/api/v1/bpom/verify?q=${encodeURIComponent(product.name)}`,
        );
        const bpomData = (await bpomResponse.json()) as BpomSearchResponse;
        setBpomResult(bpomData);

        if (!bpomData.results || bpomData.results.length === 0) {
          bpomDialogRef.current?.showModal();
        }
      } catch {
        setBpomResult(null);
        bpomDialogRef.current?.showModal();
      } finally {
        setBpomLoading(false);
      }
    },
    [],
  );

  // --- Analyze mutation (existing logic) ---
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
            bpomNumber: bpomResult?.results?.[0]?.number ?? null,
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
          productName: selectedProduct?.name,
          brand: selectedProduct?.brand,
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
          Cari nama atau merek produk untuk mengambil daftar bahan secara otomatis.
        </p>
      </header>

      {/* --- Search Product --- */}
      <section aria-labelledby="search-title" className="mb-5">
        <div className="mb-3">
          <MicroLabel>CARI PRODUK</MicroLabel>
          <h2 id="search-title" className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
            Nama produk atau Merk
          </h2>
          <p className="mt-1 text-[0.72rem] leading-normal text-on-surface-variant">
            Cari nama produk skincare untuk mendapatkan daftar komposisi dan verifikasi BPOM.
          </p>
        </div>

        {selectedProduct ? (
          <div className="flex items-start gap-3 rounded-[16px] border border-primary/20 bg-primary/5 p-3.5">
            {selectedProduct.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="size-12 shrink-0 rounded-[10px] border border-outline-variant object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[0.9rem] font-bold">{selectedProduct.name}</h3>
              {selectedProduct.brand ? (
                <p className="truncate text-[0.75rem] text-on-surface-variant">{selectedProduct.brand}</p>
              ) : null}
              {bpomLoading ? (
                <p className="mt-1 flex items-center gap-1 text-[0.72rem] font-bold text-on-surface-variant">
                  <Loader2 className="size-3.5 spin" aria-hidden="true" />
                  Memverifikasi BPOM...
                </p>
              ) : bpomResult && bpomResult.results.length > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-[0.72rem] font-bold text-safe">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Terdaftar BPOM
                </p>
              ) : bpomResult ? (
                <p className="mt-1 flex items-center gap-1 text-[0.72rem] font-bold text-danger">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  Tidak ditemukan di BPOM
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Hapus produk terpilih"
              className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-black/5 [&_svg]:size-[18px]"
              onClick={() => {
                setSelectedProduct(null);
                setBpomResult(null);
                setIngredientsText("");
                setSubmittedQuery("");
              }}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : (
          <form
            className="flex items-stretch gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (searchTerm.trim().length >= 2) {
                setSubmittedQuery(searchTerm.trim());
              }
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-outline-variant bg-white p-[13px] focus-within:border-2 focus-within:border-primary focus-within:p-[14px] [&>svg]:size-[19px] [&>svg]:shrink-0 [&>svg]:text-outline">
              <Search aria-hidden="true" />
              <input
                className="w-full min-w-0 border-0 bg-transparent leading-[1.45] text-on-surface outline-0 placeholder:text-[#928a9e]"
                aria-label="Cari produk"
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
              disabled={searchTerm.trim().length < 2 || search.isFetching}
            >
              {search.isFetching ? <Loader2 aria-hidden="true" className="spin" /> : "Cari"}
            </Button>
          </form>
        )}

        {search.isError && !selectedProduct ? (
          <p className="mt-3 rounded-[16px] border border-danger/20 bg-danger-soft p-3.5 text-[0.78rem] leading-normal text-danger">
            {search.error.message}
          </p>
        ) : null}

        {search.data && search.data.results.length === 0 && !search.isFetching && !selectedProduct ? (
          <p className="mt-3 rounded-[16px] border border-outline-variant bg-surface-container p-3.5 text-[0.78rem] leading-normal text-on-surface-variant">
            Produk tidak ditemukan. Periksa ejaan atau tempel daftar bahan secara manual di bawah.
          </p>
        ) : null}
      </section>

      {/* --- Product Selection Modal --- */}
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-[min(24rem,calc(100vw-2rem))] rounded-[20px] border border-outline-variant bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">Pilih produk</h3>
            <button
              type="button"
              aria-label="Tutup"
              className="rounded-full p-1 text-on-surface-variant hover:bg-black/5 [&_svg]:size-5"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <ul className="space-y-2">
            {search.data?.results.map((product) => (
              <li key={product.slug}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[14px] border border-outline-variant bg-white p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  onClick={() => selectProduct(product)}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-[8px] border border-outline-variant object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">
                      <ScanLine className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.85rem] font-bold">{product.name}</p>
                    {product.brand ? (
                      <p className="truncate text-[0.72rem] text-on-surface-variant">{product.brand}</p>
                    ) : null}
                    <p className="mt-0.5 text-[0.68rem] text-on-surface-variant">
                      {product.ingredients.length} bahan
                    </p>
                  </div>
                  <Check aria-hidden="true" className="size-[18px] shrink-0 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>

      {/* --- BPOM Warning Modal --- */}
      <dialog
        ref={bpomDialogRef}
        className="m-auto w-full max-w-[min(22rem,calc(100vw-2rem))] rounded-[20px] border border-danger/20 bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-danger-soft">
            <AlertTriangle className="size-6 text-danger" aria-hidden="true" />
          </div>
          <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">Produk Tidak Terdaftar</h3>
          <p className="mt-2 text-[0.78rem] leading-normal text-on-surface-variant">
            Produk ini tidak ditemukan di registry BPOM. Produk tanpa registrasi BPOM berpotensi berbahaya.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="pill"
            className="mt-4 min-h-[42px] w-full"
            onClick={() => bpomDialogRef.current?.close()}
          >
            Mengerti, lanjutkan
          </Button>
        </div>
      </dialog>

      {/* --- Manual Ingredients Input --- */}
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

      <p className="mt-4 flex items-start gap-[7px] text-[0.7rem] leading-normal text-on-surface-variant [&>svg]:mt-px [&>svg]:size-[15px] [&>svg]:shrink-0">
        <LockKeyhole aria-hidden="true" />
        Data diproses secara privat dan tidak dipakai untuk melatih model.
      </p>
    </PageMain>
  );
}
