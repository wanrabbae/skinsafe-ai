export type ScanHistoryTone = "safe" | "caution" | "danger";

export type ScanHistoryItem = {
  name: string;
  brand: string;
  date: string;
  score: number;
  status: string;
  tone: ScanHistoryTone;
};

const SCAN_HISTORY: ScanHistoryItem[] = [
  {
    name: "Gentle Barrier Serum",
    brand: "Skinfiction",
    date: "Hari ini",
    score: 92,
    status: "Aman",
    tone: "safe",
  },
  {
    name: "Daily UV Shield SPF 50",
    brand: "Sunroom",
    date: "Kemarin",
    score: 78,
    status: "Waspada",
    tone: "caution",
  },
  {
    name: "Brightening Night Cream",
    brand: "Moonlab",
    date: "3 hari lalu",
    score: 46,
    status: "Hindari",
    tone: "danger",
  },
];

export function getScanHistory(): ScanHistoryItem[] {
  return SCAN_HISTORY;
}
