import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { KnowledgeBackfillTable } from "./backfillPlan";

const pageRow = v.object({
  entryId: v.string(),
  ragEntryId: v.optional(v.string()),
  status: v.optional(v.string()),
  parentId: v.optional(v.string()),
});

export const listKnowledgePage = internalQuery({
  args: {
    table: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("web"),
      v.literal("qa"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(pageRow),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const table = knowledgeTable(args.table);
    const result = await ctx.db.query(table).order("asc").paginate(args.paginationOpts);
    return {
      page: result.page.map((row) => ({
        entryId: row._id,
        ragEntryId: row.ragEntryId,
        status: row.status,
        parentId: "parentId" in row ? row.parentId : undefined,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

function knowledgeTable(table: KnowledgeBackfillTable) {
  if (table === "text") return "textEntries" as const;
  if (table === "file") return "fileEntries" as const;
  if (table === "web") return "webEntries" as const;
  return "qaEntries" as const;
}
