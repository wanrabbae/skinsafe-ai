import "server-only";

import { getBpomEnv } from "@/shared/lib/env";

import type { BpomSearchItem, BpomSearchResponse } from "./bpom.service";

/**
 * Daftar keyword kategori produk skincare/obat/makanan yang dikenali.
 * Dari nama produk lengkap (misal "Wardah Sunscreen SPF 50"),
 * kita extract "Sunscreen" untuk di-search ke BPOM.
 */
const CATEGORY_KEYWORDS = [
  // Skincare
  "sunscreen", "serum", "moisturizer", "cleanser", "toner", "essence",
  "cream", "krim", "lotion", "gel", "mask", "masker", "scrub", "peeling",
  "micellar", "emulsion", "ampoule", "oil", "balm", "mist", "spray",
  "eye cream", "lip balm", "body lotion", "hand cream", "night cream",
  "day cream", "face wash", "facial wash", "sabun muka",
  // Obat & suplemen
  "paracetamol", "ibuprofen", "amoxicillin", "vitamin", "suplemen",
  "tablet", "kapsul", "sirup", "salep", "obat",
  // Makanan
  "susu", "minyak", "tepung", "minuman", "makanan",
  // Kosmetik
  "lipstick", "lip tint", "foundation", "concealer", "blush", "eyeshadow",
  "mascara", "eyeliner", "powder", "bedak", "primer", "setting spray",
  "parfum", "deodorant", "shampoo", "shampo", "conditioner", "hair",
];

/**
 * Extract kategori produk dari nama lengkap.
 * "Wardah Sunscreen SPF 50" → "Sunscreen"
 * "Scarlett Whitening Serum" → "Serum"
 * Jika tidak ketemu, fallback ke nama lengkap.
 */
function extractCategoryKeyword(fullName: string): string {
  const lower = fullName.toLowerCase();

  // Cari keyword terpanjang dulu (misal "facial wash" sebelum "wash")
  const sorted = [...CATEGORY_KEYWORDS].sort((a, b) => b.length - a.length);

  for (const keyword of sorted) {
    if (lower.includes(keyword)) {
      return keyword;
    }
  }

  // Fallback: pakai nama lengkap
  return fullName;
}

type ApiIndonesiaBpomItem = {
  nomor_registrasi?: string;
  nama_produk?: string;
  pendaftar?: string;
  status?: string;
  komposisi?: string;
};

function normalizeItem(raw: ApiIndonesiaBpomItem): BpomSearchItem {
  const status = (raw.status ?? "").toLowerCase();
  return {
    number: raw.nomor_registrasi ?? null,
    productName: raw.nama_produk ?? null,
    registrant: raw.pendaftar ?? null,
    status: raw.status ?? null,
    active: status.includes("aktif") ? !status.includes("tidak") : null,
    composition: raw.komposisi ?? null,
  };
}

export async function verifyBpom(productName: string): Promise<BpomSearchResponse> {
  const keyword = extractCategoryKeyword(productName);

  let env: ReturnType<typeof getBpomEnv>;
  try {
    env = getBpomEnv();
  } catch {
    return {
      query: keyword,
      results: [],
      configured: false,
      reachable: false,
      disclaimer: "BPOM API belum dikonfigurasi.",
    };
  }

  const url = `${env.API_INDONESIA_API_BPOM_URL}${encodeURIComponent(keyword)}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-api-key": env.API_INDONESIA_API_KEY,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        query: keyword,
        results: [],
        configured: true,
        reachable: false,
        disclaimer: `BPOM API error: HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as { data?: ApiIndonesiaBpomItem[] };
    const items = Array.isArray(body.data) ? body.data.map(normalizeItem) : [];

    return {
      query: keyword,
      results: items,
      configured: true,
      reachable: true,
      disclaimer: "Data dari API Indonesia — BPOM registry.",
    };
  } catch {
    return {
      query: keyword,
      results: [],
      configured: true,
      reachable: false,
      disclaimer: "Layanan BPOM tidak dapat dihubungi.",
    };
  }
}
