import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery } from "../_generated/server";
import { GOOGLE_CALENDAR_PROVIDER } from "./constants";
import {
  googleCalendarConnectionStateValidator,
  googleCalendarErrorKindValidator,
} from "./contracts";
import { deleteParticipants } from "../calendarEventsHelpers";

const connectionSnapshotValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("googleCalendarConnections"),
    userId: v.id("users"),
    workosUserId: v.string(),
    state: googleCalendarConnectionStateValidator,
    lastSuccessfulSyncAt: v.optional(v.number()),
    lastErrorKind: v.optional(googleCalendarErrorKindValidator),
    timeZone: v.string(),
    activeWatchChannelId: v.optional(v.id("googleCalendarWatchChannels")),
  }),
);

type PurgeRefs = {
  connectionLifecycle: {
    purgeImportedGoogleEvents: FunctionReference<
      "mutation",
      "internal",
      { userId: Id<"users">; now: number },
      null
    >;
  };
};

const refs: PurgeRefs = (internal as unknown as { googleCalendar: PurgeRefs }).googleCalendar;

export const getFallbackTimeZone = internalQuery({
  args: { teamId: v.id("teams") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    const timeZone = team?.timeZone?.trim();
    return timeZone && timeZone.length > 0 ? timeZone : "UTC";
  },
});

export const getForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: connectionSnapshotValidator,
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (connection === null) return null;
    return {
      _id: connection._id,
      userId: connection.userId,
      workosUserId: connection.workosUserId,
      state: connection.state,
      ...(connection.lastSuccessfulSyncAt === undefined
        ? {}
        : { lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt }),
      ...(connection.lastErrorKind === undefined ? {} : { lastErrorKind: connection.lastErrorKind }),
      timeZone: connection.timeZone,
      ...(connection.activeWatchChannelId === undefined
        ? {}
        : { activeWatchChannelId: connection.activeWatchChannelId }),
    };
  },
});

export const ensureSyncing = internalMutation({
  args: {
    userId: v.id("users"),
    timeZone: v.string(),
    now: v.number(),
  },
  returns: v.id("googleCalendarConnections"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user === null) throw new Error("User not found");
    const existing = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        state: "syncing",
        timeZone: args.timeZone,
        lastErrorKind: undefined,
        updatedAt: args.now,
      });
      return existing._id;
    }
    return await ctx.db.insert("googleCalendarConnections", {
      userId: user._id,
      workosUserId: user.workosUserId,
      provider: GOOGLE_CALENDAR_PROVIDER,
      primaryCalendarId: "primary",
      timeZone: args.timeZone,
      state: "syncing",
      dirtyGeneration: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
  },
});

export const markNeedsReauthorization = internalMutation({
  args: { userId: v.id("users"), now: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user === null) throw new Error("User not found");
    const existing = await ctx.db
      .query("googleCalendarConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing === null) {
      await ctx.db.insert("googleCalendarConnections", {
        userId: user._id,
        workosUserId: user.workosUserId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        primaryCalendarId: "primary",
        timeZone: "UTC",
        state: "needs_reauthorization",
        lastErrorKind: "needs_reauthorization",
        dirtyGeneration: 0,
        createdAt: args.now,
        updatedAt: args.now,
      });
      return null;
    }
    await ctx.db.patch(existing._id, {
      state: "needs_reauthorization",
      lastErrorKind: "needs_reauthorization",
      updatedAt: args.now,
    });
    return null;
  },
});

export const markReconcileFailed = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    errorKind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    await ctx.db.patch(connection._id, {
      state: "syncing",
      lastErrorKind: args.errorKind,
      updatedAt: args.now,
    });
    return null;
  },
});

export const markDisconnected = internalMutation({
  args: { connectionId: v.id("googleCalendarConnections"), now: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) return null;
    await ctx.db.patch(connection._id, {
      state: "disconnected",
      syncToken: undefined,
      activeSyncRunId: undefined,
      activeWatchChannelId: undefined,
      lastErrorKind: undefined,
      updatedAt: args.now,
    });
    return null;
  },
});

export const purgeImportedGoogleEvents = internalMutation({
  args: { userId: v.id("users"), now: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalOwnerUserId_and_externalOrigin", (q) =>
        q.eq("externalOwnerUserId", args.userId).eq("externalOrigin", "google"),
      )
      .take(40);
    for (const event of events) {
      await deleteParticipants(ctx, event._id);
      await ctx.db.delete(event._id);
    }
    if (events.length === 40) {
      await ctx.scheduler.runAfter(0, refs.connectionLifecycle.purgeImportedGoogleEvents, {
        userId: args.userId,
        now: args.now,
      });
    }
    return null;
  },
});
