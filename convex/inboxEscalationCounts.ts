import {
  inboxCountScope,
  sidebarCountKeys,
  sidebarCountPrefix,
} from "./inboxSidebarCountKeys";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext } from "./authUtils";

function scopeKeys(summary: Doc<"inboxConversationSummaries"> | null) {
  if (!summary?.isChannelConnected || summary.status !== "requires_user_input")
    return [];
  const scope =
    !summary.orgId || summary.orgId === "personal"
      ? ["user", summary.userId, summary.orgId]
      : ["org", summary.orgId];
  return [
    JSON.stringify(scope),
    JSON.stringify([...scope, summary.assignedAgentId]),
  ];
}

export async function syncEscalationCount(
  ctx: Pick<MutationCtx, "db">,
  summaryId: Doc<"inboxConversationSummaries">["_id"],
  summary: Doc<"inboxConversationSummaries"> | null,
) {
  const membership = await ctx.db
    .query("inboxEscalationCountMemberships")
    .withIndex("by_summaryId", (q) => q.eq("summaryId", summaryId))
    .unique();
  const previousKeys = membership?.scopeKeys ?? [];
  const nextKeys = [
    ...new Set([...scopeKeys(summary), ...sidebarCountKeys(summary)]),
  ];
  for (const key of new Set([...previousKeys, ...nextKeys])) {
    const delta =
      Number(nextKeys.includes(key)) - Number(previousKeys.includes(key));
    if (delta === 0) continue;
    const counter = await ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", key))
      .unique();
    const count = (counter?.count ?? 0) + delta;
    if (count < 0) throw new Error("Escalation count cannot be negative");
    if (counter && count === 0) await ctx.db.delete(counter._id);
    else if (counter) await ctx.db.patch(counter._id, { count });
    else await ctx.db.insert("inboxEscalationCounts", { scopeKey: key, count });
  }
  if (nextKeys.length === 0) {
    if (membership) await ctx.db.delete(membership._id);
  } else if (membership) {
    if (JSON.stringify(previousKeys) !== JSON.stringify(nextKeys)) {
      await ctx.db.patch(membership._id, { scopeKeys: nextKeys });
    }
  } else {
    await ctx.db.insert("inboxEscalationCountMemberships", {
      summaryId,
      scopeKeys: nextKeys,
    });
  }
}

export const getForCurrentOrg = query({
  args: { agentId: v.optional(v.id("agents")) },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const ready = await ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", "backfill-complete"))
      .unique();
    if (!ready) return null;
    const scope =
      !orgId || orgId === "personal" ? ["user", userId, orgId] : ["org", orgId];
    const scopeKey = JSON.stringify(
      args.agentId === undefined ? scope : [...scope, args.agentId],
    );
    const counter = await ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", scopeKey))
      .unique();
    return counter?.count ?? 0;
  },
});

export const backfill = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("inboxConversationSummaries")
      .paginate({ cursor: args.cursor, numItems: 100 });
    for (const summary of page.page)
      await syncEscalationCount(ctx, summary._id, summary);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.inboxEscalationCounts.backfill, {
        cursor: page.continueCursor,
      });
    } else {
      const ready = await ctx.db
        .query("inboxEscalationCounts")
        .withIndex("by_scopeKey", (q) => q.eq("scopeKey", "backfill-complete"))
        .unique();
      if (!ready)
        await ctx.db.insert("inboxEscalationCounts", {
          scopeKey: "backfill-complete",
          count: 0,
        });
      const sidebarReady = await ctx.db
        .query("inboxEscalationCounts")
        .withIndex("by_scopeKey", (q) =>
          q.eq("scopeKey", "sidebar-backfill-complete"),
        )
        .unique();
      if (!sidebarReady)
        await ctx.db.insert("inboxEscalationCounts", {
          scopeKey: "sidebar-backfill-complete",
          count: 0,
        });
      const snapshotReady = await ctx.db
        .query("inboxEscalationCounts")
        .withIndex("by_scopeKey", (q) =>
          q.eq("scopeKey", "snapshot-backfill-complete"),
        )
        .unique();
      if (!snapshotReady)
        await ctx.db.insert("inboxEscalationCounts", {
          scopeKey: "snapshot-backfill-complete",
          count: 0,
        });
    }
    return null;
  },
});

export const getSidebarCounts = query({
  args: { agentId: v.optional(v.id("agents")) },
  returns: v.union(
    v.null(),
    v.object({
      all: v.number(),
      unread: v.number(),
      assigned_me: v.number(),
      unassigned: v.number(),
      escalated: v.number(),
      booking: v.number(),
      byPlatform: v.record(v.string(), v.number()),
      byLead: v.record(v.string(), v.number()),
      byTag: v.array(v.object({ tag: v.string(), count: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const ready = await ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) =>
        q.eq("scopeKey", "sidebar-backfill-complete"),
      )
      .unique();
    if (!ready) return null;
    const scope = inboxCountScope(orgId, userId);
    const prefix = sidebarCountPrefix(
      args.agentId === undefined ? scope : [...scope, args.agentId],
    );
    const counts = {
      all: 0,
      unread: 0,
      assigned_me: 0,
      unassigned: 0,
      escalated: 0,
      booking: 0,
      byPlatform: {} as Record<string, number>,
      byLead: {} as Record<string, number>,
      byTag: [] as { tag: string; count: number }[],
    };
    for await (const counter of ctx.db
      .query("inboxEscalationCounts")
      .withIndex("by_scopeKey", (q) =>
        q.gte("scopeKey", prefix).lt("scopeKey", `${prefix}\uffff`),
      )) {
      const [metric, value] = JSON.parse(
        counter.scopeKey.slice(prefix.length),
      ) as [string, string];
      if (metric === "assigned") {
        if (value === userId) counts.assigned_me = counter.count;
      } else if (metric === "byTag") {
        if (counter.count > 0)
          counts.byTag.push({ tag: value, count: counter.count });
      } else if (metric === "byPlatform" || metric === "byLead") {
        if (counter.count > 0) counts[metric][value] = counter.count;
      } else if (
        metric === "all" ||
        metric === "unread" ||
        metric === "unassigned" ||
        metric === "escalated" ||
        metric === "booking"
      ) {
        counts[metric] = counter.count;
      }
    }
    return counts;
  },
});
