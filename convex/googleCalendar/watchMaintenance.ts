import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const connectionStateValidator = v.union(
  v.literal("connected"),
  v.literal("syncing"),
  v.literal("needs_reauthorization"),
  v.literal("disconnected"),
);

export const listMaintenanceConnectionIds = internalQuery({
  args: { state: connectionStateValidator, paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.id("googleCalendarConnections")), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("googleCalendarConnections")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .paginate(args.paginationOpts);
    return {
      page: page.page.map((connection) => connection._id),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const getWatchMaintenance = internalQuery({
  args: { connectionId: v.id("googleCalendarConnections"), now: v.number() },
  returns: v.object({
    currentChannelId: v.optional(v.id("googleCalendarWatchChannels")),
    activeExpirationAt: v.optional(v.number()),
    hasPending: v.boolean(),
    retiringChannelIds: v.array(v.id("googleCalendarWatchChannels")),
    connectionState: connectionStateValidator,
  }),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    const active = connection.activeWatchChannelId === undefined
      ? null
      : await ctx.db.get(connection.activeWatchChannelId);
    const pending = await ctx.db.query("googleCalendarWatchChannels")
      .withIndex("by_connectionId_and_state_and_expirationAt", (q) =>
        q.eq("connectionId", connection._id).eq("state", "pending"),
      ).take(10);
    const retiring = await ctx.db.query("googleCalendarWatchChannels")
      .withIndex("by_connectionId_and_state_and_expirationAt", (q) =>
        q.eq("connectionId", connection._id).eq("state", "retiring"),
      ).take(10);
    return {
      currentChannelId: active?._id,
      activeExpirationAt: active?.state === "active" ? active.expirationAt : undefined,
      hasPending: pending.some((channel) => channel.expirationAt > args.now),
      retiringChannelIds: retiring.map((channel) => channel._id),
      connectionState: connection.state,
    };
  },
});
