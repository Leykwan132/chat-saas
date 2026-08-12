import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "../calendarAvailabilityIntervals";
import type { MappedGoogleCalendarEvent } from "./eventMapping";
import type { GoogleCalendarReconciliationTarget } from "./writeReconciliation";

type ActiveMappedEvent = MappedGoogleCalendarEvent & {
  status: "confirmed" | "tentative";
  title: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  allDay: boolean;
};

export function activeGoogleCalendarEvent(event: MappedGoogleCalendarEvent): ActiveMappedEvent {
  if (
    event.status === "cancelled" || event.title === undefined ||
    event.startAt === undefined || event.endAt === undefined ||
    event.timeZone === undefined || event.allDay === undefined
  ) throw new Error("Google Calendar active event is incomplete");
  if (event.endAt <= event.startAt) {
    throw new Error("Google Calendar event end must follow its start");
  }
  return event as ActiveMappedEvent;
}

async function deleteParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db.query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId)).take(51);
  if (participants.length > 50) {
    throw new Error("Google Calendar event has too many participants to synchronize");
  }
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await ctx.db.delete(participant._id);
  }
}

async function upsertOwnerParticipant(
  ctx: MutationCtx,
  eventId: Id<"calendarEvents">,
  teamId: Id<"teams">,
  owner: Doc<"users">,
  eventStartAt: number,
  eventEndAt: number,
  now: number,
) {
  const participants = await ctx.db.query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId)).take(51);
  if (participants.length > 50) {
    throw new Error("Google Calendar event has too many participants to synchronize");
  }
  const assignedOwner = participants.find((participant) =>
    participant.participantType === "teamUser" &&
    participant.role === "assigned" && participant.userId === owner._id,
  );
  if (assignedOwner !== undefined) {
    await ctx.db.patch(assignedOwner._id, { eventStartAt, eventEndAt, updatedAt: now });
    return;
  }
  const displayName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  await ctx.db.insert("calendarEventParticipants", {
    eventId,
    teamId,
    participantType: "teamUser",
    role: "assigned",
    userId: owner._id,
    email: owner.email,
    displayName: displayName || owner.email,
    eventStartAt,
    eventEndAt,
    responseStatus: "accepted",
    createdAt: now,
    updatedAt: now,
  });
}

function synchronizedFields(event: ActiveMappedEvent, now: number) {
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
    externalRecurringEventId: event.recurringEventId,
    externalSyncState: "synced" as const,
    updatedAt: now,
  };
}

export async function upsertGoogleCalendarProjection(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  owner: Doc<"users">,
  event: ActiveMappedEvent,
  run: Doc<"googleCalendarSyncRuns">,
  now: number,
  reconciliationTarget: GoogleCalendarReconciliationTarget | null,
) {
  if (reconciliationTarget !== null && reconciliationTarget.event.teamId === teamId) {
    const reconciledEvent = reconciliationTarget.event;
    await ctx.db.patch(reconciledEvent._id, {
      ...synchronizedFields(event, now),
      externalProvider: "google",
      externalCalendarId: "primary",
      externalEventId: event.eventId,
      externalOwnerUserId: owner._id,
      externalOrigin: "kilobot",
      externalOperationKey: event.operationKey,
      externalLastSeenSyncRunId:
        run.requestKind === "full" ? run._id : reconciledEvent.externalLastSeenSyncRunId,
    });
    await upsertOwnerParticipant(
      ctx, reconciledEvent._id, teamId, owner, event.startAt, event.endAt, now,
    );
    await syncCalendarEventAvailabilityIntervals(ctx, reconciledEvent._id, now);
    await ctx.db.patch(reconciliationTarget.operationId, {
      state: "succeeded",
      errorKind: undefined,
      providerEtag: event.etag,
      attemptLeaseExpiresAt: undefined,
      updatedAt: now,
    });
    return "updated" as const;
  }
  const existing = await ctx.db.query("calendarEvents").withIndex(
    "by_teamId_and_externalOwnerUserId_and_externalCalendarId_and_externalEventId_and_externalOriginalStartAt",
    (q) => q.eq("teamId", teamId).eq("externalOwnerUserId", owner._id)
      .eq("externalCalendarId", "primary").eq("externalEventId", event.eventId)
      .eq("externalOriginalStartAt", event.originalStartAt),
  ).unique();
  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      ...synchronizedFields(event, now),
      externalLastSeenSyncRunId:
        run.requestKind === "full" ? run._id : existing.externalLastSeenSyncRunId,
    });
    await upsertOwnerParticipant(ctx, existing._id, teamId, owner, event.startAt, event.endAt, now);
    await syncCalendarEventAvailabilityIntervals(ctx, existing._id, now);
    return "updated" as const;
  }
  const eventId = await ctx.db.insert("calendarEvents", {
    teamId,
    ...synchronizedFields(event, now),
    createdBy: owner._id,
    externalProvider: "google",
    externalCalendarId: "primary",
    externalEventId: event.eventId,
    externalOwnerUserId: owner._id,
    externalOrigin: "google",
    externalOriginalStartAt: event.originalStartAt,
    externalLastSeenSyncRunId: run.requestKind === "full" ? run._id : undefined,
    createdAt: now,
  });
  await upsertOwnerParticipant(ctx, eventId, teamId, owner, event.startAt, event.endAt, now);
  await syncCalendarEventAvailabilityIntervals(ctx, eventId, now);
  return "imported" as const;
}

export async function cancelGoogleCalendarProjection(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  ownerId: Id<"users">,
  event: MappedGoogleCalendarEvent,
  now: number,
) {
  const candidates = await ctx.db.query("calendarEvents")
    .withIndex("by_teamId_and_externalProvider_and_externalEventId", (q) =>
      q.eq("teamId", teamId).eq("externalProvider", "google").eq("externalEventId", event.eventId),
    ).take(101);
  if (candidates.length > 100) {
    throw new Error("Google Calendar cancellation matched too many projections");
  }
  let cancelledCount = 0;
  for (const candidate of candidates) {
    if (
      candidate.externalOwnerUserId !== ownerId || candidate.externalCalendarId !== "primary" ||
      (event.originalStartAt !== undefined && candidate.externalOriginalStartAt !== event.originalStartAt)
    ) continue;
    if (candidate.externalOrigin === "kilobot") {
      await ctx.db.patch(candidate._id, {
        status: "cancelled",
        externalStatus: "cancelled",
        externalSyncState: "synced",
        externalUpdatedAt: event.updatedAt,
        updatedAt: now,
      });
      await syncCalendarEventAvailabilityIntervals(ctx, candidate._id, now);
    } else {
      await deleteParticipants(ctx, candidate._id);
      await ctx.db.delete(candidate._id);
    }
    cancelledCount += 1;
  }
  return cancelledCount;
}
