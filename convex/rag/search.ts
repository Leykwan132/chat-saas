import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { getRag, ragNamespace } from "./client";

export type KnowledgeSearchResult = {
  id: string;
  text: string;
  score: number;
  type?: string;
  item?: unknown;
};

const SEARCH_LIMIT = 5;
const SCORE_THRESHOLD = 0.4;

export async function searchRag(
  ctx: ActionCtx,
  agentId: string,
  query: string,
): Promise<KnowledgeSearchResult[]> {
  const { results, entries } = await getRag().search(ctx, {
    namespace: ragNamespace(agentId),
    query,
    limit: SEARCH_LIMIT,
    chunkContext: { before: 1, after: 1 },
    vectorScoreThreshold: SCORE_THRESHOLD,
  });

  const entriesById = new Map(entries.map((entry) => [entry.entryId, entry]));

  return results.map((result) => {
    const entry = entriesById.get(result.entryId);
    return {
      id: `${result.entryId}:${result.order}`,
      text: result.content.map((chunk) => chunk.text).join("\n"),
      score: result.score,
      type: entry?.filterValues.find((f) => f.name === "entryType")?.value as
        | string
        | undefined,
      item: entry?.title ?? undefined,
    };
  });
}

export const internalSearchKnowledge = internalAction({
  args: {
    agentId: v.id("agents"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<KnowledgeSearchResult[]> => {
    const results = await searchRag(ctx, args.agentId, args.query);
    return results;
  },
});
