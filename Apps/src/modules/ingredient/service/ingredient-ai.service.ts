import "server-only";

import { getAiServerEnv } from "@/shared/lib/env";

export type IngredientKnowledge = {
  query: string;
  canonicalName: string | null;
  matchType: string;
  matchConfidence: number;
  category: string | null;
  riskLevel: string;
  benefits: string | null;
  cautions: string | null;
  compatibleWith: string | null;
  usageFrequency: string | null;
  relevantConcerns: string[];
  datasetVersion: string;
  disclaimer: string;
};

export class IngredientAIError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
  ) {
    super("SkinSafe AI ingredient request failed");
  }
}

export async function getIngredientKnowledge(name: string): Promise<IngredientKnowledge> {
  const env = getAiServerEnv();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (env.AI_SERVICE_TOKEN) {
    headers.set("Authorization", `Bearer ${env.AI_SERVICE_TOKEN}`);
  }
  const response = await fetch(
    new URL(`/internal/v1/ingredients/${encodeURIComponent(name)}`, env.AI_SERVICE_URL),
    { cache: "no-store", headers, signal: AbortSignal.timeout(15_000) },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new IngredientAIError(response.status, body);
  }
  return body as IngredientKnowledge;
}
