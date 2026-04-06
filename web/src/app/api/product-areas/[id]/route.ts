import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { productAreaUpdateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Product Area id" }, { status: 400 });
  }

  const item = await db.productArea.findUnique({
    where: { id: parsedParams.data.id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      projects: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { projects: true },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Product Area not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Product Area id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = productAreaUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await db.productArea.update({
      where: { id: parsedParams.data.id },
      data: parsedBody.data,
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Could not update Product Area" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Product Area id" }, { status: 400 });
  }

  const productArea = await db.productArea.findUnique({
    where: { id: parsedParams.data.id },
    select: {
      _count: {
        select: { projects: true },
      },
    },
  });

  if (!productArea) {
    return NextResponse.json({ error: "Product Area not found" }, { status: 404 });
  }

  if (productArea._count.projects > 0) {
    return NextResponse.json(
      {
        error: "Product Area cannot be deleted while it still has Projects",
        dependencies: { projects: productArea._count.projects },
      },
      { status: 409 },
    );
  }

  await db.productArea.delete({
    where: { id: parsedParams.data.id },
  });

  return NextResponse.json({ success: true });
}
