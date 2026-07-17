"use client";

import { useSyncExternalStore } from "react";

import type { CompletedAnalysis } from "./service/scan-ai.service";

const SCAN_RESULT_KEY = "skinsafe.scan.result";
const SCAN_HISTORY_KEY = "skinsafe.scan.history";
const SCAN_EVENT = "skinsafe:scan-result";
const HISTORY_LIMIT = 20;

export type ScanHistoryEntry = {
  scanId: string;
  name: string | null;
  brand: string | null;
  overallScore: number;
  status: CompletedAnalysis["report"]["status"];
  at: number;
};

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SCAN_EVENT));
}

function readHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(SCAN_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScanResult(
  result: CompletedAnalysis,
  meta?: { productName?: string | null; brand?: string | null },
): void {
  if (typeof window === "undefined") return;
  const merged: CompletedAnalysis = meta
    ? {
        ...result,
        product: {
          ...result.product,
          name: meta.productName ?? result.product.name ?? null,
          brand: meta.brand ?? result.product.brand ?? null,
        },
      }
    : result;
  window.localStorage.setItem(SCAN_RESULT_KEY, JSON.stringify(merged));

  const entry: ScanHistoryEntry = {
    scanId: merged.scanId,
    name: merged.product.name ?? null,
    brand: merged.product.brand ?? null,
    overallScore: merged.report.overallScore,
    status: merged.report.status,
    at: Date.now(),
  };
  const history = [entry, ...readHistory().filter((item) => item.scanId !== entry.scanId)];
  window.localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  notify();
}

export function loadScanResult(): CompletedAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SCAN_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompletedAnalysis;
  } catch {
    return null;
  }
}

let cachedResultRaw: string | null = null;
let cachedResult: CompletedAnalysis | null = null;

function getResultSnapshot(): CompletedAnalysis | null {
  const raw = window.localStorage.getItem(SCAN_RESULT_KEY);
  if (raw === cachedResultRaw) return cachedResult;
  cachedResultRaw = raw;
  cachedResult = raw ? loadScanResult() : null;
  return cachedResult;
}

let cachedHistoryRaw: string | null = null;
let cachedHistory: ScanHistoryEntry[] = [];

function getHistorySnapshot(): ScanHistoryEntry[] {
  const raw = window.localStorage.getItem(SCAN_HISTORY_KEY);
  if (raw === cachedHistoryRaw) return cachedHistory;
  cachedHistoryRaw = raw;
  cachedHistory = readHistory();
  return cachedHistory;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SCAN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SCAN_EVENT, callback);
  };
}

const EMPTY_HISTORY: ScanHistoryEntry[] = [];

export function useScanResult() {
  const result = useSyncExternalStore(subscribe, getResultSnapshot, () => null);
  const loaded = useSyncExternalStore(() => () => {}, () => true, () => false);
  return { result, loaded };
}

export function useScanHistory(): ScanHistoryEntry[] {
  return useSyncExternalStore(subscribe, getHistorySnapshot, () => EMPTY_HISTORY);
}
