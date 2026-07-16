"use client";

import { useSyncExternalStore } from "react";

import type { ProfileRecommendationResult } from "./profile.types";

const PROFILE_RESULT_KEY = "skinsafe.profile.result";
const PROFILE_EVENT = "skinsafe:profile-result";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

export function saveProfileResult(result: ProfileRecommendationResult): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_RESULT_KEY, JSON.stringify(result));
  notify();
}

export function loadProfileResult(): ProfileRecommendationResult | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileRecommendationResult;
  } catch {
    return null;
  }
}

export function clearProfileResult(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_RESULT_KEY);
  notify();
}

export function hasProfileResult(): boolean {
  return loadProfileResult() !== null;
}

let cachedRaw: string | null = null;
let cachedResult: ProfileRecommendationResult | null = null;

function getResultSnapshot(): ProfileRecommendationResult | null {
  const raw = window.localStorage.getItem(PROFILE_RESULT_KEY);
  if (raw === cachedRaw) return cachedResult;
  cachedRaw = raw;
  cachedResult = raw ? loadProfileResult() : null;
  return cachedResult;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PROFILE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PROFILE_EVENT, callback);
  };
}

const subscribeNoop = () => () => {};

export function useProfileResult() {
  const result = useSyncExternalStore(subscribe, getResultSnapshot, () => null);
  const loaded = useSyncExternalStore(subscribeNoop, () => true, () => false);
  return { result, loaded };
}
