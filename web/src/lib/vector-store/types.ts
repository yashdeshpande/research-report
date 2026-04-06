export type VectorChunkPayload = {
  id?: string;
  vector: number[];
  text: string;
  sourceType: "REPORT" | "RESEARCH_PLAN" | "INSIGHT";
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  fileName?: string | null;
};

export type VectorSearchResult = {
  id: string;
  score: number;
  text: string;
  sourceType: "REPORT" | "RESEARCH_PLAN" | "INSIGHT";
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  fileName?: string | null;
};

export interface VectorStore {
  upsertChunks(chunks: VectorChunkPayload[]): Promise<void>;
  deleteBySource(sourceType: VectorChunkPayload["sourceType"], sourceId: string): Promise<void>;
  search(vector: number[], options?: { limit?: number; projectId?: string }): Promise<VectorSearchResult[]>;
}
