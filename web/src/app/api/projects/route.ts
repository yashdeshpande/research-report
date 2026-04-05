import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validation";

export async function GET() {
  const items = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      productArea: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { reports: true, insights: true },
      },
    },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = projectCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
    const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;

    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "endDate must be the same as or later than startDate" },
        { status: 400 },
      );
    }

    const [productArea, researcher] = await Promise.all([
      db.productArea.findUnique({
        where: { id: parsed.data.productAreaId },
        select: { id: true },
      }),
      db.researcher.findUnique({
        where: { id: parsed.data.createdById },
        select: { id: true },
      }),
    ]);

    if (!productArea) {
      return NextResponse.json({ error: "Product Area not found" }, { status: 404 });
    }

    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }

    const created = await db.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        productAreaId: parsed.data.productAreaId,
        createdById: parsed.data.createdById,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create Project" }, { status: 500 });
  }
}
