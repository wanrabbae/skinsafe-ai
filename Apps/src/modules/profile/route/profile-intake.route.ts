import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPersonalizationQuestions,
  getProfileQuestionnaire,
  getProfileRecommendations,
  getRecommendations,
  ProfileAIError,
  submitProductFeedback,
} from "../service/profile-ai.service";

const choice = z.enum(["A", "B", "C", "D"]);
const intakeSchema = z
  .object({
    narrative: z.string().trim().max(4000).optional(),
    answers: z.record(z.string(), choice).optional(),
    selectedConcerns: z.array(z.string().trim().min(1)).max(12).optional(),
    conditions: z.array(z.string().trim().min(1)).max(12).optional(),
    currentIngredients: z.array(z.string().trim().min(1)).max(30).optional(),
    pregnancyStatus: z.enum(["none", "pregnant", "breastfeeding"]).optional(),
    budgetMax: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.narrative || Object.keys(value.answers ?? {}).length), {
    message: "Isi cerita kulit atau questionnaire terlebih dahulu.",
  });

function upstreamError(error: unknown) {
  if (error instanceof ProfileAIError) {
    return NextResponse.json(error.detail, { status: error.status });
  }
  return NextResponse.json(
    { error: { code: "AI_PROFILE_UNAVAILABLE", message: "Layanan rekomendasi sedang tidak tersedia." } },
    { status: 503 },
  );
}

export async function getQuestions() {
  try {
    return NextResponse.json(await getProfileQuestionnaire());
  } catch (error) {
    return upstreamError(error);
  }
}

export async function postRecommendations(request: Request) {
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_PROFILE_INTAKE", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await getProfileRecommendations(parsed.data));
  } catch (error) {
    return upstreamError(error);
  }
}

const resolvedProfileSchema = z
  .object({
    skinType: z.string().nullable(),
    sensitivityLevel: z.enum(["low", "medium", "high"]),
    conditions: z.array(z.string()),
    concerns: z.array(z.string()),
    pregnancyStatus: z.string().nullable(),
    currentIngredients: z.array(z.string()),
    concernDuration: z.enum(["recent", "persistent", "long_term"]).nullable(),
    concernSeverity: z.enum(["mild", "moderate", "high"]).nullable(),
    routineComplexity: z.enum(["none", "basic", "active", "complex"]).nullable(),
    environmentalFactors: z.array(z.string()),
    productPreferences: z.array(z.string()),
    avoidIngredients: z.array(z.string()),
    excludedProducts: z.array(z.string()),
    successfulProducts: z.array(z.string()),
    contextSignals: z.record(z.string(), z.string()),
    feedbackCount: z.number().int().min(0),
  })
  .strict();

const personalizationSchema = z
  .object({
    profile: resolvedProfileSchema,
    answers: z.record(z.string(), choice).default({}),
  })
  .strict();

export async function postPersonalization(request: Request) {
  const parsed = personalizationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_PERSONALIZATION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await getPersonalizationQuestions(parsed.data));
  } catch (error) {
    return upstreamError(error);
  }
}

const feedbackSchema = z
  .object({
    profile: resolvedProfileSchema,
    product: z
      .object({
        name: z.string().trim().min(1).max(300),
        brand: z.string().trim().min(1).max(200),
        matchingChemicals: z.array(z.string()).max(30).default([]),
        modelVersion: z.string().nullable().default(null),
      })
      .strict(),
    outcome: z.enum(["improved", "no_change", "worsened", "reaction"]),
    usageDays: z.number().int().min(1).max(730),
    reactionSeverity: z.enum(["none", "mild", "moderate", "severe"]).default("none"),
    suspectedIngredients: z.array(z.string()).max(12).default([]),
    consentToLearning: z.boolean().default(false),
  })
  .strict()
  .refine(
    (value) =>
      value.reactionSeverity === "none" || ["worsened", "reaction"].includes(value.outcome),
    { message: "reactionSeverity hanya untuk outcome worsened atau reaction." },
  );

export async function postFeedback(request: Request) {
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_FEEDBACK", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await submitProductFeedback(parsed.data));
  } catch (error) {
    return upstreamError(error);
  }
}

const recommendSchema = z
  .object({
    concerns: z.array(z.string().trim().min(1)).min(1).max(12),
    skinType: z.enum(["normal", "dry", "oily", "combination", "sensitive"]),
    sensitivityLevel: z.enum(["low", "medium", "high"]).default("medium"),
    conditions: z.array(z.string()).default([]),
    pregnancyStatus: z.enum(["none", "pregnant", "breastfeeding"]).default("none"),
    currentIngredients: z.array(z.string()).default([]),
    avoidIngredients: z.array(z.string()).max(30).default([]),
    excludedProducts: z.array(z.string()).max(50).default([]),
    budgetMax: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export async function postRecommendationsFromProfile(request: Request) {
  const parsed = recommendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_RECOMMEND_REQUEST",
          message:
            parsed.error.issues[0]?.message ??
            "Profil belum lengkap untuk menghasilkan rekomendasi.",
        },
      },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(await getRecommendations(parsed.data));
  } catch (error) {
    return upstreamError(error);
  }
}
