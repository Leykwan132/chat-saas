import { RAG } from "@convex-dev/rag";
import { components } from "../_generated/api";
import {
  CF_EMBEDDING_DIMENSION,
  getCloudflareEmbeddingModel,
} from "../llm/cloudflareEmbeddings";

export type KnowledgeEntryType = "web" | "file" | "text" | "qa";

export type KnowledgeFilters = {
  entryType: KnowledgeEntryType;
};

let cached: RAG<KnowledgeFilters> | null = null;

export function getRag(): RAG<KnowledgeFilters> {
  if (!cached) {
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
