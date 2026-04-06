import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { processIndexingBatch } from "@/lib/indexing/jobs";
import { indexingProcessSchema } from "@/lib/validation";

export async function GET() {
  const [reportCounts, planCounts, jobCounts, chunkCount] = await Promise.all([
    db.report.groupBy({ by: ["indexingStatus"], _count: { id: true } }),
    db.researchPlan.groupBy({ by: ["indexingStatus"], _count: { id: true } }),
    db.indexingJob.groupBy({ by: ["status"], _count: { id: true } }),
    db.documentChunk.count(),
  ]);

  const toMap = (rows: Array<{ _count: { id: number }; [k: string]: unknown }>, key: string) =>
    Object.fromEntries(rows.map((r) => [r[key] as string, r._count.id]));

  return NextResponse.json({
    data: {
      reports: toMap(reportCounts, "indexingStatus"),
      researchPlans: toMap(planCounts, "indexingStatus"),
      jobs: toMap(jobCounts, "status"),
      totalChunks: chunkCount,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = indexingProcessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const limit = parsed.data.limit ?? 2;
    const results = await processIndexingBatch(limit);

    return NextResponse.json({
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not process indexing jobs: ${message}` }, { status: 500 });
  }
}
