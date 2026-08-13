import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "../calendarAvailabilityIntervals";
import { mappedGoogleCalendarEventValidator, type MappedGoogleCalendarEvent } from "./eventMapping";

const finalizationValidator = v.union(
  v.object({ kind: v.literal("success"), externalEventId: v.string() }),
  v.object({ kind: v.literal("conflict") }),
  v.object({ kind: v.literal("stale") }),
);


async function ownedOperation(
  ctx: MutationCtx,
  operationId: Doc<"googleCalendarWriteOperations">["_id"],
) {
  const operation = await ctx.db.get(operationId);
  if (operation === null) throw new Error("Google Calendar write operation not found");
  const connection = await ctx.db.get(operation.connectionId);
  const event = operation.calendarEventId === undefined ? null : await ctx.db.get(operation.calendarEventId);
  const membership = connection === null || event === null ? null : await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", connection.userId).eq("teamId", event.teamId),
    ).unique();
  if (
    connection === null || event === null || membership === null ||
    event.externalProvider !== "google" || event.externalCalendarId !== "primary" ||
    event.externalOwnerUserId !== connection.userId
  ) throw new Error("Google Calendar write operation lost event ownership");
  return { operation, connection, event };
}

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

function currentAttempt(
  operation: Doc<"googleCalendarWriteOperations">,
  attemptGeneration: number,
  recoveryClaimGeneration?: number,
) {
  if (operation.state === "succeeded" && operation.externalEventId !== undefined) {
    return { kind: "success" as const, externalEventId: operation.externalEventId };
  }
  if (operation.recoveryClaimGeneration !== recoveryClaimGeneration) {
    return { kind: "stale" as const };
  }
  if (
    operation.attemptGeneration === attemptGeneration &&
    operation.attemptPhase === "provider_mutation_started" &&
    operation.state !== "conflict"
  ) return null;
  if (
    operation.state !== "running" ||
    operation.attemptGeneration !== attemptGeneration
  ) return { kind: "stale" as const };
  return null;
}

export const finalizeEvent = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    recoveryClaimGeneration: v.optional(v.number()),
    event: mappedGoogleCalendarEventValidator,
    now: v.number(),
  },
  returns: finalizationValidator,
  handler: async (ctx, args) => {
    const { operation, connection, event } = await ownedOperation(ctx, args.operationId);
    const terminal = currentAttempt(
      operation, args.attemptGeneration, args.recoveryClaimGeneration,
    );
    if (terminal !== null) return terminal;
    if (operation.action === "delete" || operation.externalEventId !== args.event.eventId) {
      throw new Error("Google Calendar write finalization does not match its operation");
    }
    if (operation.action === "update" && args.event.etag === undefined) {
      throw new Error("Google Calendar write finalization requires a provider ETag");
    }
    if (operation.action === "update") {
      if (event.externalEtag !== operation.intendedEtag && event.externalEtag !== args.event.etag) {
        await ctx.db.patch(operation._id, {
          state: "conflict",
          errorKind: "conflict",
          providerEtag: args.event.etag,
          attemptLeaseExpiresAt: undefined,
          attemptPhase: undefined,
          providerMutationStartedAt: undefined,
          recoveryClaimLeaseExpiresAt: undefined,
          updatedAt: args.now,
        });
        return { kind: "conflict" as const };
      }
      if (event.externalEtag !== args.event.etag) {
        await ctx.db.patch(event._id, activeEventPatch(args.event, args.now));
        await syncCalendarEventAvailabilityIntervals(ctx, event._id, args.now);
      }
    } else {
      await ctx.db.patch(event._id, {
        ...activeEventPatch(args.event, args.now),
        externalEventId: args.event.eventId,
        externalOperationKey: operation.operationKey,
      });
      await syncCalendarEventAvailabilityIntervals(ctx, event._id, args.now);
    }
    await ctx.db.patch(operation._id, {
      state: "succeeded",
      errorKind: undefined,
      providerEtag: args.event.etag,
      attemptLeaseExpiresAt: undefined,
      attemptPhase: undefined,
      providerMutationStartedAt: undefined,
      recoveryClaimLeaseExpiresAt: undefined,
      updatedAt: args.now,
    });
    await ctx.db.patch(connection._id, { lastErrorKind: undefined, updatedAt: args.now });
    return { kind: "success" as const, externalEventId: args.event.eventId };
  },
});

export const establishDeletePrecondition = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    providerEtag: v.string(),
    now: v.number(),
  },
  returns: v.union(
    finalizationValidator,
    v.object({ kind: v.literal("ready"), intendedEtag: v.string() }),
  ),
  handler: async (ctx, args) => {
    const { operation, event } = await ownedOperation(ctx, args.operationId);
    const terminal = currentAttempt(operation, args.attemptGeneration);
    if (terminal !== null) return terminal;
    if (operation.action !== "delete" || args.providerEtag.trim().length === 0) {
      throw new Error("Google Calendar delete precondition does not match its operation");
    }
    if (
      event.externalEtag !== undefined &&
      event.externalEtag !== args.providerEtag
    ) {
      await ctx.db.patch(operation._id, {
        state: "conflict",
        errorKind: "conflict",
        providerEtag: args.providerEtag,
        attemptLeaseExpiresAt: undefined,
        attemptPhase: undefined,
        providerMutationStartedAt: undefined,
        updatedAt: args.now,
      });
      return { kind: "conflict" as const };
    }
    await ctx.db.patch(operation._id, {
      intendedEtag: args.providerEtag,
      providerEtag: args.providerEtag,
      updatedAt: args.now,
    });
    return { kind: "ready" as const, intendedEtag: args.providerEtag };
  },
});

async function removeImportedProjection(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
) {
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

export const finalizeDelete = internalMutation({
  args: {
    operationId: v.id("googleCalendarWriteOperations"),
    attemptGeneration: v.number(),
    recoveryClaimGeneration: v.optional(v.number()),
    confirmedAbsent: v.boolean(),
    now: v.number(),
  },
  returns: finalizationValidator,
  handler: async (ctx, args) => {
    const { operation, connection, event } = await ownedOperation(ctx, args.operationId);
    const terminal = currentAttempt(
      operation, args.attemptGeneration, args.recoveryClaimGeneration,
    );
    if (terminal !== null) return terminal;
    if (
      operation.action !== "delete" || operation.externalEventId === undefined ||
      (!args.confirmedAbsent && operation.intendedEtag === undefined)
    ) throw new Error("Google Calendar delete finalization does not match its operation");
    if (event.externalOrigin === "kilobot") {
      await ctx.db.patch(event._id, {
        status: "cancelled",
        externalStatus: "cancelled",
        externalSyncState: "synced",
        updatedAt: args.now,
      });
      await syncCalendarEventAvailabilityIntervals(ctx, event._id, args.now);
    } else {
      await removeImportedProjection(ctx, event);
    }
    await ctx.db.patch(operation._id, {
      state: "succeeded",
      errorKind: undefined,
      attemptLeaseExpiresAt: undefined,
      attemptPhase: undefined,
      providerMutationStartedAt: undefined,
      recoveryClaimLeaseExpiresAt: undefined,
      updatedAt: args.now,
    });
    await ctx.db.patch(connection._id, { lastErrorKind: undefined, updatedAt: args.now });
    return { kind: "success" as const, externalEventId: operation.externalEventId };
  },
});
