import { db } from "@/lib/db";

import type { VectorChunkPayload, VectorSearchResult, VectorStore } from "./types";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class SqliteVectorStore implements VectorStore {
  async upsertChunks(chunks: VectorChunkPayload[]): Promise<void> {
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      const embeddingJson = JSON.stringify(chunk.vector);

      await db.documentChunk.upsert({
        where: {
          // Use a synthetic unique key built from sourceType+sourceId+chunkIndex
          // We identify by matching on all three fields via findFirst then update
          id: await this.findChunkId(chunk.sourceType, chunk.sourceId, chunk.chunkIndex),
        },
        update: {
          chunkText: chunk.text,
          embedding: embeddingJson,
        },
        create: {
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          projectId: chunk.projectId,
          chunkText: chunk.text,
          chunkIndex: chunk.chunkIndex,
          embedding: embeddingJson,
        },
      });
    }
  }

  private async findChunkId(
    sourceType: VectorChunkPayload["sourceType"],
    sourceId: string,
    chunkIndex: number,
  ): Promise<string> {
    const existing = await db.documentChunk.findFirst({
      where: { sourceType, sourceId, chunkIndex },
      select: { id: true },
    });
    // Return a non-existent ID if not found — Prisma upsert will then create
    return existing?.id ?? `__new__${sourceType}${sourceId}${chunkIndex}`;
  }

  async deleteBySource(
    sourceType: VectorChunkPayload["sourceType"],
    sourceId: string,
  ): Promise<void> {
    await db.documentChunk.deleteMany({ where: { sourceType, sourceId } });
  }

  async search(
    vector: number[],
    options?: { limit?: number; projectId?: string },
  ): Promise<VectorSearchResult[]> {
    const limit = options?.limit ?? 8;

    const rows = await db.documentChunk.findMany({
      where: {
        ...(options?.projectId ? { projectId: options.projectId } : {}),
        embedding: { not: null },
      },
      select: {
        id: true,
        chunkText: true,
        sourceType: true,
        sourceId: true,
        projectId: true,
        chunkIndex: true,
        embedding: true,
      },
    });

    const scored = rows
      .map((row) => {
        let rowVector: number[];
        try {
          rowVector = JSON.parse(row.embedding!) as number[];
        } catch {
          return null;
        }
        return {
          id: row.id,
          score: cosineSimilarity(vector, rowVector),
          text: row.chunkText,
          sourceType: row.sourceType as VectorSearchResult["sourceType"],
          sourceId: row.sourceId,
          projectId: row.projectId,
          chunkIndex: row.chunkIndex,
        };
      })
      .filter((item): item is VectorSearchResult => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }
}
