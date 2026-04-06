import { QdrantVectorStore } from "./qdrant-store";
import { SqliteVectorStore } from "./sqlite-store";

const provider = (process.env.VECTOR_STORE ?? "sqlite").toLowerCase();

function createVectorStore() {
  if (provider === "qdrant") {
    return new QdrantVectorStore();
  }
  return new SqliteVectorStore();
}

export const vectorStore = createVectorStore();

export type { VectorChunkPayload, VectorSearchResult, VectorStore } from "./types";
