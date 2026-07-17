import { NextResponse } from "next/server";
import { z } from "zod";

import { searchProducts } from "../service/incidecoder.service";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export async function getProductSearch(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "Minimal 2 karakter." } },
      { status: 422 },
    );
  }

  try {
    const products = await searchProducts(parsed.data.q, 5);
    return NextResponse.json({ results: products });
  } catch {
    return NextResponse.json(
      { error: { code: "SEARCH_UNAVAILABLE", message: "Pencarian produk sedang tidak tersedia." } },
      { status: 503 },
    );
  }
}
