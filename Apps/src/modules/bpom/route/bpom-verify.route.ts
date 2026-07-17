import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyBpom } from "../service/bpom-direct.service";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export async function getBpomVerify(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "Minimal 2 karakter." } },
      { status: 422 },
    );
  }

  try {
    const result = await verifyBpom(parsed.data.q);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: { code: "BPOM_VERIFY_UNAVAILABLE", message: "Verifikasi BPOM tidak tersedia." } },
      { status: 503 },
    );
  }
}
