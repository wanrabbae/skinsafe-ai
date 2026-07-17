import "server-only";

import { getAiServerEnv } from "@/shared/lib/env";

export type BpomSearchItem = {
  number: string | null;
  productName: string | null;
  registrant: string | null;
  status: string | null;
  active: boolean | null;
  composition: string | null;
};

export type BpomSearchResponse = {
  query: string;
  results: BpomSearchItem[];
  configured: boolean;
  reachable: boolean;
  disclaimer: string;
};

export class BpomAIError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
  ) {
    super("SkinSafe AI BPOM request failed");
  }
}

async function requestAI<T>(path: string): Promise<T> {
  const env = getAiServerEnv();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (env.AI_SERVICE_TOKEN) {
    headers.set("Authorization", `Bearer ${env.AI_SERVICE_TOKEN}`);
  }
  const response = await fetch(new URL(path, env.AI_SERVICE_URL), {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BpomAIError(response.status, body);
  }
  return body as T;
}

export function searchBpom(query: string, limit = 10): Promise<BpomSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return requestAI(`/internal/v1/bpom/search?${params.toString()}`);
}
