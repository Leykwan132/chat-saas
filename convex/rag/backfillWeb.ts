"use node";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { cfDeletePool, webScraperPool } from "../workpool";
import { shouldRerunParentWebsite } from "./backfillPlan";
import { dropLegacyCfItem } from "./backfillIndex";

export async function rerunParentWebsite(ctx: ActionCtx, entryId: string) {
  const entry = await ctx.runQuery(internal.knowledgeBase.internalGetWebEntry, {
    entryId: entryId as never,
  });
  if (!entry || !shouldRerunParentWebsite(entry)) return;

  const children = await ctx.runQuery(
    internal.knowledgeBase.internalGetWebEntriesByParentId,
    { parentId: entryId as never },
  );
  for (const child of children) {
    await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
      entryId: child._id,
      status: "deleting",
    });
    await cfDeletePool.enqueueAction(
      ctx,
      internal.workpool.cfDeleteWorker,
      {
        cfItemId: child.cfItemId,
        ragEntryId: child.ragEntryId,
        r2Key: child.markdownR2Key,
      },
      {
        onComplete: internal.knowledgeBase.cfDeleteComplete,
        context: { entryId: child._id, entryType: "web" },
        retry: true,
      },
    );
  }

  await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
    entryId: entryId as never,
    status: "gettingLinks",
  });
  await webScraperPool.enqueueAction(
    ctx,
    internal.webResearch.worker.researchWebsite,
    {
      entryId,
      url: entry.url,
      agentId: entry.agentId,
      orgId: entry.orgId,
    },
    {
      onComplete: internal.knowledgeBase.webScraperComplete,
      context: { entryId },
      retry: true,
    },
  );
  await dropLegacyCfItem(ctx, entry.cfItemId);
}
