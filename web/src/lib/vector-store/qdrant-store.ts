import { QdrantClient } from "@qdrant/js-client-rest";

import type { VectorChunkPayload, VectorSearchResult, VectorStore } from "./types";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://127.0.0.1:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION ?? "research_chunks";

export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;
  private readyDimensions: number | null = null;

  constructor() {
    this.client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
  }

  private async ensureCollection(dimensions: number) {
    if (this.readyDimensions === dimensions) {
      return;
    }

    try {
      const existing = await this.client.getCollection(QDRANT_COLLECTION);
      const config = existing.config?.params?.vectors;
      const existingSize = typeof config === "object" && !Array.isArray(config) && "size" in config
        ? (config.size as number)
        : undefined;

      if (existingSize !== dimensions) {
        throw new Error(
          `Qdrant collection vector size mismatch: expected ${dimensions}, got ${existingSize ?? "unknown"}`,
        );
      }
    } catch {
      await this.client.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: dimensions,
          distance: "Cosine",
        },
      });
    }

    this.readyDimensions = dimensions;
  }

  async upsertChunks(chunks: VectorChunkPayload[]) {
    if (chunks.length === 0) {
      return;
    }

    await this.ensureCollection(chunks[0].vector.length);

    await this.client.upsert(QDRANT_COLLECTION, {
      wait: true,
      points: chunks.map((chunk, index) => ({
        id: chunk.id ?? `${chunk.sourceType}:${chunk.sourceId}:${index}`,
        vector: chunk.vector,
        payload: {
          text: chunk.text,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          projectId: chunk.projectId,
          chunkIndex: chunk.chunkIndex,
          fileName: chunk.fileName ?? null,
        },
      })),
    });
  }

  async deleteBySource(sourceType: VectorChunkPayload["sourceType"], sourceId: string) {
    await this.client.delete(QDRANT_COLLECTION, {
      wait: true,
      filter: {
        must: [
          { key: "sourceType", match: { value: sourceType } },
          { key: "sourceId", match: { value: sourceId } },
        ],
      },
    });
  }

  async search(vector: number[], options?: { limit?: number; projectId?: string }): Promise<VectorSearchResult[]> {
    await this.ensureCollection(vector.length);

    const limit = options?.limit ?? 8;

    const response = await this.client.search(QDRANT_COLLECTION, {
      vector,
      limit,
      with_payload: true,
      filter: options?.projectId
        ? {
            must: [{ key: "projectId", match: { value: options.projectId } }],
          }
        : undefined,
    });

    const results: VectorSearchResult[] = [];

    for (const point of response) {
        const payload = point.payload as {
          text?: unknown;
          sourceType?: unknown;
          sourceId?: unknown;
          projectId?: unknown;
          chunkIndex?: unknown;
          fileName?: unknown;
        };

        if (
          typeof payload?.text !== "string" ||
          typeof payload?.sourceType !== "string" ||
          typeof payload?.sourceId !== "string" ||
          typeof payload?.projectId !== "string"
        ) {
          continue;
        }

        results.push({
          id: String(point.id),
          score: point.score,
          text: payload.text,
          sourceType: payload.sourceType as VectorSearchResult["sourceType"],
          sourceId: payload.sourceId,
          projectId: payload.projectId,
          chunkIndex: typeof payload.chunkIndex === "number" ? payload.chunkIndex : 0,
          fileName: typeof payload.fileName === "string" ? payload.fileName : undefined,
        });
      }

    return results;
  }
}
