import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getProfileQuestionnaire,
  getProfileRecommendations,
  ProfileAIError,
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
