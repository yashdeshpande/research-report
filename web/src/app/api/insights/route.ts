import { NextResponse } from "next/server";

import type { InsightStatus } from "../../../../prisma/generated/client";

import { db } from "@/lib/db";

const insightStatuses: InsightStatus[] = ["PENDING_REVIEW", "APPROVED", "REVISED", "REJECTED"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const reportId = searchParams.get("reportId")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const validStatus = insightStatuses.find((candidate) => candidate === status);

  const insights = await db.projectInsight.findMany({
    where: {
      projectId: projectId || undefined,
      generatedFromReportId: reportId || undefined,
      status: validStatus,
      content: query
        ? {
            contains: query,
          }
        : undefined,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      generatedFromReport: {
        select: {
          id: true,
          title: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ data: insights });
}