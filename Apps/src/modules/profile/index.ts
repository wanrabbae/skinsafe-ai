export { CurrentProfileCard } from "./components/current-profile-card";
export { CurrentProfileInsight } from "./components/current-profile-insight";
export { ProfilePersonalization } from "./components/profile-personalization";
export { ProfileResult } from "./components/profile-result";
export { ProfileSummaryCard } from "./components/profile-summary-card";
export { SkinProfileIntake } from "./components/skin-profile-intake";
export { formatProfileLabel } from "./profile-display";
export { fetchRecommendations, mergeProductIntoProfile } from "./profile-flow";
export {
  clearProfileResult,
  getCurrentProfile,
  saveProfileResult,
  useProfileResult,
} from "./profile-storage";
export type {
  ProductFeedbackResponse,
  ProfileFlowState,
  ProfileIntakePayload,
  ProfileQuestionnaire,
  ProfileRecommendationResult,
  QuestionChoice,
  ResolvedSkinProfile,
} from "./profile.types";
