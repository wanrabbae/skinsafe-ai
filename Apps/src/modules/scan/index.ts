export { getScanHistory } from "./service/scan.service";
export type { ScanHistoryItem, ScanHistoryTone } from "./service/scan.service";

export { analyzeProduct } from "./service/scan-ai.service";
export type {
  AnalysisReport,
  AnalysisResponse,
  AnalysisVersions,
  CompletedAnalysis,
  ConfidenceInfo,
  EducationItem,
  Finding,
  IngredientDetail,
  InteractionWarning,
  NeedsInputAnalysis,
  ProductSnapshot,
  ScanAIError,
  ScanAnalysisInput,
  ScanAnalysisRequest,
  ScanProfile,
} from "./service/scan-ai.service";
