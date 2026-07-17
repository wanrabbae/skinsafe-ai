"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, ScanLine, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";

export type ProductSearchResult = {
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  ingredients: string[];
  sourceUrl: string;
};

export function ProductSearchModal({
  open,
  onOpenChange,
  onSelect,
  title = "Cari produk",
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: ProductSearchResult) => void;
  title?: string;
  description?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const search = useQuery({
    queryKey: ["product-search", submittedQuery],
    enabled: submittedQuery.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ results: ProductSearchResult[] }> => {
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
      return body as { results: ProductSearchResult[] };
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      className="m-auto w-full max-w-[min(24rem,calc(100vw-2rem))] rounded-[20px] border border-outline-variant bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">{title}</h3>
            {description ? (
              <p className="mt-1 text-[0.75rem] leading-normal text-on-surface-variant">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-black/5 [&_svg]:size-5"
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>

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

        {search.isError ? (
          <p className="mt-3 rounded-[16px] border border-danger/20 bg-danger-soft p-3.5 text-[0.78rem] leading-normal text-danger">
            {search.error.message}
          </p>
        ) : null}

        {search.data && search.data.results.length === 0 && !search.isFetching ? (
          <p className="mt-3 rounded-[16px] border border-outline-variant bg-surface-container p-3.5 text-[0.78rem] leading-normal text-on-surface-variant">
            Produk tidak ditemukan. Periksa ejaan atau coba kata kunci lain.
          </p>
        ) : null}

        {search.data && search.data.results.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {search.data.results.map((product) => (
              <li key={product.slug}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[14px] border border-outline-variant bg-white p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  onClick={() => {
                    onSelect(product);
                    onOpenChange(false);
                  }}
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
        ) : null}
      </div>
    </dialog>
  );
}
