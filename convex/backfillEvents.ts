import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const backfillExistingEventsOrgId = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
    const page = await ctx.db
      .query("creditUsageEvents")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: batchSize,
      });

    let updated = 0;
    let skipped = 0;

    for (const event of page.page) {
      if (event.orgId !== undefined) {
        skipped += 1;
        continue;
      }

      // Find the corresponding creditLog to get orgId
      let orgId = "";
      if (event.creditLogId) {
        const log = await ctx.db.get(event.creditLogId);
        if (log && log.orgId !== undefined) {
          orgId = log.orgId;
        }
      }

      // If still not found, try looking up via agentId
      if (!orgId && event.agentId) {
        const agent = await ctx.db.get(event.agentId);
        if (agent && agent.orgId !== undefined) {
          orgId = agent.orgId;
        }
      }

      await ctx.db.patch(event._id, { orgId });
      updated += 1;
    }

    return {
      updated,
      skipped,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
