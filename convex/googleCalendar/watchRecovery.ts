import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const recordUnactivatedWatch = internalMutation({
  args: {
    pendingChannelId: v.id("googleCalendarWatchChannels"),
    expectedChannelId: v.string(),
    resourceId: v.string(),
    resourceUri: v.string(),
    expirationAt: v.number(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("active") }),
    v.object({ kind: v.literal("recoverable") }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.pendingChannelId);
    if (channel === null || channel.channelId !== args.expectedChannelId) {
      throw new Error("Google Calendar pending watch changed before recovery");
    }
    if (channel.state === "active") {
      const connection = await ctx.db.get(channel.connectionId);
      if (
        (connection?.state === "connected" || connection?.state === "syncing") &&
        connection.activeWatchChannelId === channel._id
      ) {
        return { kind: "active" as const };
      }
      if (connection?.activeWatchChannelId === channel._id) {
        await ctx.db.patch(connection._id, {
          activeWatchChannelId: undefined,
          updatedAt: args.now,
        });
      }
    }
    if (
      (channel.resourceId.length > 0 && channel.resourceId !== args.resourceId) ||
      (channel.resourceUri.length > 0 && channel.resourceUri !== args.resourceUri)
    ) {
      throw new Error("Google Calendar recovering watch resource changed");
    }
    await ctx.db.patch(channel._id, {
      resourceId: args.resourceId,
      resourceUri: args.resourceUri,
      expirationAt: args.expirationAt,
      state: "retiring",
      updatedAt: args.now,
    });
    return { kind: "recoverable" as const };
  },
});
