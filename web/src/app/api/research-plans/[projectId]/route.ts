import { after, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { enqueueIndexingJob, processIndexingBatch } from "@/lib/indexing/jobs";
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

    const saved = await db.$transaction(async (tx) => {
      const fileFields = {
        ...(parsedBody.data.fileUrl !== undefined ? { fileUrl: parsedBody.data.fileUrl } : {}),
        ...(parsedBody.data.fileName !== undefined ? { fileName: parsedBody.data.fileName } : {}),
        ...(parsedBody.data.fileSize !== undefined ? { fileSize: parsedBody.data.fileSize } : {}),
      };

      const plan = await tx.researchPlan.upsert({
        where: { projectId: parsedParams.data.projectId },
        update: {
          content: parsedBody.data.content,
          lastEditedById: parsedBody.data.researcherId,
          ...fileFields,
        },
        create: {
          projectId: parsedParams.data.projectId,
          content: parsedBody.data.content,
          lastEditedById: parsedBody.data.researcherId,
          ...fileFields,
        },
        include: {
          lastEditedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      const revision = await tx.researchPlanRevision.create({
        data: {
          researchPlanId: plan.id,
          editedById: parsedBody.data.researcherId,
          content: parsedBody.data.content,
        },
        include: {
          editedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { plan, revision };
    });

    await enqueueIndexingJob({
      sourceType: "RESEARCH_PLAN",
      sourceId: saved.plan.id,
      projectId: parsedParams.data.projectId,
    });

    after(async () => {
      await processIndexingBatch(1);
    });

    return NextResponse.json({ data: saved.plan, revision: saved.revision });
  } catch {
    return NextResponse.json({ error: "Could not save Research Plan" }, { status: 500 });
  }
}
