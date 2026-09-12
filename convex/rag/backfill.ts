"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { indexFileEntry, indexQaEntry, indexTextEntry } from "./backfillIndex";
import { shouldBackfillRow, type KnowledgeBackfillTable } from "./backfillPlan";
import { rerunParentWebsite } from "./backfillWeb";

const PAGE_SIZE = 8;
const TABLES: KnowledgeBackfillTable[] = ["text", "file", "web", "qa"];

export const start = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const table of TABLES) {
      await ctx.scheduler.runAfter(0, internal.rag.backfill.backfillTable, {
        table,
        cursor: null,
      });
    }
    return null;
  },
});

export const backfillTable = internalAction({
  args: {
    table: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("web"),
      v.literal("qa"),
    ),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.runQuery(internal.rag.backfillPage.listKnowledgePage, {
      table: args.table,
      paginationOpts: { numItems: PAGE_SIZE, cursor: args.cursor },
    });

    for (const row of page.page) {
      if (!shouldBackfillRow(args.table, row)) continue;
      try {
        if (args.table === "text") await indexTextEntry(ctx, row.entryId);
        else if (args.table === "qa") await indexQaEntry(ctx, row.entryId);
        else if (args.table === "file") await indexFileEntry(ctx, row.entryId);
        else await rerunParentWebsite(ctx, row.entryId);
      } catch (error) {
        console.error("[convex-rag] backfill failed", {
          table: args.table,
          entryId: row.entryId,
          error: error instanceof Error ? error.message : String(error),
        });
        await ctx.runMutation(internal.knowledgeBase.internalSetStatus, {
          entryId: row.entryId as never,
          status: "failed",
        });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.rag.backfill.backfillTable, {
        table: args.table,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
