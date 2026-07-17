import "server-only";

import { getAiServerEnv } from "@/shared/lib/env";

// ---------------------------------------------------------------------------
// Types matching AI service /internal/v1/analyses contract
// ---------------------------------------------------------------------------

export type ScanAnalysisInput = {
  method: "manual" | "camera";
  imageUrls?: string[];
  bpomNumber?: string | null;
  claimsText?: string | null;
  ingredientsText?: string | null;
};

export type ScanProfile = {
  skinType: string;
  sensitivityLevel: string;
  conditions: string[];
  concerns: string[];
  pregnancyStatus: "none" | "pregnant" | "breastfeeding";
  currentRoutine: Array<{
    productName: string;
    activeIngredients: string[];
  }>;
};

export type ScanAnalysisRequest = {
  scanId: string;
  input: ScanAnalysisInput;
  profile: ScanProfile;
  options?: {
    locale?: string;
    includeDebug?: boolean;
  };
};

export type ProductSnapshot = {
  name?: string | null;
  brand?: string | null;
  bpomNumber?: string | null;
  claims: string[];
  ingredientsRaw: string;
  ingredients: string[];
};

export type ConfidenceInfo = {
  level: "high" | "medium" | "low";
  score: number;
  limitations: string[];
};

export type Finding = {
  code: string;
  severity: "critical" | "high" | "caution" | "info";
  message: string;
  evidence: string[];
};

export type IngredientDetail = {
  name: string;
  canonicalName?: string | null;
  matchConfidence?: number;
  matchType?: string;
  chemicalType?: string | null;
  riskLevel: string;
  benefitsSummary?: string | null;
  relevantSymptoms: string[];
  compatibilityNotes?: string | null;
  cautionNotes?: string | null;
  usageFrequency?: string | null;
  irritancy?: number | null;
  comedogenicity?: number | null;
  functions?: string[];
  rating?: string | null;
};

export type InteractionWarning = {
  code: string;
  severity: string;
  message: string;
  involvedIngredients: string[];
};

export type EducationItem = {
  code: string;
  title: string;
  message: string;
  evidence?: string[];
};

export type AnalysisReport = {
  overallScore: number;
  status: "recommended" | "generally_ok" | "use_with_caution" | "high_caution" | "avoid";
  confidence: ConfidenceInfo;
  subScores: Record<string, number>;
  findings: Finding[];
  appliedGates?: string[];
  recommendation: string;
  ingredientDetails?: IngredientDetail[];
  interactionWarnings?: InteractionWarning[];
  education?: EducationItem[];
};

export type AnalysisVersions = {
  engine: string;
  ruleset: string;
  ingredientDataset: string;
  bpomDataset: string;
  models: Record<string, string>;
};

export type CompletedAnalysis = {
  status: "completed";
  scanId: string;
  product: ProductSnapshot;
  report: AnalysisReport;
  versions: AnalysisVersions;
};

export type NeedsInputAnalysis = {
  status: "needs_input";
  scanId: string;
  missingFields: string[];
  extractedDraft?: {
    bpomNumber?: string | null;
    claimsText?: string | null;
    ingredientsText?: string | null;
  };
  instructions: string[];
  versions: AnalysisVersions;
};

export type AnalysisResponse = CompletedAnalysis | NeedsInputAnalysis;

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class ScanAIError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
  ) {
    super("SkinSafe AI analysis request failed");
  }
}

// ---------------------------------------------------------------------------
// AI service request helper
// ---------------------------------------------------------------------------

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
    signal: AbortSignal.timeout(30_000), // 30s for analysis (longer than profile)
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ScanAIError(response.status, body);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function analyzeProduct(payload: ScanAnalysisRequest): Promise<AnalysisResponse> {
  return requestAI("/internal/v1/analyses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
