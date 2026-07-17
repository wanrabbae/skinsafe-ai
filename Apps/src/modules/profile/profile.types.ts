export type QuestionChoice = "A" | "B" | "C" | "D";

export type QuestionnaireQuestion = {
  id: string;
  prompt: string;
  options: Array<{ value: QuestionChoice; label: string; description: string }>;
  kind?: "generic" | "personalized";
  whyAsked?: string | null;
};

export type ProfileQuestionnaire = {
  version: string;
  questions: QuestionnaireQuestion[];
};

export type ResolvedSkinProfile = {
  skinType: string | null;
  sensitivityLevel: "low" | "medium" | "high";
  conditions: string[];
  concerns: string[];
  pregnancyStatus: string | null;
  currentIngredients: string[];
  concernDuration: "recent" | "persistent" | "long_term" | null;
  concernSeverity: "mild" | "moderate" | "high" | null;
  routineComplexity: "none" | "basic" | "active" | "complex" | null;
  environmentalFactors: string[];
  productPreferences: string[];
  avoidIngredients: string[];
  excludedProducts: string[];
  successfulProducts: string[];
  contextSignals: Record<string, string>;
  feedbackCount: number;
};

export type PersonalizationResponse = {
  version: string;
  profile: ResolvedSkinProfile;
  questions: QuestionnaireQuestion[];
  answeredCount: number;
  totalQuestions: number;
  completed: boolean;
  profileUpdates: string[];
};

export type ProductFeedbackPayload = {
  profile: ResolvedSkinProfile;
  product: {
    name: string;
    brand: string;
    matchingChemicals: string[];
    modelVersion: string | null;
  };
  outcome: "improved" | "no_change" | "worsened" | "reaction";
  usageDays: number;
  reactionSeverity: "none" | "mild" | "moderate" | "severe";
  suspectedIngredients: string[];
  consentToLearning: boolean;
};

export type ProductFeedbackResponse = {
  profile: ResolvedSkinProfile;
  action: "continue" | "monitor" | "stop" | "stop_and_seek_care";
  profileUpdates: string[];
  safetyMessage: string | null;
  disclaimer: string;
};

export type RecommendRequestPayload = {
  concerns: string[];
  skinType: string;
  sensitivityLevel: "low" | "medium" | "high";
  conditions: string[];
  pregnancyStatus: "none" | "pregnant" | "breastfeeding";
  currentIngredients: string[];
  avoidIngredients: string[];
  excludedProducts: string[];
  budgetMax?: number;
  limit?: number;
};

export type ProfileIntakePayload = {
  narrative?: string;
  answers?: Record<string, QuestionChoice>;
  selectedConcerns?: string[];
  conditions?: string[];
  currentIngredients?: string[];
  pregnancyStatus?: "none" | "pregnant" | "breastfeeding";
  budgetMax?: number;
  limit?: number;
};

export type ProfileFlowState = {
  /** `review` shows only the skin-context confirmation; `final` shows product recommendations. */
  stage: "review" | "final";
  /** Personalization answers accumulated across question batches. */
  personalizationAnswers: Record<string, QuestionChoice>;
  /** When true, `/test` renders the next personalization batch instead of intake. */
  pendingPersonalization: boolean;
};

export type ProfileRecommendationResult = {
  resolution: {
    profile: ResolvedSkinProfile;
    confidence: { level: "high" | "medium" | "low"; score: number; limitations: string[] };
    fieldEvidence: Record<string, string[]>;
    contradictions: string[];
    clarificationQuestions: string[];
    redFlags: Array<{ code: string; message: string; action: string }>;
    canRecommend: boolean;
  };
  /** Client-only flow bookkeeping; absent on raw AI responses (treated as a finished result). */
  flow?: ProfileFlowState;
  recommendations: null | {
    products: Array<{
      name: string;
      brand: string;
      link: string;
      matchingChemicals: string[];
      matchingSymptoms: string[];
      relevanceScore: number;
      confidence: "high" | "medium" | "low";
      reasons: string[];
      cautions: string[];
    }>;
    modelVersion: string | null;
    limitations: string[];
    education?: Array<{
      code: string;
      title: string;
      message: string;
      evidence?: string[];
    }>;
  };
};
