import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getIngredientKnowledge,
  IngredientAIError,
} from "../service/ingredient-ai.service";

const nameSchema = z.string().trim().min(2).max(120);

export async function getIngredient(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await context.params;
  const parsed = nameSchema.safeParse(decodeURIComponent(raw));

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INGREDIENT", message: "Nama bahan tidak valid." } },
      { status: 422 },
    );
  }

  try {
    const result = await getIngredientKnowledge(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof IngredientAIError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: { code: "INGREDIENT_NOT_FOUND", message: "Bahan tidak ditemukan." } },
          { status: 404 },
        );
      }
      return NextResponse.json(error.detail, { status: error.status });
    }
    return NextResponse.json(
      {
        error: {
          code: "INGREDIENT_UNAVAILABLE",
          message: "Penjelasan bahan sedang tidak tersedia.",
        },
      },
      { status: 503 },
    );
  }
}
