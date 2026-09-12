"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAuthContext } from "../authUtils";
import { webScraperPool } from "../workpool";
import { WEBSITE_RESEARCH_PAID_PLAN_ERROR } from "./markdown";

export const enqueueWebResearch = action({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
  },
  returns: v.object({
    entryId: v.id("webEntries"),
  }),
  handler: async (ctx, args): Promise<{ entryId: Id<"webEntries"> }> => {
    const auth = await getAuthContext(ctx);
    const canResearch = await ctx.runQuery(
      internal.webResearch.access.internalCanResearchWebsites,
      {},
    );
    if (!canResearch) throw new Error(WEBSITE_RESEARCH_PAID_PLAN_ERROR);
    const url = args.url.trim();
    if (!url) throw new Error("URL is required");

    const alreadyAdded = await ctx.runQuery(
      internal.knowledgeBase.internalHasParentWebUrl,
      { agentId: args.agentId, url },
    );
    if (alreadyAdded) {
      throw new Error("This URL has already been added");
    }

    console.log("[web-research] enqueue", {
      agentId: args.agentId,
      url,
      orgId: auth.orgId,
    });

    const entryId = await ctx.runMutation(
      internal.knowledgeBase.internalStoreWebEntry,
      {
        agentId: args.agentId,
        url,
        fileSize: new Blob([url]).size,
        userId: auth.userId,
        orgId: auth.orgId,
      },
    );
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId,
      status: "gettingLinks",
    });

    console.log("[web-research] queued worker", { entryId, url });

    await webScraperPool.enqueueAction(
      ctx,
      internal.webResearch.worker.researchWebsite,
      {
        entryId,
        url,
        agentId: args.agentId,
        orgId: auth.orgId,
      },
      {
        onComplete: internal.knowledgeBase.webScraperComplete,
        context: { entryId },
        retry: true,
      },
    );

    return { entryId };
  },
});
