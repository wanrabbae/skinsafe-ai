"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type {
  ProfileQuestionnaire,
  ProfileRecommendationResult,
  QuestionChoice,
} from "../profile.types";
import {
  clearProfileDraft,
  loadProfileDraft,
  saveProfileDraft,
  saveProfileResult,
} from "../profile-storage";

type IntakeMode = "story" | "questions";

const fieldControl =
  "w-full rounded-[14px] border border-outline-variant bg-surface-low px-3 py-[11px] text-on-surface outline-0 focus:border-primary focus:shadow-[0_0_0_3px_rgb(115_49_223/12%)]";
const inlineError =
  "mt-2.5 flex items-center gap-[7px] rounded-[14px] bg-danger-soft px-3 py-2.5 text-[0.72rem] leading-[1.45] text-danger [&_svg]:size-[17px] [&_svg]:shrink-0";

export function SkinProfileIntake() {
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>("story");
  const [questions, setQuestions] = useState<ProfileQuestionnaire | null>(null);
  const [questionsError, setQuestionsError] = useState("");
  const [narrative, setNarrative] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState<"none" | "pregnant" | "breastfeeding">("none");
  const [activeText, setActiveText] = useState("");
  const [answers, setAnswers] = useState<Record<string, QuestionChoice>>({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore an in-progress draft after mount (reading localStorage during render
  // would diverge from SSR and trigger a hydration mismatch, so it must be an effect).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const draft = loadProfileDraft();
    if (draft) {
      setMode(draft.mode);
      setNarrative(draft.narrative);
      setPregnancyStatus(draft.pregnancyStatus);
      setActiveText(draft.activeText);
      setAnswers(draft.answers);
      setStep(draft.step);
    }
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist progress so it survives a browser close/refresh.
  useEffect(() => {
    if (!restored || pending) return;
    saveProfileDraft({ mode, narrative, pregnancyStatus, activeText, answers, step });
  }, [restored, pending, mode, narrative, pregnancyStatus, activeText, answers, step]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/profile-intake/questions", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Questionnaire belum dapat dimuat.");
        setQuestions((await response.json()) as ProfileQuestionnaire);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setQuestionsError(loadError instanceof Error ? loadError.message : "Questionnaire belum dapat dimuat.");
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "story" && narrative.trim().length < 15) {
      setError("Ceritakan kondisi kulitmu sedikit lebih lengkap (minimal 15 karakter). ");
      return;
    }
    if (mode === "questions" && (!questions || Object.keys(answers).length !== questions.questions.length)) {
      setError("Jawab semua pertanyaan sebelum melanjutkan.");
      return;
    }

    setPending(true);
    try {
      const payload =
        mode === "story"
          ? {
              narrative: narrative.trim(),
              pregnancyStatus,
              currentIngredients: activeText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              limit: 5,
            }
          : { answers, limit: 5 };
      const response = await fetch("/api/v1/profile-intake/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ProfileRecommendationResult & {
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || "Profil belum dapat dianalisis.");
      // First pass shows only the skin context; products come after "Apakah sudah sesuai?".
      saveProfileResult({
        resolution: body.resolution,
        flow: { stage: "review", personalizationAnswers: {}, pendingPersonalization: false },
        recommendations: null,
      });
      clearProfileDraft();
      router.push("/test/hasil");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profil belum dapat dianalisis.");
      setPending(false);
    }
  }

  return (
    <section className="mt-5" aria-labelledby="intake-title">
      <div
        className="mt-3.5 grid grid-cols-2 gap-1 rounded-[18px] bg-surface-high p-1"
        role="tablist"
        aria-label="Cara mengisi profil"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "story"}
          onClick={() => setMode("story")}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] border-0 bg-transparent text-[0.72rem] font-bold text-on-surface-variant cursor-pointer [&_svg]:size-[17px] aria-selected:bg-white aria-selected:text-primary-strong aria-selected:shadow-[0_3px_12px_rgb(50_24_88/8%)]"
        >
          <MessageSquareText aria-hidden="true" /> Cerita bebas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "questions"}
          onClick={() => setMode("questions")}
          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[14px] border-0 bg-transparent text-[0.72rem] font-bold text-on-surface-variant cursor-pointer [&_svg]:size-[17px] aria-selected:bg-white aria-selected:text-primary-strong aria-selected:shadow-[0_3px_12px_rgb(50_24_88/8%)]"
        >
          <ListChecks aria-hidden="true" /> Pertanyaan A–D
        </button>
      </div>

      <form className="mt-3" onSubmit={submit}>
        {mode === "story" ? (
          <>
            <div
              className="grid gap-3.5 rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[15px] shadow-card"
              role="tabpanel"
            >
              <label className="grid gap-1.5">
                <span className="text-[0.75rem] font-bold">Ceritakan kondisi kulit, keluhan, dan rutinitasmu</span>
                <textarea
                  className={cn(fieldControl, "min-h-[128px] resize-y leading-normal")}
                  value={narrative}
                  maxLength={4000}
                  rows={6}
                  onChange={(event) => setNarrative(event.target.value)}
                  placeholder="Contoh: Kulitku cepat berminyak dan sering jerawatan. Kadang merah setelah mencoba produk baru..."
                  required
                />
                <small className="text-right text-[0.64rem] leading-[1.4] text-outline">{narrative.length}/4000 karakter</small>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[0.75rem] font-bold">Status untuk filter keamanan bahan</span>
                <select
                  className={fieldControl}
                  value={pregnancyStatus}
                  onChange={(event) => setPregnancyStatus(event.target.value as typeof pregnancyStatus)}
                >
                  <option value="none">Tidak hamil atau menyusui</option>
                  <option value="pregnant">Sedang hamil</option>
                  <option value="breastfeeding">Sedang menyusui</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[0.75rem] font-bold">Active yang sedang dipakai (opsional)</span>
                <input
                  className={fieldControl}
                  value={activeText}
                  onChange={(event) => setActiveText(event.target.value)}
                  placeholder="Retinol, salicylic acid, vitamin C"
                />
                <small className="text-[0.64rem] leading-[1.4] text-outline">Pisahkan dengan koma agar konflik rutinitas dapat diperiksa.</small>
              </label>
            </div>

            {error ? <p className={inlineError} role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
            <Button
              variant="primary"
              size="pill"
              className="mt-3 disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={pending}
            >
              {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {pending ? "Menganalisis profil…" : "Lihat profil kulitku"}
            </Button>
          </>
        ) : (
          <div
            className="rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[18px] shadow-card"
            role="tabpanel"
          >
            {questionsError ? <p className={inlineError} role="alert">{questionsError}</p> : null}
            {!questions && !questionsError ? (
              <p className="flex items-center justify-center gap-[7px] p-5 text-[0.72rem] leading-[1.45] text-on-surface-variant [&_svg]:size-[17px] [&_svg]:shrink-0"><LoaderCircle aria-hidden="true" /> Memuat pertanyaan…</p>
            ) : null}
            {questions ? (() => {
              const total = questions.questions.length;
              const current = Math.min(step, total - 1);
              const question = questions.questions[current];
              const percent = Math.round(((current + 1) / total) * 100);
              const answered = Boolean(answers[question.id]);
              const isLast = current === total - 1;

              return (
                <>
                  <div className="flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.08em]">
                    <span className="text-on-surface-variant">Langkah {current + 1} dari {total}</span>
                    <span className="text-primary-strong">{percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-highest" role="presentation">
                    <span className="block h-full rounded-[inherit] bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
                  </div>

                  <h3 className="mt-4 text-[1.15rem] font-bold leading-[1.3] tracking-[-0.02em]">{question.prompt}</h3>

                  <div className="mt-4 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={question.prompt}>
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-selected={selected}
                          onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                          className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border border-outline-variant bg-surface-lowest p-3 text-center data-[selected=true]:border-2 data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest data-[selected=true]:p-[11px]"
                        >
                          <span className="absolute right-2 top-2 flex size-[18px] items-center justify-center rounded-full bg-primary text-white opacity-0 [&_svg]:size-3 group-data-[selected=true]:opacity-100">
                            <Check aria-hidden="true" strokeWidth={3} />
                          </span>
                          <span className="flex size-11 items-center justify-center rounded-full bg-surface-container text-[0.95rem] font-extrabold text-primary group-data-[selected=true]:bg-primary group-data-[selected=true]:text-white">
                            {option.value}
                          </span>
                          <span className="text-[0.85rem] font-bold leading-tight">{option.label}</span>
                          <span className="text-[0.68rem] leading-normal text-on-surface-variant">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>

                  {error ? <p className={inlineError} role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}

                  <div className="mt-4 flex flex-col justify-center items-center gap-2.5">
                    {current > 0 ? (
                      <button
                        type="button"
                        onClick={() => setStep((value) => Math.max(0, value - 1))}
                        className="inline-flex w-full min-h-[50px] items-center justify-center gap-1 rounded-[16px] border border-outline-variant bg-white px-[18px] text-[0.9rem] font-bold text-primary-strong active:scale-[0.98] [&_svg]:size-[18px]"
                      >
                        <ChevronLeft aria-hidden="true" />
                        Kembali
                      </button>
                    ) : null}
                    {isLast ? (
                      <Button
                        variant="primary"
                        size="pill"
                        className="flex-1 disabled:cursor-wait disabled:opacity-65"
                        type="submit"
                        disabled={pending || !answered}
                      >
                        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                        {pending ? "Menganalisis profil…" : "Lihat profil kulitku"}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="pill"
                        className="flex-1 disabled:opacity-65"
                        type="button"
                        disabled={!answered}
                        onClick={() => setStep((value) => Math.min(total - 1, value + 1))}
                      >
                        Lanjut
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </>
              );
            })() : null}
          </div>
        )}
      </form>
    </section>
  );
}
