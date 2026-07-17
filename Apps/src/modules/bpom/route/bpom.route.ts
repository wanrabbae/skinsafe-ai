import { NextResponse } from "next/server";
import { z } from "zod";

import { BpomAIError, searchBpom } from "../service/bpom.service";

const querySchema = z.object({
  q: z.string().trim().min(3).max(120),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export async function getBpomSearch(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BPOM_QUERY",
          message: "Kata kunci pencarian minimal 3 karakter.",
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = await searchBpom(parsed.data.q, parsed.data.limit);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BpomAIError) {
      return NextResponse.json(error.detail, { status: error.status });
    }
    return NextResponse.json(
      {
        error: {
          code: "BPOM_SEARCH_UNAVAILABLE",
          message: "Pencarian BPOM sedang tidak tersedia. Coba lagi nanti.",
        },
      },
      { status: 503 },
    );
  }
}
