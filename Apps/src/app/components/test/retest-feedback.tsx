"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ScanLine, Search } from "lucide-react";
import { useRef, useState } from "react";

import { saveProfileResult } from "@/modules/profile";
import type {
  ProductFeedbackResponse,
  ProfileRecommendationResult,
} from "@/modules/profile";
import {
  ProductSearchModal,
  type ProductSearchResult,
} from "@/shared/components/product-search-modal";
import { Button } from "@/shared/components/ui/button";

type Outcome = "improved" | "no_change" | "worsened" | "reaction";
type ReactionSeverity = "none" | "mild" | "moderate" | "severe";

type SelectedProduct = {
  name: string;
  brand: string;
  matchingChemicals: string[];
  modelVersion: string | null;
  ingredients: string[];
};

const OUTCOME_OPTIONS: Array<{ value: Outcome; label: string; desc: string }> = [
  { value: "improved", label: "Membaik", desc: "Kulit terasa lebih baik." },
  { value: "no_change", label: "Tidak berubah", desc: "Belum ada perubahan berarti." },
  { value: "worsened", label: "Memburuk", desc: "Kulit jadi kurang nyaman." },
  { value: "reaction", label: "Bereaksi", desc: "Muncul reaksi/iritasi." },
];

const SEVERITY_OPTIONS: Array<{ value: ReactionSeverity; label: string }> = [
  { value: "mild", label: "Ringan" },
  { value: "moderate", label: "Sedang" },
  { value: "severe", label: "Berat" },
];

export function RetestFeedback({ result }: { result: ProfileRecommendationResult }) {
  const pickerRef = useRef<HTMLDialogElement>(null);
  const outcomeRef = useRef<HTMLDialogElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("improved");
  const [usageDays, setUsageDays] = useState("14");
  const [severity, setSeverity] = useState<ReactionSeverity>("mild");
  const [suspected, setSuspected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Pick<ProductFeedbackResponse, "action" | "safetyMessage"> | null>(null);

  const recommendations = result.recommendations;
  const isReaction = outcome === "worsened" || outcome === "reaction";
  const suspectCandidates = product ? (product.ingredients.length ? product.ingredients : product.matchingChemicals) : [];

  function beginOutcome(next: SelectedProduct) {
    setProduct(next);
    setOutcome("improved");
    setUsageDays("14");
    setSeverity("mild");
    setSuspected(new Set());
    setError("");
    setFeedback(null);
    pickerRef.current?.close();
    setSearchOpen(false);
    outcomeRef.current?.showModal();
  }

  function pickFromSearch(found: ProductSearchResult) {
    beginOutcome({
      name: found.name,
      brand: found.brand ?? found.name,
      matchingChemicals: [],
      modelVersion: null,
      ingredients: found.ingredients,
    });
  }

  function toggleSuspected(name: string) {
    setSuspected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < 12) next.add(name);
      return next;
    });
  }

  async function submit() {
    if (!product) return;
    const days = Number.parseInt(usageDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 730) {
      setError("Masukkan lama pemakaian antara 1 sampai 730 hari.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/v1/profile-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: result.resolution.profile,
          product: {
            name: product.name,
            brand: product.brand,
            matchingChemicals: product.matchingChemicals,
            modelVersion: product.modelVersion,
          },
          outcome,
          usageDays: days,
          reactionSeverity: isReaction ? severity : "none",
          suspectedIngredients: isReaction ? [...suspected] : [],
          consentToLearning: true,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (ProductFeedbackResponse & { error?: { message?: string } })
        | null;
      if (!response.ok || !body) {
        throw new Error(body?.error?.message ?? "Feedback belum dapat diproses.");
      }

      let refreshed = result.recommendations;
      if (body.profile.skinType && body.profile.concerns.length > 0) {
        try {
          const recResponse = await fetch("/api/v1/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concerns: body.profile.concerns,
              skinType: body.profile.skinType,
              sensitivityLevel: body.profile.sensitivityLevel,
              conditions: body.profile.conditions,
              pregnancyStatus: body.profile.pregnancyStatus ?? "none",
              currentIngredients: body.profile.currentIngredients,
              avoidIngredients: body.profile.avoidIngredients,
              excludedProducts: body.profile.excludedProducts,
              limit: 5,
            }),
          });
          if (recResponse.ok) {
            refreshed = (await recResponse.json()) as typeof refreshed;
          }
        } catch {
          // Keep existing recommendations if refresh fails.
        }
      }

      saveProfileResult({
        resolution: { ...result.resolution, profile: body.profile },
        recommendations: refreshed,
      });
      setFeedback({ action: body.action, safetyMessage: body.safetyMessage });
      outcomeRef.current?.close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Feedback belum dapat diproses.");
    } finally {
      setSubmitting(false);
    }
  }

  const danger = feedback?.action === "stop_and_seek_care" || feedback?.action === "stop" || Boolean(feedback?.safetyMessage);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="pill"
        className="h-auto flex-col items-start gap-1 whitespace-normal py-3.5 text-left"
        onClick={() => pickerRef.current?.showModal()}
      >
        <span className="flex items-start gap-2 text-[0.92rem] font-bold leading-snug">
          <RotateCcw aria-hidden="true" className="mt-0.5 shrink-0" />
          Tes ulang setelah coba rekomendasi
        </span>
        <span className="pl-7 text-[0.72rem] font-normal leading-normal text-on-surface-variant">
          Sudah coba produknya? Cari produk itu untuk bikin profil baru.
        </span>
      </Button>

      {feedback ? (
        <div
          className={
            danger
              ? "flex items-start gap-2 rounded-[16px] border border-danger/20 bg-danger-soft p-3.5 text-[0.76rem] leading-normal text-danger [&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:shrink-0"
              : "flex items-start gap-2 rounded-[16px] bg-safe-soft p-3.5 text-[0.76rem] leading-normal text-safe [&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:shrink-0"
          }
          aria-live="polite"
        >
          {danger ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <div>
            <strong>Profil kulitmu diperbarui.</strong>
            <p className="mt-1">
              {feedback.safetyMessage ??
                (danger
                  ? "Produk ini dikeluarkan dari rekomendasi berikutnya."
                  : "Rekomendasi di bawah sudah disesuaikan dengan hasil terbarumu.")}
            </p>
          </div>
        </div>
      ) : null}

      {/* Product picker */}
      <dialog
        ref={pickerRef}
        onClose={() => undefined}
        className="m-auto w-full max-w-[min(24rem,calc(100vw-2rem))] rounded-[20px] border border-outline-variant bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">Produk mana yang sudah dicoba?</h3>
          <p className="mt-1 text-[0.75rem] leading-normal text-on-surface-variant">
            Pilih dari rekomendasi sebelumnya, atau cari produk lain.
          </p>

          {recommendations && recommendations.products.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recommendations.products.map((rec) => (
                <li key={`${rec.brand}::${rec.name}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[14px] border border-outline-variant bg-white p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    onClick={() =>
                      beginOutcome({
                        name: rec.name,
                        brand: rec.brand,
                        matchingChemicals: rec.matchingChemicals,
                        modelVersion: recommendations.modelVersion,
                        ingredients: [],
                      })
                    }
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">
                      <ScanLine className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.85rem] font-bold">{rec.name}</p>
                      <p className="truncate text-[0.72rem] text-on-surface-variant">{rec.brand}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="pill"
            className="mt-4 min-h-[46px] w-full"
            onClick={() => {
              pickerRef.current?.close();
              setSearchOpen(true);
            }}
          >
            <Search aria-hidden="true" />
            Cari produk lain
          </Button>
          <Button
            type="button"
            variant="text"
            size="pill"
            className="mt-1 min-h-[42px] w-full text-on-surface-variant"
            onClick={() => pickerRef.current?.close()}
          >
            Batal
          </Button>
        </div>
      </dialog>

      <ProductSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={pickFromSearch}
        title="Cari produk yang sudah dicoba"
        description="Pilih produk yang sudah kamu coba dari rekomendasi sebelumnya."
      />

      {/* Outcome capture */}
      <dialog
        ref={outcomeRef}
        onClose={() => undefined}
        className="m-auto w-full max-w-[min(26rem,calc(100vw-2rem))] rounded-[20px] border border-outline-variant bg-surface-lowest p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <h3 className="text-[1.05rem] font-bold tracking-[-0.02em]">Bagaimana hasilnya?</h3>
          {product ? (
            <p className="mt-1 truncate text-[0.75rem] text-on-surface-variant">
              {product.name}
              {product.brand ? ` · ${product.brand}` : ""}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Hasil pemakaian">
            {OUTCOME_OPTIONS.map((option) => {
              const selected = outcome === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-selected={selected}
                  onClick={() => setOutcome(option.value)}
                  className="flex flex-col gap-0.5 rounded-[14px] border border-outline-variant bg-surface-lowest p-3 text-left data-[selected=true]:border-2 data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest data-[selected=true]:p-[11px]"
                >
                  <span className="text-[0.85rem] font-bold">{option.label}</span>
                  <span className="text-[0.68rem] leading-normal text-on-surface-variant">{option.desc}</span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 grid gap-1.5">
            <span className="text-[0.75rem] font-bold">Sudah dipakai berapa hari?</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={730}
              value={usageDays}
              onChange={(event) => setUsageDays(event.target.value)}
              className="w-full rounded-[14px] border border-outline-variant bg-surface-low px-3 py-[11px] text-on-surface outline-0 focus:border-primary focus:shadow-[0_0_0_3px_rgb(115_49_223/12%)]"
            />
          </label>

          {isReaction ? (
            <div className="mt-4 grid gap-2.5">
              <div className="grid gap-1.5">
                <span className="text-[0.75rem] font-bold">Seberapa berat reaksinya?</span>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map((option) => {
                    const selected = severity === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        data-selected={selected}
                        onClick={() => setSeverity(option.value)}
                        className="flex-1 rounded-[12px] border border-outline-variant bg-surface-lowest px-3 py-2 text-[0.78rem] font-bold data-[selected=true]:border-2 data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {suspectCandidates.length > 0 ? (
                <div className="grid gap-1.5">
                  <span className="text-[0.75rem] font-bold">Bahan yang dicurigai (opsional)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {suspectCandidates.slice(0, 20).map((name) => {
                      const selected = suspected.has(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={selected}
                          data-selected={selected}
                          onClick={() => toggleSuspected(name)}
                          className="rounded-full border border-outline-variant bg-surface-lowest px-3 py-1.5 text-[0.72rem] data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest data-[selected=true]:font-bold data-[selected=true]:text-primary-strong"
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 flex items-center gap-[7px] rounded-[14px] bg-danger-soft px-3 py-2.5 text-[0.72rem] leading-[1.45] text-danger [&_svg]:size-[17px] [&_svg]:shrink-0" role="alert">
              <AlertTriangle aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <p className="mt-3 text-[0.66rem] leading-normal text-outline">
            Feedback memperbarui konteks personalmu dan dipakai untuk menyesuaikan rekomendasi. Bukan diagnosis medis.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="pill"
              className="min-h-[42px] w-auto px-5"
              disabled={submitting}
              onClick={() => outcomeRef.current?.close()}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="pill"
              className="min-h-[42px] w-auto px-5"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? <Loader2 aria-hidden="true" className="spin" /> : null}
              Simpan &amp; perbarui
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
