import type { ProfileRecommendationResult, ResolvedSkinProfile } from "./profile.types";

type Recommendations = ProfileRecommendationResult["recommendations"];

const RECOMMENDABLE_SKIN_TYPES = new Set([
  "normal",
  "dry",
  "oily",
  "combination",
  "sensitive",
]);

const PREGNANCY_STATUSES = new Set(["none", "pregnant", "breastfeeding"]);

/** Fetch fresh product recommendations for a resolved profile, or null when it is not recommendable. */
export async function fetchRecommendations(profile: ResolvedSkinProfile): Promise<Recommendations> {
  if (!profile.skinType || !RECOMMENDABLE_SKIN_TYPES.has(profile.skinType) || profile.concerns.length === 0) {
    return null;
  }
  const pregnancyStatus = PREGNANCY_STATUSES.has(profile.pregnancyStatus ?? "")
    ? profile.pregnancyStatus
    : "none";
  try {
    const response = await fetch("/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concerns: profile.concerns,
        skinType: profile.skinType,
        sensitivityLevel: profile.sensitivityLevel,
        conditions: profile.conditions,
        pregnancyStatus,
        currentIngredients: profile.currentIngredients,
        avoidIngredients: profile.avoidIngredients,
        excludedProducts: profile.excludedProducts,
        limit: 5,
      }),
    });
    if (!response.ok) return null;
    return (await response.json()) as Recommendations;
  } catch {
    return null;
  }
}

/** Merge a product's ingredients into the profile so personalization reprioritizes around it. */
export function mergeProductIntoProfile(
  profile: ResolvedSkinProfile,
  ingredients: string[],
): ResolvedSkinProfile {
  const currentIngredients = [...profile.currentIngredients];
  for (const raw of ingredients) {
    const value = raw.trim();
    if (value && !currentIngredients.includes(value)) currentIngredients.push(value);
  }
  return { ...profile, currentIngredients: currentIngredients.slice(0, 30) };
}
