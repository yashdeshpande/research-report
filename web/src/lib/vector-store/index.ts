import { SqliteVectorStore } from "./sqlite-store";

export const vectorStore = new SqliteVectorStore();

export type { VectorChunkPayload, VectorSearchResult, VectorStore } from "./types";
