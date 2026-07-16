"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";

import { Chip, MicroLabel } from "@/shared/components/primitives";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type {
  ProfileQuestionnaire,
  ProfileRecommendationResult,
  QuestionChoice,
} from "../profile.types";
import {
  currentProfileQueryKey,
  useCurrentProfileResult,
} from "../profile-cache";
import { formatProfileLabel } from "../profile-display";

type IntakeMode = "story" | "questions";

const fieldControl =
  "w-full rounded-[14px] border border-outline-variant bg-surface-low px-3 py-[11px] text-on-surface outline-0 focus:border-primary focus:shadow-[0_0_0_3px_rgb(115_49_223/12%)]";
const heading2 = "text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]";
const alertBase =
  "flex items-start gap-[9px] rounded-[18px] p-3 text-[0.7rem] leading-normal [&>svg]:size-[19px] [&>svg]:shrink-0";
const inlineError =
  "mt-2.5 flex items-center gap-[7px] rounded-[14px] bg-danger-soft px-3 py-2.5 text-[0.72rem] leading-[1.45] text-danger [&_svg]:size-[17px] [&_svg]:shrink-0";

export function SkinProfileIntake() {
  const queryClient = useQueryClient();
  const { data: result } = useCurrentProfileResult();
  const [mode, setMode] = useState<IntakeMode>("story");
  const [questions, setQuestions] = useState<ProfileQuestionnaire | null>(null);
  const [questionsError, setQuestionsError] = useState("");
  const [narrative, setNarrative] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState<"none" | "pregnant" | "breastfeeding">("none");
  const [activeText, setActiveText] = useState("");
  const [answers, setAnswers] = useState<Record<string, QuestionChoice>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    queryClient.setQueryData(currentProfileQueryKey, null);
    if (mode === "story" && narrative.trim().length < 15) {
      setError("Ceritakan kondisi kulitmu sedikit lebih lengkap (minimal 15 karakter). ");
      return;
    }
    if (mode === "questions" && (!questions || Object.keys(answers).length !== questions.questions.length)) {
      setError("Jawab semua empat pertanyaan sebelum melihat rekomendasi.");
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
      queryClient.setQueryData(currentProfileQueryKey, body);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profil belum dapat dianalisis.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-5" aria-labelledby="intake-title">
      <div>
        <MicroLabel>REKOMENDASI PERSONAL</MicroLabel>
        <h2 id="intake-title" className={heading2}>Kenali kebutuhan kulitmu</h2>
        <p className="mt-[5px] text-[0.78rem] leading-normal text-on-surface-variant">
          Ceritakan dengan bahasamu sendiri atau jawab empat pertanyaan singkat.
        </p>
      </div>

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
        ) : (
          <div
            className="grid gap-3.5 rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[15px] shadow-card"
            role="tabpanel"
          >
            {questionsError ? <p className={inlineError} role="alert">{questionsError}</p> : null}
            {!questions && !questionsError ? (
              <p className="flex items-center justify-center gap-[7px] p-5 text-[0.72rem] leading-[1.45] text-on-surface-variant [&_svg]:size-[17px] [&_svg]:shrink-0"><LoaderCircle aria-hidden="true" /> Memuat pertanyaan…</p>
            ) : null}
            {questions?.questions.map((question, questionIndex) => (
              <fieldset
                key={question.id}
                className="m-0 border-0 p-0 [&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-surface-highest [&:not(:first-of-type)]:pt-[15px]"
              >
                <legend className="flex items-start gap-2 text-[0.76rem] font-bold leading-[1.45]">
                  <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-primary-soft text-primary-strong">{questionIndex + 1}</span>
                  {question.prompt}
                </legend>
                <div className="mt-2.5 grid gap-[7px]">
                  {question.options.map((option) => (
                    <label
                      key={option.value}
                      data-selected={answers[question.id] === option.value}
                      className="group relative grid cursor-pointer gap-0.5 rounded-[14px] border border-outline-variant pt-2.5 pr-[11px] pb-2.5 pl-[42px] data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest"
                    >
                      <input
                        className="absolute h-px w-px opacity-0"
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={answers[question.id] === option.value}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                      />
                      <strong className="text-[0.72rem]">
                        <i className="absolute left-[9px] top-[11px] flex h-[25px] w-[25px] items-center justify-center rounded-[9px] bg-surface-high text-[0.68rem] not-italic group-data-[selected=true]:bg-primary group-data-[selected=true]:text-white">{option.value}</i>
                        {option.label}
                      </strong>
                      <small className="text-[0.62rem] leading-[1.4] text-on-surface-variant">{option.description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {error ? <p className={inlineError} role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
        <Button
          variant="primary"
          size="pill"
          className="mt-3 disabled:cursor-wait disabled:opacity-65"
          type="submit"
          disabled={pending || (mode === "questions" && !questions)}
        >
          {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {pending ? "Menganalisis profil…" : "Dapatkan rekomendasi"}
        </Button>
      </form>

      {result ? <ProfileResult result={result} /> : null}
    </section>
  );
}

function ProfileResult({ result }: { result: ProfileRecommendationResult }) {
  const { resolution, recommendations } = result;
  return (
    <div className="mt-[18px] grid gap-3" aria-live="polite">
      <section className="rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[15px] shadow-card">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[9px]">
          <CheckCircle2 aria-hidden="true" className="size-6 text-safe" />
          <div>
            <MicroLabel>HASIL PEMAHAMAN PROFIL</MicroLabel>
            <h2 className={heading2}>Profil yang terbaca</h2>
          </div>
          <span
            data-level={resolution.confidence.level}
            className="rounded-full bg-safe-soft px-2 py-1.5 text-[0.68rem] font-extrabold text-safe data-[level=low]:bg-caution-soft data-[level=low]:text-caution"
          >
            {resolution.confidence.score}%
          </span>
        </div>
        <dl className="my-3.5 grid grid-cols-3 gap-[7px]">
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Tipe kulit</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.skinType)}</dd></div>
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Sensitivitas</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.sensitivityLevel)}</dd></div>
          <div className="rounded-[12px] bg-surface-low p-2"><dt className="text-[0.56rem] text-outline">Safety status</dt><dd className="m-0 mt-[3px] text-[0.67rem] font-bold">{formatProfileLabel(resolution.profile.pregnancyStatus)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {resolution.profile.concerns.map((concern) => <Chip className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={concern}>{formatProfileLabel(concern)}</Chip>)}
          {resolution.profile.conditions.map((condition) => <Chip tone="caution" className="min-h-[31px] px-[11px] py-[7px] text-[0.75rem]" key={condition}>{formatProfileLabel(condition)}</Chip>)}
        </div>
      </section>

      {resolution.redFlags.map((flag) => (
        <section className={cn(alertBase, "bg-danger-soft text-danger")} role="alert" key={flag.code}>
          <ShieldAlert aria-hidden="true" /><div><strong>{flag.message}</strong><p className="mt-1">{flag.action}</p></div>
        </section>
      ))}
      {[...resolution.contradictions, ...resolution.clarificationQuestions].length ? (
        <section className={cn(alertBase, "bg-caution-soft text-caution")}>
          <AlertTriangle aria-hidden="true" />
          <div><strong>Perlu konfirmasi</strong><ul className="mt-1 mb-0 pl-[17px]">{[...resolution.contradictions, ...resolution.clarificationQuestions].map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
      ) : null}

      {recommendations ? (
        <section className="mt-2" aria-labelledby="recommendation-title">
          <div className="mb-3 flex items-end justify-between gap-4"><div><MicroLabel>MODEL LOKAL</MicroLabel><h2 id="recommendation-title" className={cn("mt-1", heading2)}>Produk yang paling relevan</h2></div></div>
          <div className="grid gap-[9px]">
            {recommendations.products.map((product) => (
              <article className="grid grid-cols-[1fr_auto] gap-2 rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[13px] shadow-card" key={`${product.brand}-${product.name}`}>
                <div><p className="text-[0.6rem] font-bold uppercase text-primary-strong">{product.brand}</p><h3 className="mt-0.5 text-[0.9rem] font-bold leading-[1.4]">{product.name}</h3></div>
                <span className="text-[0.68rem] font-extrabold text-safe">{Math.round(product.relevanceScore)}% cocok</span>
                <p className="col-span-2 text-[0.65rem] leading-normal text-on-surface-variant">{product.reasons[0]}</p>
                <div className="col-span-2 flex flex-wrap gap-1.5">{product.matchingChemicals.slice(0, 3).map((ingredient) => <Chip key={ingredient}>{ingredient}</Chip>)}</div>
                {product.cautions.length ? <small className="col-span-2 rounded-[10px] bg-caution-soft px-2 py-[7px] text-[0.65rem] leading-normal text-caution">{product.cautions[0]}</small> : null}
                {product.link ? <a className="col-span-2 flex items-center justify-self-end gap-1 text-[0.67rem] font-bold text-primary-strong [&_svg]:size-[13px]" href={product.link} target="_blank" rel="noreferrer">Lihat sumber <ExternalLink aria-hidden="true" /></a> : null}
              </article>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[0.65rem] leading-normal text-on-surface-variant">Relevansi bukan diagnosis atau jaminan bebas iritasi. Lakukan patch test dan hentikan pemakaian bila muncul reaksi.</p>
        </section>
      ) : null}
    </div>
  );
}
