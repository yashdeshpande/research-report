import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { projectInsightReviewSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().min(1),
  insightId: z.string().min(1),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; insightId: string }> },
) {
  const params = await context.params;
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid route params" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsedBody = projectInsightReviewSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const [insight, reviewer] = await Promise.all([
      db.projectInsight.findUnique({
        where: { id: parsedParams.data.insightId },
        select: { id: true, projectId: true },
      }),
      db.researcher.findUnique({
        where: { id: parsedBody.data.reviewedById },
        select: { id: true },
      }),
    ]);

    if (!insight || insight.projectId !== parsedParams.data.id) {
      return NextResponse.json({ error: "Insight not found in this Project" }, { status: 404 });
    }

    if (!reviewer) {
      return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    }

    const updated = await db.projectInsight.update({
      where: { id: parsedParams.data.insightId },
      data: {
        status: parsedBody.data.status,
        reviewedById: parsedBody.data.reviewedById,
        reviewedAt: new Date(),
        editorNotes: parsedBody.data.editorNotes ?? null,
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

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Could not update Insight review" }, { status: 500 });
  }
}
