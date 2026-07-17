import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeProduct, ScanAIError } from "../service/scan-ai.service";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const routineItemSchema = z.object({
  productName: z.string().trim().min(1),
  activeIngredients: z.array(z.string().trim().min(1)),
});

const analysisSchema = z.object({
  scanId: z.string().uuid(),
  input: z.object({
    method: z.enum(["manual", "camera"]),
    imageUrls: z.array(z.string().url()).optional(),
    bpomNumber: z.string().trim().nullable().optional(),
    claimsText: z.string().trim().nullable().optional(),
    ingredientsText: z.string().trim().nullable().optional(),
  }),
  profile: z.object({
    skinType: z.string().trim().min(1),
    sensitivityLevel: z.string().trim().min(1),
    conditions: z.array(z.string().trim().min(1)),
    concerns: z.array(z.string().trim().min(1)),
    pregnancyStatus: z.enum(["none", "pregnant", "breastfeeding"]),
    currentRoutine: z.array(routineItemSchema),
  }),
  options: z
    .object({
      locale: z.string().optional(),
      includeDebug: z.boolean().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function upstreamError(error: unknown) {
  if (error instanceof ScanAIError) {
    return NextResponse.json(error.detail, { status: error.status });
  }
  return NextResponse.json(
    {
      error: {
        code: "AI_ANALYSIS_UNAVAILABLE",
        message: "Layanan analisis sedang tidak tersedia. Coba lagi dalam beberapa saat.",
      },
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function postAnalysis(request: Request) {
  const parsed = analysisSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ANALYSIS_INPUT",
          message: parsed.error.issues[0]?.message || "Input analisis tidak valid.",
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = await analyzeProduct(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return upstreamError(error);
  }
}
