import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { enqueueIndexingJob } from "@/lib/indexing/jobs";

export async function POST() {
  try {
    const [reports, plans] = await Promise.all([
      db.report.findMany({
        where: { indexingStatus: { in: ["NOT_INDEXED", "FAILED"] } },
        select: { id: true, projectId: true, fileName: true },
      }),
      db.researchPlan.findMany({
        where: { indexingStatus: { in: ["NOT_INDEXED", "FAILED"] } },
        select: { id: true, projectId: true },
      }),
    ]);

    const enqueued: Array<{ sourceType: string; sourceId: string }> = [];

    for (const report of reports) {
      await enqueueIndexingJob({
        sourceType: "REPORT",
        sourceId: report.id,
        projectId: report.projectId,
        payload: { fileName: report.fileName },
      });
      enqueued.push({ sourceType: "REPORT", sourceId: report.id });
    }

    for (const plan of plans) {
      await enqueueIndexingJob({
        sourceType: "RESEARCH_PLAN",
        sourceId: plan.id,
        projectId: plan.projectId,
      });
      enqueued.push({ sourceType: "RESEARCH_PLAN", sourceId: plan.id });
    }

    return NextResponse.json({ data: { enqueued: enqueued.length, items: enqueued } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Backfill failed: ${message}` }, { status: 500 });
  }
}
