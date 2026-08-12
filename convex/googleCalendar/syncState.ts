import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { googleCalendarErrorKindValidator, googleCalendarSyncRequestKindValidator } from "./contracts";
import { SYNC_RUN_LEASE_MS } from "./constants";

const connectionForSyncValidator = v.object({
  connectionId: v.id("googleCalendarConnections"),
  userId: v.id("users"),
  workosUserId: v.string(),
  primaryCalendarId: v.literal("primary"),
  timeZone: v.string(),
  state: v.union(v.literal("connected"), v.literal("syncing")),
  syncToken: v.optional(v.string()),
  fullSyncStartAt: v.optional(v.number()),
  fullSyncEndAt: v.optional(v.number()),
  dirtyGeneration: v.number(),
});

export const getConnectionForSync = internalQuery({
  args: { connectionId: v.id("googleCalendarConnections") },
  returns: connectionForSyncValidator,
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) {
      throw new Error("Google Calendar connection not found");
    }
    if (connection.state !== "connected" && connection.state !== "syncing") {
      throw new Error("Google Calendar connection is not synchronizable");
    }
    return {
      connectionId: connection._id,
      userId: connection.userId,
      workosUserId: connection.workosUserId,
      primaryCalendarId: connection.primaryCalendarId,
      timeZone: connection.timeZone,
      state: connection.state,
      syncToken: connection.syncToken,
      fullSyncStartAt: connection.fullSyncStartAt,
      fullSyncEndAt: connection.fullSyncEndAt,
      dirtyGeneration: connection.dirtyGeneration,
    };
  },
});

export const markGoogleCalendarDirty = internalMutation({
  args: { connectionId: v.id("googleCalendarConnections"), now: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) {
      throw new Error("Google Calendar connection not found");
    }
    const dirtyGeneration = connection.dirtyGeneration + 1;
    await ctx.db.patch(connection._id, { dirtyGeneration, updatedAt: args.now });
    return dirtyGeneration;
  },
});

export const beginSyncRun = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    requestKind: googleCalendarSyncRequestKindValidator,
    fullSyncStartAt: v.optional(v.number()),
    fullSyncEndAt: v.optional(v.number()),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("already_running") }),
    v.object({ kind: v.literal("started"), runId: v.id("googleCalendarSyncRuns") }),
  ),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    const activeRuns = await ctx.db
      .query("googleCalendarSyncRuns")
      .withIndex("by_connectionId_and_state", (q) =>
        q.eq("connectionId", args.connectionId).eq("state", "running"),
      )
      .take(2);
    const currentRun = activeRuns.find(
      (run) => args.now - run.updatedAt <= SYNC_RUN_LEASE_MS,
    );
    if (currentRun !== undefined) {
      await ctx.db.patch(connection._id, {
        dirtyGeneration: connection.dirtyGeneration + 1,
        updatedAt: args.now,
      });
      return { kind: "already_running" as const };
    }
    for (const staleRun of activeRuns) {
      await ctx.db.patch(staleRun._id, {
        state: "failed",
        errorKind: "retryable",
        completedAt: args.now,
        updatedAt: args.now,
      });
    }
    const runId = await ctx.db.insert("googleCalendarSyncRuns", {
      connectionId: connection._id,
      state: "running",
      requestKind: args.requestKind,
      dirtyGeneration: connection.dirtyGeneration,
      importedCount: 0,
      updatedCount: 0,
      cancelledCount: 0,
      conflictCount: 0,
      fullSyncStartAt: args.fullSyncStartAt,
      fullSyncEndAt: args.fullSyncEndAt,
      startedAt: args.now,
      createdAt: args.now,
      updatedAt: args.now,
    });
    await ctx.db.patch(connection._id, {
      state: "syncing",
      lastSyncAttemptedAt: args.now,
      updatedAt: args.now,
    });
    return { kind: "started" as const, runId };
  },
});

export const finalizeSyncRun = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    syncToken: v.string(),
    now: v.number(),
  },
  returns: v.object({ dirty: v.boolean() }),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    const run = await ctx.db.get(args.runId);
    if (connection === null || run === null || run.connectionId !== connection._id || run.state !== "running") {
      throw new Error("Google Calendar sync run is not active");
    }
    await ctx.db.patch(run._id, { state: "completed", candidateSyncToken: args.syncToken, completedAt: args.now, updatedAt: args.now });
    await ctx.db.patch(connection._id, {
      state: "connected",
      syncToken: args.syncToken,
      fullSyncStartAt: run.requestKind === "full" ? run.fullSyncStartAt : connection.fullSyncStartAt,
      fullSyncEndAt: run.requestKind === "full" ? run.fullSyncEndAt : connection.fullSyncEndAt,
      lastSuccessfulSyncAt: args.now,
      lastErrorKind: undefined,
      updatedAt: args.now,
    });
    return { dirty: connection.dirtyGeneration > run.dirtyGeneration };
  },
});

export const failSyncRun = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    errorKind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    const run = await ctx.db.get(args.runId);
    if (connection === null || run === null || run.connectionId !== connection._id) {
      throw new Error("Google Calendar sync run not found");
    }
    if (run.state === "running") {
      await ctx.db.patch(run._id, { state: "failed", errorKind: args.errorKind, completedAt: args.now, updatedAt: args.now });
    }
    await ctx.db.patch(connection._id, {
      state: args.errorKind === "needs_reauthorization" ? "needs_reauthorization" : "connected",
      lastErrorKind: args.errorKind,
      updatedAt: args.now,
    });
    return null;
  },
});
