import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";

function scopeKeys(summary: Doc<"inboxConversationSummaries"> | null) {
  if (!summary?.isChannelConnected || summary.status !== "requires_user_input") return [];
  const scope = !summary.orgId || summary.orgId === "personal"
    ? ["user", summary.userId, summary.orgId]
    : ["org", summary.orgId];
  return [JSON.stringify(scope), JSON.stringify([...scope, summary.assignedAgentId])];
}

export async function syncEscalationCount(
  ctx: Pick<MutationCtx, "db">,
  summaryId: Doc<"inboxConversationSummaries">["_id"],
  summary: Doc<"inboxConversationSummaries"> | null,
) {
  const membership = await ctx.db.query("inboxEscalationCountMemberships")
    .withIndex("by_summaryId", (q) => q.eq("summaryId", summaryId)).unique();
  const previousKeys = membership?.scopeKeys ?? [];
  const nextKeys = [...new Set(scopeKeys(summary))];
  for (const key of new Set([...previousKeys, ...nextKeys])) {
    const delta = Number(nextKeys.includes(key)) - Number(previousKeys.includes(key));
    if (delta === 0) continue;
    const counter = await ctx.db.query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", key)).unique();
    const count = (counter?.count ?? 0) + delta;
    if (count < 0) throw new Error("Escalation count cannot be negative");
    if (counter) await ctx.db.patch(counter._id, { count });
    else await ctx.db.insert("inboxEscalationCounts", { scopeKey: key, count });
  }
  if (nextKeys.length === 0) {
    if (membership) await ctx.db.delete(membership._id);
  } else if (membership) {
    if (JSON.stringify(previousKeys) !== JSON.stringify(nextKeys)) {
      await ctx.db.patch(membership._id, { scopeKeys: nextKeys });
    }
  } else {
    await ctx.db.insert("inboxEscalationCountMemberships", { summaryId, scopeKeys: nextKeys });
  }
}

export const getForCurrentOrg = query({
  args: { agentId: v.optional(v.id("agents")) },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const ready = await ctx.db.query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", "backfill-complete")).unique();
    if (!ready) return null;
    const scope = !orgId || orgId === "personal" ? ["user", userId, orgId] : ["org", orgId];
    const scopeKey = JSON.stringify(args.agentId === undefined ? scope : [...scope, args.agentId]);
    const counter = await ctx.db.query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", scopeKey)).unique();
    return counter?.count ?? 0;
  },
});

export const backfill = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("inboxConversationSummaries")
      .paginate({ cursor: args.cursor, numItems: 100 });
    for (const summary of page.page) await syncEscalationCount(ctx, summary._id, summary);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.inboxEscalationCounts.backfill, { cursor: page.continueCursor });
    } else {
      const ready = await ctx.db.query("inboxEscalationCounts")
        .withIndex("by_scopeKey", (q) => q.eq("scopeKey", "backfill-complete")).unique();
      if (!ready) await ctx.db.insert("inboxEscalationCounts", { scopeKey: "backfill-complete", count: 0 });
    }
    return null;
  },
});
