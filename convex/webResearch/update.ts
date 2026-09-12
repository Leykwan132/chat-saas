"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthContext } from "../authUtils";
import { webScraperPool } from "../workpool";
import { WEBSITE_RESEARCH_PAID_PLAN_ERROR } from "./markdown";
import { isWebEntryBusy } from "./markdown";
import { persistWebMarkdown } from "./persist";

export const persistUpdatedWebMarkdown = internalAction({
  args: {
    entryId: v.string(),
    url: v.string(),
    agentId: v.string(),
    orgId: v.string(),
    markdown: v.string(),
    previousMarkdownR2Key: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
    ragEntryId: v.optional(v.string()),
    fileSize: v.number(),
    markdownR2Key: v.string(),
  }),
  handler: async (ctx, args) => {
    return await persistWebMarkdown(ctx, args);
  },
});

export const updateWebMarkdown = action({
  args: {
    entryId: v.id("webEntries"),
    markdown: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const canResearch = await ctx.runQuery(
      internal.webResearch.access.internalCanResearchWebsites,
      {},
    );
    if (!canResearch) throw new Error(WEBSITE_RESEARCH_PAID_PLAN_ERROR);
    const entry = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
      entryId: args.entryId,
    });
    if (!entry) throw new Error("Web entry not found");
    if (entry.orgId !== auth.orgId) throw new Error("Forbidden");
    if (isWebEntryBusy(entry.status)) {
      throw new Error("This website is still being processed");
    }

    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: args.entryId,
      status: "gettingMarkdown",
    });

    await webScraperPool.enqueueAction(
      ctx,
      internal.webResearch.update.persistUpdatedWebMarkdown,
      {
        entryId: args.entryId,
        url: entry.url,
        agentId: entry.agentId,
        orgId: entry.orgId,
        markdown: args.markdown,
        previousMarkdownR2Key: entry.markdownR2Key,
      },
      {
        onComplete: internal.knowledgeBase.webScraperComplete,
        context: { entryId: args.entryId },
        retry: true,
      },
    );

    return null;
  },
});
