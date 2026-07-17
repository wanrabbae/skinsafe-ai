export {
  loadScanResult,
  saveScanResult,
  useScanHistory,
  useScanResult,
} from "./scan-storage";
export type { ScanHistoryEntry } from "./scan-storage";
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
