import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import { db } from "@/lib/db";
import { researcherCreateSchema } from "@/lib/validation";

export async function GET() {
  const items = await db.researcher.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = researcherCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.researcher.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "A researcher with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const created = await db.researcher.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        avatarUrl: parsed.data.avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create Researcher" }, { status: 500 });
  }
}