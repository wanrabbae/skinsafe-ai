import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/shared/prisma/client";

const bodySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ingredients: z.string().nullable().optional(),
  bpomNumber: z.string().nullable().optional(),
  bpomStatus: z.string().nullable().optional(),
  bpomRegistrant: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
});

export async function postProductSave(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Body JSON tidak valid." } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data produk tidak lengkap." } },
      { status: 422 },
    );
  }

  const product = await prisma.product.upsert({
    where: { slug: parsed.data.slug },
    create: parsed.data,
    update: {
      name: parsed.data.name,
      brand: parsed.data.brand ?? undefined,
      imageUrl: parsed.data.imageUrl ?? undefined,
      ingredients: parsed.data.ingredients ?? undefined,
      bpomNumber: parsed.data.bpomNumber ?? undefined,
      bpomStatus: parsed.data.bpomStatus ?? undefined,
      bpomRegistrant: parsed.data.bpomRegistrant ?? undefined,
      sourceUrl: parsed.data.sourceUrl ?? undefined,
    },
  });

  return NextResponse.json({ product });
}
