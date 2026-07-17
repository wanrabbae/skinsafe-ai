"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";

import type {
  PersonalizationResponse,
  QuestionChoice,
  QuestionnaireQuestion,
  ResolvedSkinProfile,
} from "../profile.types";

const inlineError =
  "mt-2.5 flex items-center gap-[7px] rounded-[14px] bg-danger-soft px-3 py-2.5 text-[0.72rem] leading-[1.45] text-danger [&_svg]:size-[17px] [&_svg]:shrink-0";

async function fetchPersonalization(
  profile: ResolvedSkinProfile,
  answers: Record<string, QuestionChoice>,
): Promise<PersonalizationResponse> {
  const response = await fetch("/api/v1/profile-intake/personalization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, answers }),
  });
  const body = (await response.json().catch(() => null)) as
    | (PersonalizationResponse & { error?: { message?: string } })
    | null;
  if (!response.ok || !body) {
    throw new Error(body?.error?.message ?? "Personalisasi sedang tidak tersedia.");
  }
  return body;
}

export function ProfilePersonalization({
  initialProfile,
  initialAnswers,
  batchSize = 10,
  finalizing = false,
  onAnswersChange,
  onFinish,
}: {
  initialProfile: ResolvedSkinProfile;
  initialAnswers: Record<string, QuestionChoice>;
  batchSize?: number;
  finalizing?: boolean;
  onAnswersChange?: (answers: Record<string, QuestionChoice>) => void;
  /** Called when the batch fills up (`completed=false`) or all questions are answered (`completed=true`). */
  onFinish: (
    profile: ResolvedSkinProfile,
    answers: Record<string, QuestionChoice>,
    completed: boolean,
  ) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, QuestionChoice>>(initialAnswers);
  const [historyQuestions, setHistoryQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const refinedProfile = useRef<ResolvedSkinProfile>(initialProfile);
  const baselineCount = useRef(Object.keys(initialAnswers).length);

  useEffect(() => {
    let active = true;
    fetchPersonalization(initialProfile, initialAnswers)
      .then((data) => {
        if (!active) return;
        refinedProfile.current = data.profile;
        setTotalQuestions(data.totalQuestions);
        if (data.completed || !data.questions.length) {
          onFinish(data.profile, initialAnswers, true);
          return;
        }
        setHistoryQuestions([data.questions[0]]);
        setIndex(0);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Personalisasi gagal dimuat.");
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = historyQuestions[index] ?? null;
  const answeredCount = Object.keys(answers).length;
  // Progress is shown relative to the current batch, not the full personalization pool.
  const batchAnsweredCount = answeredCount - baselineCount.current;
  const batchTotal = Math.max(1, Math.min(batchSize, totalQuestions - baselineCount.current));
  const percent = Math.min(100, Math.round((batchAnsweredCount / batchTotal) * 100));
  const currentAnswered = question ? Boolean(answers[question.id]) : false;
  const atNewest = index === historyQuestions.length - 1;

  function select(value: QuestionChoice) {
    if (!question || pending) return;
    const previous = answers[question.id];
    const nextAnswers = { ...answers, [question.id]: value };
    // Changing an earlier answer invalidates the adaptive questions that followed it.
    if (previous !== value && !atNewest) {
      for (const dropped of historyQuestions.slice(index + 1)) {
        delete nextAnswers[dropped.id];
      }
      setHistoryQuestions((prev) => prev.slice(0, index + 1));
    }
    setAnswers(nextAnswers);
    onAnswersChange?.(nextAnswers);
  }

  async function goNext() {
    if (!question || !currentAnswered || pending) return;
    // Moving forward through already-visited questions needs no re-fetch.
    if (!atNewest) {
      setIndex((value) => value + 1);
      return;
    }
    setPending(true);
    setError("");
    try {
      const data = await fetchPersonalization(initialProfile, answers);
      refinedProfile.current = data.profile;
      setTotalQuestions(data.totalQuestions);
      if (data.completed || !data.questions.length) {
        onFinish(data.profile, answers, true);
        return;
      }
      if (Object.keys(answers).length - baselineCount.current >= batchSize) {
        onFinish(data.profile, answers, false);
        return;
      }
      setHistoryQuestions((prev) => [...prev, data.questions[0]]);
      setIndex((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menyimpan jawaban.");
    } finally {
      setPending(false);
    }
  }

  function goBack() {
    if (index > 0) setIndex((value) => value - 1);
  }

  return (
    <section className="mt-5" aria-labelledby="personalization-title">
      <div>
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-strong">
          Perdalam profil
        </span>
        <h2 id="personalization-title" className="mt-1 text-[1.08rem] font-bold leading-[1.35] tracking-[-0.02em]">
          Beberapa pertanyaan lagi biar rekomendasimu makin pas
        </h2>
        <p className="mt-1 text-[0.75rem] leading-normal text-on-surface-variant">
          Pertanyaan menyesuaikan jawabanmu. Setiap {batchSize} jawaban kami cek ulang profilnya.
        </p>
      </div>

      <div className="mt-3 rounded-[22px] border border-[rgb(109_40_217/9%)] bg-white p-[18px] shadow-card">
        <div className="flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.08em]">
          <span className="text-on-surface-variant">{batchAnsweredCount} dari {batchTotal} terjawab</span>
          <span className="text-primary-strong">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-highest" role="presentation">
          <span className="block h-full rounded-[inherit] bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>

        {finalizing ? (
          <p className="flex items-center justify-center gap-[7px] p-6 text-[0.75rem] text-on-surface-variant [&_svg]:size-[18px]">
            <LoaderCircle className="spin" aria-hidden="true" /> Menyusun ulang profilmu…
          </p>
        ) : question ? (
          <>
            <h3 className="mt-4 text-[1.12rem] font-bold leading-[1.3] tracking-[-0.02em]">{question.prompt}</h3>
            {question.whyAsked ? (
              <p className="mt-1 text-[0.7rem] leading-normal text-on-surface-variant">{question.whyAsked}</p>
            ) : null}

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
                    disabled={pending}
                    onClick={() => select(option.value)}
                    className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border border-outline-variant bg-surface-lowest p-3 text-center disabled:opacity-60 data-[selected=true]:border-2 data-[selected=true]:border-primary data-[selected=true]:bg-primary-softest data-[selected=true]:p-[11px]"
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

            <div className="mt-4 flex flex-col items-center gap-2.5">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={pending}
                  className="inline-flex w-full min-h-[50px] items-center justify-center gap-1 rounded-[16px] border border-outline-variant bg-white px-[18px] text-[0.9rem] font-bold text-primary-strong active:scale-[0.98] disabled:opacity-60 [&_svg]:size-[18px]"
                >
                  <ChevronLeft aria-hidden="true" />
                  Kembali
                </button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="pill"
                className="w-full disabled:opacity-65"
                disabled={!currentAnswered || pending}
                onClick={goNext}
              >
                {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
                Lanjut
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : (
          <p className="flex items-center justify-center gap-[7px] p-6 text-[0.75rem] text-on-surface-variant [&_svg]:size-[18px]">
            <LoaderCircle className="spin" aria-hidden="true" /> Memuat pertanyaan…
          </p>
        )}

        {error ? (
          <p className={inlineError} role="alert">
            <AlertTriangle aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="text-[0.72rem] font-bold text-outline underline-offset-2 hover:underline disabled:opacity-60"
          disabled={pending || finalizing}
          onClick={() => onFinish(refinedProfile.current, answers, false)}
        >
          Cukup dulu, kembali ke hasil
        </button>
      </div>
    </section>
  );
}
