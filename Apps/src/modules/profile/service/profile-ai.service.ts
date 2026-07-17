import "server-only";

import { getAiServerEnv } from "@/shared/lib/env";

import type {
  PersonalizationResponse,
  ProductFeedbackPayload,
  ProductFeedbackResponse,
  ProfileIntakePayload,
  ProfileQuestionnaire,
  ProfileRecommendationResult,
  QuestionChoice,
  RecommendRequestPayload,
  ResolvedSkinProfile,
} from "../profile.types";

export class ProfileAIError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
  ) {
    super("SkinSafe AI profile request failed");
  }
}

async function requestAI<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getAiServerEnv();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (env.AI_SERVICE_TOKEN) {
    headers.set("Authorization", `Bearer ${env.AI_SERVICE_TOKEN}`);
  }
  const response = await fetch(new URL(path, env.AI_SERVICE_URL), {
    ...init,
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ProfileAIError(response.status, body);
  }
  return body as T;
}

export function getProfileQuestionnaire(): Promise<ProfileQuestionnaire> {
  return requestAI("/internal/v1/profile-intake/questions");
}

export function getProfileRecommendations(
  payload: ProfileIntakePayload,
): Promise<ProfileRecommendationResult> {
  return requestAI("/internal/v1/profile-recommendations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPersonalizationQuestions(payload: {
  profile: ResolvedSkinProfile;
  answers: Record<string, QuestionChoice>;
}): Promise<PersonalizationResponse> {
  return requestAI("/internal/v1/profile-personalization/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitProductFeedback(
  payload: ProductFeedbackPayload,
): Promise<ProductFeedbackResponse> {
  return requestAI("/internal/v1/profile-feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRecommendations(
  payload: RecommendRequestPayload,
): Promise<NonNullable<ProfileRecommendationResult["recommendations"]>> {
  return requestAI("/internal/v1/recommendations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
