import { RAG } from "@convex-dev/rag";
import { components } from "../_generated/api";
import {
  CF_EMBEDDING_DIMENSION,
  CF_EMBEDDING_MODEL,
  getCloudflareEmbeddingModel,
} from "../llm/cloudflareEmbeddings";

export type KnowledgeEntryType = "web" | "file" | "text" | "qa";

export type KnowledgeFilters = {
  entryType: KnowledgeEntryType;
};

let cached: RAG<KnowledgeFilters> | null = null;

export function getRag(): RAG<KnowledgeFilters> {
  if (!cached) {
    console.log("[convex-rag] embedding client init", {
      model: CF_EMBEDDING_MODEL,
      dimension: CF_EMBEDDING_DIMENSION,
    });
    cached = new RAG<KnowledgeFilters>(components.rag, {
      textEmbeddingModel: getCloudflareEmbeddingModel(),
      embeddingDimension: CF_EMBEDDING_DIMENSION,
      filterNames: ["entryType"],
    });
  }
  return cached;
}

export function ragNamespace(agentId: string) {
  return `agent:${agentId}`;
}

export function ragKey(entryType: KnowledgeEntryType, entryId: string) {
  return `${entryType}:${entryId}`;
}
