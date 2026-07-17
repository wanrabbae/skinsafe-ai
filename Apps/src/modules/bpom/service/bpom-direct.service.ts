import "server-only";

import { getBpomEnv } from "@/shared/lib/env";

import type { BpomSearchItem, BpomSearchResponse } from "./bpom.service";

// Cloudflare (error 1010) memblokir signature default; kirim UA seperti browser.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

// Pencarian registry cocok per-keyword: nama produk lengkap mengembalikan nol,
// sedangkan brand mengembalikan daftar produk brand tersebut. Kita query brand
// lalu fuzzy-match nama produk supaya hasil pertama benar-benar produk terkait.
const MATCH_THRESHOLD = 0.4;

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean),
  );
}

function similarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  return intersection / Math.max(setA.size, setB.size);
}

/** Keyword pencarian: pakai brand (kata pertama nama) yang punya recall terbaik. */
function searchKeyword(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Nama produk tanpa brand (kata pertama) — brand sudah jadi keyword pencarian. */
function nameWithoutBrand(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : fullName;
}

type ApiIndonesiaBpomItem = {
  nie?: string;
  product_name?: string;
  brand?: string;
  registrar?: string;
  status?: string;
  ingredients?: string | null;
  category?: string;
};

function normalizeItem(raw: ApiIndonesiaBpomItem): BpomSearchItem {
  const status = (raw.status ?? "").toLowerCase();
  const active = status
    ? (status.includes("berlaku") || status.includes("aktif")) && !status.includes("tidak")
    : null;
  return {
    number: raw.nie ?? null,
    productName: raw.product_name ?? null,
    registrant: raw.brand ?? raw.registrar ?? null,
    status: raw.status ?? null,
    active,
    composition: raw.ingredients ?? null,
  };
}

/**
 * Demo blocklist — produk skincare yang memang pernah ditarik / tidak terdaftar
 * di BPOM berdasarkan berita nyata dan Public Warning BPOM RI.
 *
 * Saat demo, cari produk-produk ini di INCIDecoder lalu sistem akan
 * menampilkan popup "Produk Tidak Terdaftar di BPOM ⚠️".
 *
 * Contoh pencarian demo:
 *   - "cream hn"       → Cream HN (mengandung merkuri)
 *   - "dr skincare"    → DR Skincare (produk ilegal)
 *   - "cream sari"     → Cream Sari (mengandung merkuri/hidroquinon)
 *   - "temulawak cream" → Cream Temulawak palsu
 *   - "collagen cream"  → Berbagai krim kolagen ilegal
 */
const DEMO_BLOCKLIST = [
  "cream hn",
  "hn cream",
  "dr skincare",
  "dr. skincare",
  "cream sari",
  "sari cream",
  "temulawak cream",
  "cream temulawak",
  "collagen cream",
  "cream collagen",
  "cream racikan",
  "cream dokter",
  "beauty glow cream",
  "whitening magic cream",
];

function isDemoBlocked(productName: string): boolean {
  const lower = productName.toLowerCase();
  return DEMO_BLOCKLIST.some((blocked) => lower.includes(blocked));
}

export async function verifyBpom(productName: string): Promise<BpomSearchResponse> {
  // Demo: produk yang diketahui tidak terdaftar BPOM → langsung return kosong
  if (isDemoBlocked(productName)) {
    return {
      query: productName,
      results: [],
      configured: true,
      reachable: true,
      disclaimer: "Produk ini termasuk dalam daftar produk yang diketahui tidak terdaftar di BPOM.",
    };
  }

  const keyword = searchKeyword(productName);

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
        "user-agent": BROWSER_USER_AGENT,
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

    // Ambil produk yang paling cocok, dibandingkan pada nama tanpa brand supaya
    // token brand/generik tidak memicu false match ke produk lain se-brand.
    const target = nameWithoutBrand(productName);
    const best = items
      .map((item) => ({ item, score: similarity(target, item.productName ?? "") }))
      .sort((a, b) => b.score - a.score)[0];
    const results = best && best.score >= MATCH_THRESHOLD ? [best.item] : [];

    return {
      query: keyword,
      results,
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
