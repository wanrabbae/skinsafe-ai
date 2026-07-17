export type QuestionChoice = "A" | "B" | "C" | "D";

export type ProfileQuestionnaire = {
  version: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ value: QuestionChoice; label: string; description: string }>;
  }>;
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

export type ProfileRecommendationResult = {
  resolution: {
    profile: {
      skinType: string | null;
      sensitivityLevel: "low" | "medium" | "high";
      conditions: string[];
      concerns: string[];
      pregnancyStatus: string | null;
      currentIngredients: string[];
    };
    confidence: { level: "high" | "medium" | "low"; score: number; limitations: string[] };
    fieldEvidence: Record<string, string[]>;
    contradictions: string[];
    clarificationQuestions: string[];
    redFlags: Array<{ code: string; message: string; action: string }>;
    canRecommend: boolean;
  };
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
