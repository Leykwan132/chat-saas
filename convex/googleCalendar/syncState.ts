import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { googleCalendarErrorKindValidator, googleCalendarSyncRequestKindValidator } from "./contracts";
import { SYNC_RUN_LEASE_MS } from "./constants";
import { ownedSyncRun } from "./syncOwnership";

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
    let currentRun = connection.activeSyncRunId === undefined
      ? undefined
      : await ctx.db.get(connection.activeSyncRunId);
    if (currentRun !== undefined && currentRun !== null && currentRun.connectionId !== connection._id) {
      throw new Error("Google Calendar active sync run belongs to another connection");
    }
    if (currentRun === undefined && connection.state === "syncing") {
      const legacyRuns = await ctx.db
        .query("googleCalendarSyncRuns")
        .withIndex("by_connectionId_and_state", (q) =>
          q.eq("connectionId", args.connectionId).eq("state", "running"),
        )
        .take(2);
      if (legacyRuns.length > 1) throw new Error("Google Calendar connection has multiple active sync runs");
      currentRun = legacyRuns[0];
    }
    if (
      currentRun !== undefined && currentRun !== null && currentRun.state === "running" &&
      args.now - currentRun.updatedAt <= SYNC_RUN_LEASE_MS
    ) {
      await ctx.db.patch(connection._id, {
        activeSyncRunId: currentRun._id,
        dirtyGeneration: connection.dirtyGeneration + 1,
        updatedAt: args.now,
      });
      return { kind: "already_running" as const };
    }
    if (currentRun !== undefined && currentRun !== null && currentRun.state === "running") {
      await ctx.db.patch(currentRun._id, {
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
      activeSyncRunId: runId,
      lastSyncAttemptedAt: args.now,
      updatedAt: args.now,
    });
    return { kind: "started" as const, runId };
  },
});

export const renewSyncRunLease = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("renewed") }),
    v.object({ kind: v.literal("lost") }),
  ),
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    await ctx.db.patch(owned.run._id, { updatedAt: args.now });
    return { kind: "renewed" as const };
  },
});

export const finalizeSyncRun = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    syncToken: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("finalized"), dirty: v.boolean() }),
    v.object({ kind: v.literal("lost") }),
  ),
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    await ctx.db.patch(run._id, { state: "completed", candidateSyncToken: args.syncToken, completedAt: args.now, updatedAt: args.now });
    await ctx.db.patch(connection._id, {
      state: "connected",
      activeSyncRunId: undefined,
      syncToken: args.syncToken,
      fullSyncStartAt: run.requestKind === "full" ? run.fullSyncStartAt : connection.fullSyncStartAt,
      fullSyncEndAt: run.requestKind === "full" ? run.fullSyncEndAt : connection.fullSyncEndAt,
      lastSuccessfulSyncAt: args.now,
      lastErrorKind: undefined,
      updatedAt: args.now,
    });
    return { kind: "finalized" as const, dirty: connection.dirtyGeneration > run.dirtyGeneration };
  },
});

export const failSyncRun = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    errorKind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("failed") }),
    v.object({ kind: v.literal("lost") }),
  ),
  handler: async (ctx, args) => {
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    await ctx.db.patch(run._id, { state: "failed", errorKind: args.errorKind, completedAt: args.now, updatedAt: args.now });
    await ctx.db.patch(connection._id, {
      state: args.errorKind === "needs_reauthorization" ? "needs_reauthorization" : "connected",
      activeSyncRunId: undefined,
      lastErrorKind: args.errorKind,
      updatedAt: args.now,
    });
    return { kind: "failed" as const };
  },
});
