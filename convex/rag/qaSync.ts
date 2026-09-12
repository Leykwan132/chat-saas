"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { cfUploadPool } from "../workpool";
import { deleteKnowledgeEntryFromRag } from "./ingest";

export const indexQaEntry = internalAction({
  args: { entryId: v.id("qaEntries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetQAEntry, {
      entryId: args.entryId,
    });
    if (!entry) {
      console.log("[convex-rag] qaSync skipped missing entry", { entryId: args.entryId });
      return null;
    }

    console.log("[convex-rag] qaSync", {
      entryId: args.entryId,
      agentId: entry.agentId,
      question: entry.question,
      answerChars: entry.answer.length,
    });

    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: args.entryId,
      status: "queued",
    });

    await cfUploadPool.enqueueAction(ctx, internal.workpool.cfUploadWorker, {
      entryId: args.entryId,
      entryType: "qa",
      question: entry.question,
      answer: entry.answer,
      agentId: entry.agentId,
      orgId: entry.orgId,
      userId: entry.userId,
    }, {
      onComplete: internal.knowledgeBase.cfUploadComplete,
      context: { entryId: args.entryId, entryType: "qa" },
      retry: true,
    });

    return null;
  },
});

export const removeQaFromRag = internalAction({
  args: { ragEntryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await deleteKnowledgeEntryFromRag(ctx, args.ragEntryId);
    return null;
  },
});
