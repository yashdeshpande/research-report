import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { reportUpdateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Report id" }, { status: 400 });
  }

  const item = await db.report.findUnique({
    where: { id: parsedParams.data.id },
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
      _count: {
        select: {
          generatedInsights: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Report id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = reportUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await db.report.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const publishedAt =
      parsedBody.data.publishedAt === undefined
        ? undefined
        : parsedBody.data.publishedAt === null
          ? null
          : new Date(parsedBody.data.publishedAt);

    const updated = await db.report.update({
      where: { id: parsedParams.data.id },
      data: {
        title: parsedBody.data.title,
        notes: parsedBody.data.notes,
        fileUrl: parsedBody.data.fileUrl,
        fileName: parsedBody.data.fileName,
        fileSize: parsedBody.data.fileSize,
        status: parsedBody.data.status,
        publishedAt:
          parsedBody.data.status === "PUBLISHED" && parsedBody.data.publishedAt === undefined
            ? new Date()
            : publishedAt,
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Could not update Report" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Report id" }, { status: 400 });
  }

  const report = await db.report.findUnique({
    where: { id: parsedParams.data.id },
    select: {
      _count: {
        select: { generatedInsights: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report._count.generatedInsights > 0) {
    return NextResponse.json(
      {
        error: "Report cannot be deleted while generated insights still exist",
        dependencies: { generatedInsights: report._count.generatedInsights },
      },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.reportContributor.deleteMany({
      where: { reportId: parsedParams.data.id },
    });

    await tx.report.delete({
      where: { id: parsedParams.data.id },
    });
  });

  return NextResponse.json({ success: true });
}
