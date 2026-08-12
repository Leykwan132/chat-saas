import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import type { MappedGoogleCalendarEvent } from "./eventMapping";
import { ownedSyncRun } from "./syncOwnership";

const MAX_EVENTS_PER_PAGE = 20;

const mappedEventValidator = v.object({
  eventId: v.string(),
  status: v.union(v.literal("confirmed"), v.literal("tentative"), v.literal("cancelled")),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  link: v.optional(v.string()),
  htmlLink: v.optional(v.string()),
  iCalUID: v.optional(v.string()),
  etag: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  transparency: v.union(v.literal("opaque"), v.literal("transparent")),
  blocksAvailability: v.boolean(),
  canEdit: v.boolean(),
  recurringEventId: v.optional(v.string()),
  originalStartAt: v.optional(v.number()),
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  timeZone: v.optional(v.string()),
  allDay: v.optional(v.boolean()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
});

type ActiveMappedEvent = MappedGoogleCalendarEvent & {
  status: "confirmed" | "tentative";
  title: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  allDay: boolean;
};

function activeEvent(event: MappedGoogleCalendarEvent): ActiveMappedEvent {
  if (
    event.status === "cancelled" || event.title === undefined ||
    event.startAt === undefined || event.endAt === undefined ||
    event.timeZone === undefined || event.allDay === undefined
  ) {
    throw new Error("Google Calendar active event is incomplete");
  }
  if (event.endAt <= event.startAt) {
    throw new Error("Google Calendar event end must follow its start");
  }
  return event as ActiveMappedEvent;
}

async function deleteParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(51);
  if (participants.length > 50) {
    throw new Error("Google Calendar event has too many participants to synchronize");
  }
  for (const participant of participants) await ctx.db.delete(participant._id);
}

async function upsertOwnerParticipant(
  ctx: MutationCtx,
  eventId: Id<"calendarEvents">,
  teamId: Id<"teams">,
  owner: Doc<"users">,
  eventStartAt: number,
  now: number,
) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(51);
  if (participants.length > 50) {
    throw new Error("Google Calendar event has too many participants to synchronize");
  }
  const assignedOwner = participants.find((participant) =>
    participant.participantType === "teamUser" &&
    participant.role === "assigned" && participant.userId === owner._id,
  );
  if (assignedOwner !== undefined) {
    await ctx.db.patch(assignedOwner._id, { eventStartAt, updatedAt: now });
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

async function upsertProjection(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  owner: Doc<"users">,
  event: ActiveMappedEvent,
  run: Doc<"googleCalendarSyncRuns">,
  now: number,
) {
  const existing = await ctx.db
    .query("calendarEvents")
    .withIndex(
      "by_teamId_and_externalOwnerUserId_and_externalCalendarId_and_externalEventId_and_externalOriginalStartAt",
      (q) => q
        .eq("teamId", teamId)
        .eq("externalOwnerUserId", owner._id)
        .eq("externalCalendarId", "primary")
        .eq("externalEventId", event.eventId)
        .eq("externalOriginalStartAt", event.originalStartAt),
    )
    .unique();
  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      ...synchronizedFields(event, now),
      externalLastSeenSyncRunId:
        run.requestKind === "full" ? run._id : existing.externalLastSeenSyncRunId,
    });
    await upsertOwnerParticipant(ctx, existing._id, teamId, owner, event.startAt, now);
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
  await upsertOwnerParticipant(ctx, eventId, teamId, owner, event.startAt, now);
  return "imported" as const;
}

async function cancelProjection(
  ctx: MutationCtx,
  teamId: Id<"teams">,
  ownerId: Id<"users">,
  event: MappedGoogleCalendarEvent,
  now: number,
) {
  const candidates = await ctx.db
    .query("calendarEvents")
    .withIndex("by_teamId_and_externalProvider_and_externalEventId", (q) =>
      q.eq("teamId", teamId).eq("externalProvider", "google").eq("externalEventId", event.eventId),
    )
    .take(101);
  if (candidates.length > 100) throw new Error("Google Calendar cancellation matched too many projections");
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
    } else {
      await deleteParticipants(ctx, candidate._id);
      await ctx.db.delete(candidate._id);
    }
    cancelledCount += 1;
  }
  return cancelledCount;
}

export const applyPage = internalMutation({
  args: {
    connectionId: v.id("googleCalendarConnections"),
    runId: v.id("googleCalendarSyncRuns"),
    events: v.array(mappedEventValidator),
    membershipCursor: v.optional(v.string()),
    nextPageToken: v.optional(v.string()),
    candidateSyncToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.union(
    v.object({ kind: v.literal("lost") }),
    v.object({
      kind: v.literal("applied"),
      importedCount: v.number(),
      updatedCount: v.number(),
      cancelledCount: v.number(),
      conflictCount: v.number(),
      nextMembershipCursor: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.events.length > MAX_EVENTS_PER_PAGE) throw new Error("Google Calendar page exceeds the synchronization batch limit");
    const owned = await ownedSyncRun(ctx, args.connectionId, args.runId);
    if (owned === undefined) return { kind: "lost" as const };
    const { connection, run } = owned;
    const owner = await ctx.db.get(connection.userId);
    if (owner === null) throw new Error("Google Calendar connection owner not found");
    const membershipPage = await ctx.db
      .query("teamMemberships")
      .withIndex("by_userId", (q) => q.eq("userId", owner._id))
      .paginate({ cursor: args.membershipCursor ?? null, numItems: 1 });
    let importedCount = 0;
    let updatedCount = 0;
    let cancelledCount = 0;
    for (const mapped of args.events) {
      for (const membership of membershipPage.page) {
        if (mapped.status === "cancelled") {
          cancelledCount += await cancelProjection(ctx, membership.teamId, owner._id, mapped, args.now);
        } else {
          const result = await upsertProjection(
            ctx,
            membership.teamId,
            owner,
            activeEvent(mapped),
            run,
            args.now,
          );
          if (result === "imported") importedCount += 1;
          else updatedCount += 1;
        }
      }
    }
    await ctx.db.patch(run._id, {
      pageToken: membershipPage.isDone ? args.nextPageToken : run.pageToken,
      candidateSyncToken: membershipPage.isDone ? args.candidateSyncToken : run.candidateSyncToken,
      importedCount: run.importedCount + importedCount,
      updatedCount: run.updatedCount + updatedCount,
      cancelledCount: run.cancelledCount + cancelledCount,
      updatedAt: args.now,
    });
    return {
      kind: "applied" as const,
      importedCount,
      updatedCount,
      cancelledCount,
      conflictCount: 0,
      nextMembershipCursor: membershipPage.isDone ? undefined : membershipPage.continueCursor,
    };
  },
});
