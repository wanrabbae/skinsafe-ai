"use client";

import { useQuery } from "@tanstack/react-query";

import type { ProfileRecommendationResult } from "./profile.types";

export const currentProfileQueryKey = ["profile", "current"] as const;

export function useCurrentProfileResult() {
  return useQuery<ProfileRecommendationResult | null>({
    queryKey: currentProfileQueryKey,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
