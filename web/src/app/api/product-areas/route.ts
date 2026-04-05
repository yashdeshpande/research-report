import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { productAreaCreateSchema } from "@/lib/validation";

export async function GET() {
  const items = await db.productArea.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { projects: true },
      },
    },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = productAreaCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const researcher = await db.researcher.findUnique({
      where: { id: parsed.data.createdById },
      select: { id: true },
    });

    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }

    const created = await db.productArea.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create Product Area" }, { status: 500 });
  }
}
