import "server-only";

import { getBpomEnv } from "@/shared/lib/env";

import type { BpomSearchItem, BpomSearchResponse } from "./bpom.service";

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

export async function verifyBpom(query: string): Promise<BpomSearchResponse> {
  let env: ReturnType<typeof getBpomEnv>;
  try {
    env = getBpomEnv();
  } catch {
    return {
      query,
      results: [],
      configured: false,
      reachable: false,
      disclaimer: "BPOM API belum dikonfigurasi.",
    };
  }

  const url = `${env.API_INDONESIA_API_BPOM_URL}${encodeURIComponent(query)}`;

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
        query,
        results: [],
        configured: true,
        reachable: false,
        disclaimer: `BPOM API error: HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as { data?: ApiIndonesiaBpomItem[] };
    const items = Array.isArray(body.data) ? body.data.map(normalizeItem) : [];

    return {
      query,
      results: items,
      configured: true,
      reachable: true,
      disclaimer: "Data dari API Indonesia — BPOM registry.",
    };
  } catch {
    return {
      query,
      results: [],
      configured: true,
      reachable: false,
      disclaimer: "Layanan BPOM tidak dapat dihubungi.",
    };
  }
}
