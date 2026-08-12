import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { constantTimeDigestEqual } from "./channelToken";

const connectionStateValidator = v.union(
  v.literal("connected"),
  v.literal("syncing"),
);

const resourceStateValidator = v.union(
  v.literal("sync"),
  v.literal("exists"),
  v.literal("not_exists"),
);

const syncWorker = (internal as unknown as {
  googleCalendar: {
    syncWorker: {
      run: FunctionReference<"action", "internal", { connectionId: Id<"googleCalendarConnections"> }, unknown>;
    };
  };
}).googleCalendar.syncWorker.run;

export const acceptNotification = internalMutation({
  args: {
    channelId: v.string(),
    tokenHash: v.string(),
    resourceId: v.string(),
    resourceState: resourceStateValidator,
    messageNumber: v.number(),
    headerExpirationAt: v.number(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("accepted") }),
    v.object({ kind: v.literal("duplicate") }),
    v.object({ kind: v.literal("rejected") }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("googleCalendarWatchChannels")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .unique();
    if (channel === null || channel.expirationAt <= args.now) {
      return { kind: "rejected" as const };
    }
    const pendingInitialSync = channel.state === "pending" && args.resourceState === "sync";
    const activeNotification = channel.state === "active";
    const activeExpirationMatches = Math.abs(channel.expirationAt - args.headerExpirationAt) < 1_000;
    if (
      (!pendingInitialSync && !activeNotification) ||
      !constantTimeDigestEqual(channel.tokenHash, args.tokenHash) ||
      (activeNotification && channel.resourceId !== args.resourceId) ||
      (activeNotification && !activeExpirationMatches) ||
      args.headerExpirationAt <= args.now
    ) {
      return { kind: "rejected" as const };
    }
    const connection = await ctx.db.get(channel.connectionId);
    if (
      connection === null ||
      (connection.state !== "connected" && connection.state !== "syncing")
    ) {
      return { kind: "rejected" as const };
    }
    if (
      channel.lastMessageNumber !== undefined &&
      args.messageNumber <= channel.lastMessageNumber
    ) {
      return { kind: "duplicate" as const };
    }
    await ctx.db.patch(channel._id, {
      lastMessageNumber: args.messageNumber,
      updatedAt: args.now,
    });
    await ctx.db.patch(connection._id, {
      dirtyGeneration: connection.dirtyGeneration + 1,
      updatedAt: args.now,
    });
    await ctx.scheduler.runAfter(0, syncWorker, {
      connectionId: connection._id,
    });
    return { kind: "accepted" as const };
  },
});

export const getConnectionForWatch = internalQuery({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: v.object({
    connectionId: v.id("googleCalendarConnections"),
    workosUserId: v.string(),
    state: connectionStateValidator,
  }),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (
      connection === null ||
      (connection.state !== "connected" && connection.state !== "syncing")
    ) {
      throw new Error("Google Calendar connection is not watchable");
    }
    return {
      connectionId: connection._id,
      workosUserId: connection.workosUserId,
      state: connection.state,
    };
  },
});

export const reservePendingWatch = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    channelId: v.string(),
    tokenHash: v.string(),
    pendingExpirationAt: v.number(),
    replacingChannelId: v.optional(v.id("googleCalendarWatchChannels")),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("reserved"), channelId: v.id("googleCalendarWatchChannels") }),
    v.object({ kind: v.literal("existing"), channelId: v.id("googleCalendarWatchChannels") }),
    v.object({ kind: v.literal("superseded") }),
  ),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (
      connection === null ||
      (connection.state !== "connected" && connection.state !== "syncing")
    ) {
      throw new Error("Google Calendar connection is not watchable");
    }
    if (
      args.replacingChannelId !== undefined &&
      connection.activeWatchChannelId !== args.replacingChannelId
    ) {
      return { kind: "superseded" as const };
    }
    if (
      args.replacingChannelId === undefined &&
      connection.activeWatchChannelId !== undefined
    ) {
      return { kind: "existing" as const, channelId: connection.activeWatchChannelId };
    }
    const pendingRows = await ctx.db
      .query("googleCalendarWatchChannels")
      .withIndex("by_connectionId_and_state_and_expirationAt", (q) =>
        q.eq("connectionId", connection._id).eq("state", "pending"),
      )
      .take(10);
    for (const pending of pendingRows) {
      if (pending.expirationAt > args.now) {
        return { kind: "existing" as const, channelId: pending._id };
      }
      await ctx.db.patch(pending._id, { state: "expired", updatedAt: args.now });
    }
    const duplicate = await ctx.db
      .query("googleCalendarWatchChannels")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .unique();
    if (duplicate !== null) throw new Error("Google Calendar channel ID already exists");
    const channelId = await ctx.db.insert("googleCalendarWatchChannels", {
      connectionId: connection._id,
      channelId: args.channelId,
      resourceId: "",
      resourceUri: "",
      tokenHash: args.tokenHash,
      expirationAt: args.pendingExpirationAt,
      state: "pending",
      createdAt: args.now,
      updatedAt: args.now,
    });
    return { kind: "reserved" as const, channelId };
  },
});

export const getChannelForStop = internalQuery({
  args: { channelId: v.id("googleCalendarWatchChannels") },
  returns: v.object({
    channelId: v.id("googleCalendarWatchChannels"),
    connectionId: v.id("googleCalendarConnections"),
    externalChannelId: v.string(),
    resourceId: v.string(),
    expirationAt: v.number(),
    state: v.union(v.literal("active"), v.literal("retiring"), v.literal("retired"), v.literal("expired"), v.literal("pending")),
    workosUserId: v.string(),
  }),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) throw new Error("Google Calendar watch channel not found");
    const connection = await ctx.db.get(channel.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    return {
      channelId: channel._id,
      connectionId: connection._id,
      externalChannelId: channel.channelId,
      resourceId: channel.resourceId,
      expirationAt: channel.expirationAt,
      state: channel.state,
      workosUserId: connection.workosUserId,
    };
  },
});

export const markWatchStopped = internalMutation({
  args: {
    channelId: v.id("googleCalendarWatchChannels"),
    state: v.union(v.literal("retired"), v.literal("expired")),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (channel === null) return null;
    await ctx.db.patch(channel._id, { state: args.state, updatedAt: args.now });
    const connection = await ctx.db.get(channel.connectionId);
    if (connection?.activeWatchChannelId === channel._id) {
      await ctx.db.patch(connection._id, { activeWatchChannelId: undefined, updatedAt: args.now });
    }
    return null;
  },
});
