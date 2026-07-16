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
    <section className="profile-intake" aria-labelledby="intake-title">
      <div className="intake-intro">
        <p className="micro-label">REKOMENDASI PERSONAL</p>
        <h2 id="intake-title">Kenali kebutuhan kulitmu</h2>
        <p>Ceritakan dengan bahasamu sendiri atau jawab empat pertanyaan singkat.</p>
      </div>

      <div className="intake-mode-tabs" role="tablist" aria-label="Cara mengisi profil">
        <button type="button" role="tab" aria-selected={mode === "story"} onClick={() => setMode("story")}>
          <MessageSquareText aria-hidden="true" /> Cerita bebas
        </button>
        <button type="button" role="tab" aria-selected={mode === "questions"} onClick={() => setMode("questions")}>
          <ListChecks aria-hidden="true" /> Pertanyaan A–D
        </button>
      </div>

      <form className="intake-form" onSubmit={submit}>
        {mode === "story" ? (
          <div className="intake-panel" role="tabpanel">
            <label className="intake-field">
              <span>Ceritakan kondisi kulit, keluhan, dan rutinitasmu</span>
              <textarea
                value={narrative}
                maxLength={4000}
                rows={6}
                onChange={(event) => setNarrative(event.target.value)}
                placeholder="Contoh: Kulitku cepat berminyak dan sering jerawatan. Kadang merah setelah mencoba produk baru..."
                required
              />
              <small>{narrative.length}/4000 karakter</small>
            </label>
            <label className="intake-field">
              <span>Status untuk filter keamanan bahan</span>
              <select
                value={pregnancyStatus}
                onChange={(event) => setPregnancyStatus(event.target.value as typeof pregnancyStatus)}
              >
                <option value="none">Tidak hamil atau menyusui</option>
                <option value="pregnant">Sedang hamil</option>
                <option value="breastfeeding">Sedang menyusui</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Active yang sedang dipakai (opsional)</span>
              <input
                value={activeText}
                onChange={(event) => setActiveText(event.target.value)}
                placeholder="Retinol, salicylic acid, vitamin C"
              />
              <small>Pisahkan dengan koma agar konflik rutinitas dapat diperiksa.</small>
            </label>
          </div>
        ) : (
          <div className="intake-panel questionnaire-panel" role="tabpanel">
            {questionsError ? <p className="inline-error" role="alert">{questionsError}</p> : null}
            {!questions && !questionsError ? (
              <p className="intake-loading"><LoaderCircle aria-hidden="true" /> Memuat pertanyaan…</p>
            ) : null}
            {questions?.questions.map((question, questionIndex) => (
              <fieldset key={question.id}>
                <legend><span>{questionIndex + 1}</span>{question.prompt}</legend>
                <div className="answer-grid">
                  {question.options.map((option) => (
                    <label key={option.value} data-selected={answers[question.id] === option.value}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={answers[question.id] === option.value}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                      />
                      <strong><i>{option.value}</i>{option.label}</strong>
                      <small>{option.description}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {error ? <p className="inline-error" role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}
        <button className="primary-button intake-submit" type="submit" disabled={pending || (mode === "questions" && !questions)}>
          {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {pending ? "Menganalisis profil…" : "Dapatkan rekomendasi"}
        </button>
      </form>

      {result ? <ProfileResult result={result} /> : null}
    </section>
  );
}

function ProfileResult({ result }: { result: ProfileRecommendationResult }) {
  const { resolution, recommendations } = result;
  return (
    <div className="profile-result" aria-live="polite">
      <section className="resolved-profile">
        <div className="result-heading">
          <CheckCircle2 aria-hidden="true" />
          <div><p className="micro-label">HASIL PEMAHAMAN PROFIL</p><h2>Profil yang terbaca</h2></div>
          <span data-level={resolution.confidence.level}>{resolution.confidence.score}%</span>
        </div>
        <dl>
          <div><dt>Tipe kulit</dt><dd>{formatProfileLabel(resolution.profile.skinType)}</dd></div>
          <div><dt>Sensitivitas</dt><dd>{formatProfileLabel(resolution.profile.sensitivityLevel)}</dd></div>
          <div><dt>Safety status</dt><dd>{formatProfileLabel(resolution.profile.pregnancyStatus)}</dd></div>
        </dl>
        <div className="chip-row large-gap">
          {resolution.profile.concerns.map((concern) => <span className="chip" key={concern}>{formatProfileLabel(concern)}</span>)}
          {resolution.profile.conditions.map((condition) => <span className="chip chip-caution" key={condition}>{formatProfileLabel(condition)}</span>)}
        </div>
      </section>

      {resolution.redFlags.map((flag) => (
        <section className="profile-alert danger" role="alert" key={flag.code}>
          <ShieldAlert aria-hidden="true" /><div><strong>{flag.message}</strong><p>{flag.action}</p></div>
        </section>
      ))}
      {[...resolution.contradictions, ...resolution.clarificationQuestions].length ? (
        <section className="profile-alert caution">
          <AlertTriangle aria-hidden="true" />
          <div><strong>Perlu konfirmasi</strong><ul>{[...resolution.contradictions, ...resolution.clarificationQuestions].map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
      ) : null}

      {recommendations ? (
        <section className="recommendation-results" aria-labelledby="recommendation-title">
          <div className="section-heading compact"><div><p className="micro-label">MODEL LOKAL</p><h2 id="recommendation-title">Produk yang paling relevan</h2></div></div>
          <div className="recommendation-list">
            {recommendations.products.map((product) => (
              <article className="recommendation-card" key={`${product.brand}-${product.name}`}>
                <div><p>{product.brand}</p><h3>{product.name}</h3></div>
                <span>{Math.round(product.relevanceScore)}% cocok</span>
                <p>{product.reasons[0]}</p>
                <div className="chip-row">{product.matchingChemicals.slice(0, 3).map((ingredient) => <span className="chip" key={ingredient}>{ingredient}</span>)}</div>
                {product.cautions.length ? <small className="product-caution">{product.cautions[0]}</small> : null}
                {product.link ? <a href={product.link} target="_blank" rel="noreferrer">Lihat sumber <ExternalLink aria-hidden="true" /></a> : null}
              </article>
            ))}
          </div>
          <p className="model-disclaimer">Relevansi bukan diagnosis atau jaminan bebas iritasi. Lakukan patch test dan hentikan pemakaian bila muncul reaksi.</p>
        </section>
      ) : null}
    </div>
  );
}
