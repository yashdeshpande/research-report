import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { projectInsightCreateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id: parsedParams.data.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const insights = await db.projectInsight.findMany({
    where: { projectId: parsedParams.data.id },
    include: {
      generatedFromReport: {
        select: { id: true, title: true },
      },
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: insights });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = projectInsightCreateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const [project, report] = await Promise.all([
      db.project.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true },
      }),
      db.report.findUnique({
        where: { id: parsedBody.data.generatedFromReportId },
        select: { id: true, projectId: true },
      }),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!report || report.projectId !== parsedParams.data.id) {
      return NextResponse.json(
        { error: "Source report must exist within the same Project" },
        { status: 400 },
      );
    }

    const created = await db.projectInsight.create({
      data: {
        projectId: parsedParams.data.id,
        content: parsedBody.data.content,
        generatedFromReportId: parsedBody.data.generatedFromReportId,
        status: "PENDING_REVIEW",
      },
      include: {
        generatedFromReport: {
          select: { id: true, title: true },
        },
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create Insight" }, { status: 500 });
  }
}
