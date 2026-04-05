import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";

const paramsSchema = z.object({
  projectId: z.string().min(1),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid Project id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query params", issues: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const project = await db.project.findUnique({
    where: { id: parsedParams.data.projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const revisions = await db.researchPlanRevision.findMany({
    where: {
      researchPlan: {
        projectId: parsedParams.data.projectId,
      },
    },
    include: {
      editedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: parsedQuery.data.limit,
  });

  return NextResponse.json({ data: revisions });
}
