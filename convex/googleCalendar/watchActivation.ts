import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

export const activatePendingWatch = internalMutation({
  args: {
    pendingChannelId: v.id("googleCalendarWatchChannels"),
    expectedChannelId: v.string(),
    resourceId: v.string(),
    resourceUri: v.string(),
    expirationAt: v.number(),
    replacingChannelId: v.optional(v.id("googleCalendarWatchChannels")),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("activated"), retiringChannelId: v.optional(v.id("googleCalendarWatchChannels")) }),
    v.object({ kind: v.literal("superseded") }),
  ),
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingChannelId);
    if (pending === null || pending.channelId !== args.expectedChannelId) {
      throw new Error("Google Calendar pending watch changed before activation");
    }
    if (pending.state !== "pending" || args.expirationAt <= args.now) {
      if (pending.state === "active") {
        const connection = await ctx.db.get(pending.connectionId);
        if (
          (connection?.state === "connected" || connection?.state === "syncing") &&
          connection.activeWatchChannelId === pending._id
        ) {
          return { kind: "activated" as const };
        }
        if (connection?.activeWatchChannelId === pending._id) {
          await ctx.db.patch(connection._id, { activeWatchChannelId: undefined, updatedAt: args.now });
        }
      }
      await ctx.db.patch(pending._id, {
        resourceId: args.resourceId,
        resourceUri: args.resourceUri,
        expirationAt: args.expirationAt,
        state: "retiring",
        updatedAt: args.now,
      });
      return { kind: "superseded" as const };
    }
    const connection = await ctx.db.get(pending.connectionId);
    if (
      connection === null ||
      (connection.state !== "connected" && connection.state !== "syncing") ||
      connection.activeWatchChannelId !== args.replacingChannelId
    ) {
      await ctx.db.patch(pending._id, {
        resourceId: args.resourceId,
        resourceUri: args.resourceUri,
        expirationAt: args.expirationAt,
        state: "retiring",
        updatedAt: args.now,
      });
      return { kind: "superseded" as const };
    }
    let retiringChannelId: Id<"googleCalendarWatchChannels"> | undefined;
    if (args.replacingChannelId !== undefined) {
      const replaced = await ctx.db.get(args.replacingChannelId);
      if (replaced === null || replaced.connectionId !== connection._id) {
        throw new Error("Google Calendar replacement channel is invalid");
      }
      if (replaced.expirationAt <= args.now) {
        await ctx.db.patch(replaced._id, { state: "expired", updatedAt: args.now });
      } else {
        retiringChannelId = replaced._id;
        await ctx.db.patch(replaced._id, { state: "retiring", updatedAt: args.now });
      }
    }
    await ctx.db.patch(pending._id, {
      resourceId: args.resourceId,
      resourceUri: args.resourceUri,
      expirationAt: args.expirationAt,
      state: "active",
      updatedAt: args.now,
    });
    await ctx.db.patch(connection._id, { activeWatchChannelId: pending._id, updatedAt: args.now });
    return { kind: "activated" as const, retiringChannelId };
  },
});
