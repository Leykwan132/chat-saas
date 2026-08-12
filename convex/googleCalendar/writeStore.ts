import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  googleCalendarOperationError,
  googleCalendarOperationResultValidator,
  googleCalendarWriteActionValidator,
} from "./contracts";

const preparedWriteValidator = v.union(
  v.object({ kind: v.literal("error"), result: googleCalendarOperationResultValidator }),
  v.object({
    kind: v.literal("reserved"),
    operationId: v.id("googleCalendarWriteOperations"),
    workosUserId: v.string(),
    timeZone: v.string(),
    externalEventId: v.string(),
    payloadPreconditionEtag: v.union(v.string(), v.null()),
  }),
);

const attemptValidator = v.union(
  v.object({ kind: v.literal("error"), result: googleCalendarOperationResultValidator }),
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("running") }),
  v.object({
    kind: v.literal("ready"),
    attemptGeneration: v.number(),
    intendedEtag: v.optional(v.string()),
  }),
);

export const reserve = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.optional(v.id("calendarEvents")),
    operationKey: v.string(),
    action: googleCalendarWriteActionValidator,
  },
  returns: v.id("googleCalendarWriteOperations"),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleCalendarWriteOperations")
      .withIndex("by_operationKey", (q) => q.eq("operationKey", args.operationKey)).unique();
    if (existing !== null) {
      if (
        existing.connectionId !== args.connectionId ||
        existing.calendarEventId !== args.calendarEventId || existing.action !== args.action
      ) throw new Error("Google Calendar operation key is already reserved for another write");
      return existing._id;
    }
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    const now = Date.now();
    return await ctx.db.insert("googleCalendarWriteOperations", {
      connectionId: connection._id,
      calendarEventId: args.calendarEventId,
      operationKey: args.operationKey,
      action: args.action,
      state: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

function unhealthyConnectionResult(connection: Doc<"googleCalendarConnections">) {
  if (connection.state === "disconnected") return googleCalendarOperationError("not_connected");
  if (connection.state === "needs_reauthorization") return googleCalendarOperationError("needs_reauthorization");
  if (connection.lastErrorKind === "needs_reauthorization" || connection.lastErrorKind === "forbidden") {
    return googleCalendarOperationError("needs_reauthorization");
  }
  if (connection.lastErrorKind === "retryable" || connection.lastErrorKind === "failed") {
    return googleCalendarOperationError("retryable");
  }
  return null;
}

async function eventIsOwned(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
  connection: Doc<"googleCalendarConnections">,
  action: "create" | "update" | "delete",
  externalEventId?: string,
) {
  const membership = await ctx.db.query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", connection.userId).eq("teamId", event.teamId),
    ).unique();
  if (
    membership === null || event.externalProvider !== "google" ||
    event.externalCalendarId !== "primary" || event.externalOwnerUserId !== connection.userId
  ) return false;
  if (action === "create") {
    return event.externalOrigin === "kilobot" &&
      (event.externalEventId === undefined || event.externalEventId === externalEventId);
  }
  return event.externalEventId !== undefined && event.externalCanEdit === true;
}

export const prepare = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.id("calendarEvents"),
    operationKey: v.string(),
    action: googleCalendarWriteActionValidator,
    externalEventId: v.optional(v.string()),
    now: v.number(),
  },
  returns: preparedWriteValidator,
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection === null || args.operationKey.trim().length === 0) {
      return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    }
    const event = await ctx.db.get(args.calendarEventId);
    if (event === null || !await eventIsOwned(ctx, event, connection, args.action, args.externalEventId)) {
      return { kind: "error" as const, result: googleCalendarOperationError("forbidden") };
    }
    const expectedExternalId = args.action === "create" ? args.externalEventId : event.externalEventId;
    if (expectedExternalId === undefined) {
      return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    }
    const existing = await ctx.db.query("googleCalendarWriteOperations")
      .withIndex("by_operationKey", (q) => q.eq("operationKey", args.operationKey)).unique();
    if (existing !== null && (
      existing.connectionId !== connection._id || existing.calendarEventId !== event._id ||
      existing.action !== args.action || existing.externalEventId !== expectedExternalId
    )) {
      return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    }
    if (existing !== null && existing.payloadBindingVersion !== 1) {
      return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    }
    let precondition: string | null;
    if (existing === null) {
      precondition = event.externalEtag ?? null;
    } else {
      if (existing.payloadPreconditionEtag === undefined) {
        return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
      }
      precondition = existing.payloadPreconditionEtag;
    }
    const operationId = existing?._id ?? await ctx.db.insert("googleCalendarWriteOperations", {
      connectionId: connection._id,
      calendarEventId: event._id,
      operationKey: args.operationKey,
      action: args.action,
      state: "pending",
      externalEventId: expectedExternalId,
      payloadBindingVersion: 1,
      payloadPreconditionEtag: precondition,
      intendedEtag: event.externalEtag ?? null,
      attemptGeneration: 0,
      attemptCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
    return {
      kind: "reserved" as const,
      operationId,
      workosUserId: connection.workosUserId,
      timeZone: connection.timeZone,
      externalEventId: expectedExternalId,
      payloadPreconditionEtag: precondition,
    };
  },
});

export const beginAttempt = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    payloadFingerprint: v.string(),
    now: v.number(),
  },
  returns: attemptValidator,
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (
      operation === null || operation.payloadBindingVersion !== 1 ||
      operation.externalEventId === undefined || operation.calendarEventId === undefined
    ) return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    if (
      operation.payloadFingerprint !== undefined &&
      operation.payloadFingerprint !== args.payloadFingerprint
    ) return { kind: "error" as const, result: googleCalendarOperationError("invalid_request") };
    if (operation.state === "succeeded") {
      return { kind: "success" as const, externalEventId: operation.externalEventId };
    }
    if (
      operation.action === "update" && operation.state === "running" &&
      operation.attemptLeaseExpiresAt !== undefined &&
      args.now < operation.attemptLeaseExpiresAt
    ) return { kind: "running" as const };
    const connection = await ctx.db.get(operation.connectionId);
    const event = await ctx.db.get(operation.calendarEventId);
    if (
      connection === null || event === null ||
      !await eventIsOwned(ctx, event, connection, operation.action, operation.externalEventId)
    ) return { kind: "error" as const, result: googleCalendarOperationError("forbidden") };
    const unhealthy = unhealthyConnectionResult(connection);
    if (unhealthy !== null) {
      if (operation.payloadFingerprint === undefined) {
        await ctx.db.patch(operation._id, {
          payloadFingerprint: args.payloadFingerprint,
          updatedAt: args.now,
        });
      }
      return { kind: "error" as const, result: unhealthy };
    }
    const expectedEtag = operation.intendedEtag;
    const etagMatches = operation.action === "create" ||
      event.externalEtag === expectedEtag ||
      (operation.action === "delete" && event.externalEtag === undefined);
    if (!etagMatches) {
      return { kind: "error" as const, result: googleCalendarOperationError("conflict") };
    }
    const attemptGeneration = (operation.attemptGeneration ?? 0) + 1;
    await ctx.db.patch(operation._id, {
      payloadFingerprint: operation.payloadFingerprint ?? args.payloadFingerprint,
      attemptGeneration,
      attemptCount: operation.attemptCount + 1,
      state: "running",
      attemptLeaseExpiresAt: operation.action === "update" ? args.now + 60_000 : undefined,
      errorKind: undefined,
      updatedAt: args.now,
    });
    return {
      kind: "ready" as const,
      attemptGeneration,
      intendedEtag: expectedEtag ?? undefined,
    };
  },
});
