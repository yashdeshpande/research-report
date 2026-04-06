import { db } from "@/lib/db";
import { llmProvider } from "@/lib/llm";
import { vectorStore } from "@/lib/vector-store";

import { extractTextFromReportFile } from "./extract";
import { chunkText, toPlainText } from "./text";

type IndexableSourceType = "REPORT" | "RESEARCH_PLAN" | "INSIGHT";

type EmbeddedChunk = {
  vector: number[];
  text: string;
  sourceType: IndexableSourceType;
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  fileName?: string | null;
};

type EnqueueIndexingJobInput = {
  sourceType: IndexableSourceType;
  sourceId: string;
  projectId: string;
  payload?: unknown;
};

async function embedChunks(
  texts: string[],
  meta: Omit<EmbeddedChunk, "vector" | "text" | "chunkIndex">,
): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];
  for (let i = 0; i < texts.length; i++) {
    const embedding = await llmProvider.embed(texts[i]);
    results.push({
      vector: embedding.vector,
      text: texts[i],
      chunkIndex: i,
      ...meta,
    });
  }
  return results;
}

function truncateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 1200);
}

async function setSourceIndexingState(input: {
  sourceType: IndexableSourceType;
  sourceId: string;
  status: "NOT_INDEXED" | "QUEUED" | "PROCESSING" | "INDEXED" | "FAILED";
  error: string | null;
}) {
  const data = {
    indexingStatus: input.status,
    indexingError: input.error,
    ...(input.status === "INDEXED" ? { lastIndexedAt: new Date() } : {}),
  };

  if (input.sourceType === "REPORT") {
    await db.report.update({
      where: { id: input.sourceId },
      data,
    });
    return;
  }

  if (input.sourceType === "RESEARCH_PLAN") {
    await db.researchPlan.update({
      where: { id: input.sourceId },
      data,
    });
    return;
  }
}

async function indexReport(sourceId: string) {
  const report = await db.report.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      projectId: true,
      fileUrl: true,
      fileName: true,
    },
  });

  if (!report) {
    throw new Error("Report no longer exists");
  }

  const extracted = await extractTextFromReportFile(report.fileUrl, report.fileName);
  const chunks = chunkText(extracted);

  if (chunks.length === 0) {
    throw new Error("No text could be extracted from this report");
  }

  const embedded = await embedChunks(chunks, {
    sourceType: "REPORT",
    sourceId: report.id,
    projectId: report.projectId,
    fileName: report.fileName,
  });

  await vectorStore.deleteBySource("REPORT", report.id);
  await vectorStore.upsertChunks(embedded);
}

async function indexResearchPlan(sourceId: string) {
  const plan = await db.researchPlan.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      projectId: true,
      content: true,
      fileName: true,
    },
  });

  if (!plan) {
    throw new Error("Research plan no longer exists");
  }

  const plainText = toPlainText(plan.content);
  const chunks = chunkText(plainText);

  if (chunks.length === 0) {
    throw new Error("Research plan has no indexable text");
  }

  const embedded = await embedChunks(chunks, {
    sourceType: "RESEARCH_PLAN",
    sourceId: plan.id,
    projectId: plan.projectId,
    fileName: plan.fileName,
  });

  await vectorStore.deleteBySource("RESEARCH_PLAN", plan.id);
  await vectorStore.upsertChunks(embedded);
}

async function indexSource(sourceType: IndexableSourceType, sourceId: string) {
  if (sourceType === "REPORT") {
    await indexReport(sourceId);
    return;
  }

  if (sourceType === "RESEARCH_PLAN") {
    await indexResearchPlan(sourceId);
    return;
  }

  throw new Error(`Source type ${sourceType} is not supported for indexing yet`);
}

export async function enqueueIndexingJob(input: EnqueueIndexingJobInput) {
  await setSourceIndexingState({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: "QUEUED",
    error: null,
  });

  await db.indexingJob.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      projectId: input.projectId,
      status: "QUEUED",
      payload: input.payload ? (input.payload as object) : undefined,
    },
  });
}

async function claimNextJob() {
  return db.$transaction(async (tx) => {
    const nextJob = await tx.indexingJob.findFirst({
      where: {
        status: { in: ["QUEUED", "FAILED"] },
        attempts: { lt: 3 },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    if (!nextJob) {
      return null;
    }

    const claimed = await tx.indexingJob.update({
      where: { id: nextJob.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        errorMessage: null,
        attempts: { increment: 1 },
      },
    });

    return claimed;
  });
}

export async function processNextIndexingJob() {
  const job = await claimNextJob();

  if (!job) {
    return null;
  }

  await setSourceIndexingState({
    sourceType: job.sourceType,
    sourceId: job.sourceId,
    status: "PROCESSING",
    error: null,
  });

  try {
    await indexSource(job.sourceType, job.sourceId);

    await db.$transaction(async (tx) => {
      await tx.indexingJob.update({
        where: { id: job.id },
        data: {
          status: "INDEXED",
          completedAt: new Date(),
          errorMessage: null,
        },
      });
    });

    await setSourceIndexingState({
      sourceType: job.sourceType,
      sourceId: job.sourceId,
      status: "INDEXED",
      error: null,
    });

    return { id: job.id, status: "INDEXED" as const };
  } catch (error) {
    const errorMessage = truncateError(error);

    await db.indexingJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
      },
    });

    await setSourceIndexingState({
      sourceType: job.sourceType,
      sourceId: job.sourceId,
      status: "FAILED",
      error: errorMessage,
    });

    return { id: job.id, status: "FAILED" as const, error: errorMessage };
  }
}

export async function processIndexingBatch(limit = 2) {
  const results: Array<{ id: string; status: "INDEXED" | "FAILED"; error?: string }> = [];

  for (let index = 0; index < limit; index += 1) {
    const result = await processNextIndexingJob();
    if (!result) {
      break;
    }

    results.push(result);
  }

  return results;
}
