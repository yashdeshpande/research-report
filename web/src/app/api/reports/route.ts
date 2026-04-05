import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { reportCreateSchema } from "@/lib/validation";

export async function GET() {
  const items = await db.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      contributors: {
        include: {
          researcher: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [project, researcher] = await Promise.all([
      db.project.findUnique({
        where: { id: parsed.data.projectId },
        select: { id: true },
      }),
      db.researcher.findUnique({
        where: { id: parsed.data.createdById },
        select: { id: true },
      }),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }

    const created = await db.report.create({
      data: {
        title: parsed.data.title,
        notes: parsed.data.notes,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName,
        fileSize: parsed.data.fileSize,
        projectId: parsed.data.projectId,
        createdById: parsed.data.createdById,
        contributors: {
          create: {
            researcherId: parsed.data.createdById,
            role: "AUTHOR",
          },
        },
      },
      include: {
        contributors: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create Report" }, { status: 500 });
  }
}
