import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { researchPlanUpdateSchema } from "@/lib/validation";

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id: parsedParams.data.projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const plan = await db.researchPlan.findUnique({
    where: { projectId: parsedParams.data.projectId },
    include: {
      lastEditedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ data: plan });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = researchPlanUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const [project, researcher] = await Promise.all([
      db.project.findUnique({
        where: { id: parsedParams.data.projectId },
        select: { id: true },
      }),
      db.researcher.findUnique({
        where: { id: parsedBody.data.researcherId },
        select: { id: true },
      }),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!researcher) {
      return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
    }

    const saved = await db.researchPlan.upsert({
      where: { projectId: parsedParams.data.projectId },
      update: {
        content: parsedBody.data.content,
        lastEditedById: parsedBody.data.researcherId,
      },
      create: {
        projectId: parsedParams.data.projectId,
        content: parsedBody.data.content,
        lastEditedById: parsedBody.data.researcherId,
      },
      include: {
        lastEditedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: saved });
  } catch {
    return NextResponse.json({ error: "Could not save Research Plan" }, { status: 500 });
  }
}
