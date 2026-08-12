import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  googleCalendarErrorKindValidator,
  googleCalendarOperationError,
  googleCalendarOperationResultValidator,
  googleCalendarWriteActionValidator,
} from "./contracts";
import { mappedGoogleCalendarEventValidator, type MappedGoogleCalendarEvent } from "./eventMapping";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "../calendarAvailabilityIntervals";

const preparedWriteValidator = v.union(
  v.object({ kind: v.literal("error"), result: googleCalendarOperationResultValidator }),
  v.object({
    kind: v.literal("ready"),
    operationId: v.id("googleCalendarWriteOperations"),
    workosUserId: v.string(),
    timeZone: v.string(),
    externalEventId: v.string(),
    knownEtag: v.optional(v.string()),
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

function validOwnedEvent(
  event: Doc<"calendarEvents">,
  connection: Doc<"googleCalendarConnections">,
  action: "create" | "update" | "delete",
  externalEventId?: string,
) {
  if (
    event.externalProvider !== "google" || event.externalCalendarId !== "primary" ||
    event.externalOwnerUserId !== connection.userId
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
    const unhealthy = unhealthyConnectionResult(connection);
    if (unhealthy !== null) return { kind: "error" as const, result: unhealthy };
    const event = await ctx.db.get(args.calendarEventId);
    if (event === null || !validOwnedEvent(event, connection, args.action, args.externalEventId)) {
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
    const operationId = existing?._id ?? await ctx.db.insert("googleCalendarWriteOperations", {
      connectionId: connection._id,
      calendarEventId: event._id,
      operationKey: args.operationKey,
      action: args.action,
      state: "pending",
      externalEventId: expectedExternalId,
      attemptCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
    const attemptCount = (existing?.attemptCount ?? 0) + 1;
    await ctx.db.patch(operationId, { state: "running", errorKind: undefined, attemptCount, updatedAt: args.now });
    return {
      kind: "ready" as const,
      operationId,
      workosUserId: connection.workosUserId,
      timeZone: connection.timeZone,
      externalEventId: expectedExternalId,
      knownEtag: event.externalEtag,
    };
  },
});

function activeEventPatch(event: MappedGoogleCalendarEvent, now: number) {
  if (
    event.status === "cancelled" || event.title === undefined || event.startAt === undefined ||
    event.endAt === undefined || event.timeZone === undefined || event.allDay === undefined
  ) throw new Error("Google Calendar write returned an incomplete event");
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    link: event.link,
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: event.timeZone,
    allDay: event.allDay,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status,
    externalICalUID: event.iCalUID,
    externalEtag: event.etag,
    externalHtmlLink: event.htmlLink,
    externalUpdatedAt: event.updatedAt,
    externalStatus: event.status,
    externalTransparency: event.transparency,
    externalCanEdit: event.canEdit,
    externalSyncState: "synced" as const,
    updatedAt: now,
  };
}

async function ownedOperation(ctx: MutationCtx, operationId: Doc<"googleCalendarWriteOperations">["_id"]) {
  const operation = await ctx.db.get(operationId);
  if (operation === null) throw new Error("Google Calendar write operation not found");
  const connection = await ctx.db.get(operation.connectionId);
  if (connection === null) throw new Error("Google Calendar connection not found");
  const event = operation.calendarEventId === undefined ? null : await ctx.db.get(operation.calendarEventId);
  if (
    event === null || event.externalProvider !== "google" ||
    event.externalCalendarId !== "primary" || event.externalOwnerUserId !== connection.userId
  ) {
    throw new Error("Google Calendar write operation lost event ownership");
  }
  return { operation, connection, event };
}

export const finalizeEvent = internalMutation({
  args: { operationId: v.id("googleCalendarWriteOperations"), event: mappedGoogleCalendarEventValidator, now: v.number() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { operation, connection, event } = await ownedOperation(ctx, args.operationId);
    if (operation.action === "delete" || operation.externalEventId !== args.event.eventId) {
      throw new Error("Google Calendar write finalization does not match its operation");
    }
    await ctx.db.patch(event._id, {
      ...activeEventPatch(args.event, args.now),
      externalEventId: args.event.eventId,
      externalOperationKey: operation.action === "create" ? operation.operationKey : event.externalOperationKey,
    });
    await syncCalendarEventAvailabilityIntervals(ctx, event._id, args.now);
    await ctx.db.patch(operation._id, { state: "succeeded", errorKind: undefined, updatedAt: args.now });
    await ctx.db.patch(connection._id, { lastErrorKind: undefined, updatedAt: args.now });
    return args.event.eventId;
  },
});

export const finalizeDelete = internalMutation({
  args: { operationId: v.id("googleCalendarWriteOperations"), now: v.number() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { operation, connection, event } = await ownedOperation(ctx, args.operationId);
    if (operation.action !== "delete" || operation.externalEventId === undefined) {
      throw new Error("Google Calendar delete finalization does not match its operation");
    }
    if (event.externalOrigin === "kilobot") {
      await ctx.db.patch(event._id, {
        status: "cancelled", externalStatus: "cancelled", externalSyncState: "synced", updatedAt: args.now,
      });
      await syncCalendarEventAvailabilityIntervals(ctx, event._id, args.now);
    } else {
      const participants = await ctx.db.query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id)).take(51);
      if (participants.length > 50) {
        throw new Error("Google Calendar event has too many participants to delete");
      }
      for (const participant of participants) {
        await removeParticipantAvailabilityIntervals(ctx, participant._id);
        await ctx.db.delete(participant._id);
      }
      await ctx.db.delete(event._id);
    }
    await ctx.db.patch(operation._id, { state: "succeeded", errorKind: undefined, updatedAt: args.now });
    await ctx.db.patch(connection._id, { lastErrorKind: undefined, updatedAt: args.now });
    return operation.externalEventId;
  },
});

export const recordOutcome = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    kind: googleCalendarErrorKindValidator,
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (operation === null) throw new Error("Google Calendar write operation not found");
    const connection = await ctx.db.get(operation.connectionId);
    if (connection === null) throw new Error("Google Calendar connection not found");
    await ctx.db.patch(operation._id, {
      state: args.kind === "conflict"
        ? "conflict"
        : args.kind === "retryable" ? "pending" : "failed",
      errorKind: args.kind,
      updatedAt: args.now,
    });
    if (args.kind === "needs_reauthorization" || args.kind === "forbidden") {
      await ctx.db.patch(connection._id, { state: "needs_reauthorization", lastErrorKind: args.kind, updatedAt: args.now });
    } else if (args.kind === "not_connected") {
      await ctx.db.patch(connection._id, { state: "disconnected", lastErrorKind: args.kind, updatedAt: args.now });
    } else if (args.kind === "retryable" || args.kind === "failed") {
      await ctx.db.patch(connection._id, { lastErrorKind: args.kind, updatedAt: args.now });
    }
    return null;
  },
});
