import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const append = internalMutation({
  args: {
    consentId: v.string(),
    orgId: v.string(),
    operation: v.string(),
    outcome: v.string(),
    requestId: v.string(),
    durationMs: v.number(),
    resultCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("integrationAudit", { ...args, createdAt: Date.now() });
    return null;
  },
});
export const cleanup = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("integrationAudit")
      .withIndex("by_createdAt", (q) =>
        q.lt("createdAt", Date.now() - 30 * 86400000),
      )
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === 200)
      await ctx.scheduler.runAfter(0, internal.integrations.audit.cleanup, {});
    return rows.length;
  },
});
