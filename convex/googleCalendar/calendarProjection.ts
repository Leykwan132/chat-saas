import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type CalendarRange = {
  teamId: Id<"teams">;
  viewerUserId: Id<"users">;
  startAt: number;
  endAt: number;
  assignedUserId?: Id<"users">;
  customerId?: Id<"customers">;
};

export function isImportedGoogleEvent(event: Doc<"calendarEvents">) {
  return event.externalProvider === "google" && event.externalOrigin === "google";
}

export function canViewGoogleEventDetails(
  event: Doc<"calendarEvents">,
  viewerUserId: Id<"users">,
) {
  return !isImportedGoogleEvent(event) || event.externalOwnerUserId === viewerUserId;
}

export function canMutateCalendarEvent(
  event: Doc<"calendarEvents">,
  viewerUserId: Id<"users">,
  canManage: boolean,
) {
  if (isImportedGoogleEvent(event)) {
    return event.externalOwnerUserId === viewerUserId && event.externalCanEdit !== false;
  }
  return canManage;
}

export async function externalEventEligibleInTeam(
  ctx: QueryCtx | MutationCtx,
  event: Doc<"calendarEvents">,
) {
  if (!isImportedGoogleEvent(event)) return true;
  if (event.externalOwnerUserId === undefined) return false;
  const externalOwnerUserId = event.externalOwnerUserId;
  return await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", externalOwnerUserId).eq("teamId", event.teamId),
    )
    .unique() !== null;
}

async function loadParticipants(ctx: QueryCtx, eventId: Id<"calendarEvents">) {
  return await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(50);
}

function teammateBusyProjection(event: Doc<"calendarEvents">) {
  return {
    _id: event._id,
    _creationTime: event._creationTime,
    teamId: event.teamId,
    title: "Busy",
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: event.timeZone,
    allDay: event.allDay,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status,
    participants: [],
    viewerCanMutate: false as const,
  };
}

export async function projectCalendarEvent(
  ctx: QueryCtx,
  event: Doc<"calendarEvents">,
  viewerUserId: Id<"users">,
) {
  if (!canViewGoogleEventDetails(event, viewerUserId)) {
    return teammateBusyProjection(event);
  }
  return {
    ...event,
    participants: await loadParticipants(ctx, event._id),
  };
}

async function filteredEventIds(ctx: QueryCtx, args: CalendarRange) {
  let eventIds: Set<Id<"calendarEvents">> | null = null;
  if (args.assignedUserId !== undefined) {
    const rows = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_userId_and_eventStartAt", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("role", "assigned")
          .eq("userId", args.assignedUserId)
          .gte("eventStartAt", args.startAt)
          .lt("eventStartAt", args.endAt),
      )
      .take(250);
    eventIds = new Set(rows.map((row) => row.eventId));
  }
  if (args.customerId !== undefined) {
    const rows = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_teamId_and_role_and_customerId_and_eventStartAt", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("role", "customer")
          .eq("customerId", args.customerId)
          .gte("eventStartAt", args.startAt)
          .lt("eventStartAt", args.endAt),
      )
      .take(250);
    const customerEventIds = new Set(rows.map((row) => row.eventId));
    eventIds = eventIds === null
      ? customerEventIds
      : new Set([...eventIds].filter((eventId) => customerEventIds.has(eventId)));
  }
  return eventIds;
}

async function loadRangeEvents(ctx: QueryCtx, args: CalendarRange) {
  const eventIds = await filteredEventIds(ctx, args);
  if (eventIds !== null) {
    return await Promise.all([...eventIds].map((eventId) => ctx.db.get(eventId)));
  }
  return await ctx.db
    .query("calendarEvents")
    .withIndex("by_teamId_and_startAt", (q) =>
      q.eq("teamId", args.teamId).gte("startAt", args.startAt).lt("startAt", args.endAt),
    )
    .take(250);
}

export async function loadCalendarRangeProjection(ctx: QueryCtx, args: CalendarRange) {
  const events = await loadRangeEvents(ctx, args);
  const externalOwnerIds = new Set(
    events.flatMap((event) =>
      event?.externalOwnerUserId === undefined ? [] : [event.externalOwnerUserId],
    ),
  );
  const memberships = await Promise.all(
    [...externalOwnerIds].map((userId) =>
      ctx.db
        .query("teamMemberships")
        .withIndex("by_userId_and_teamId", (q) =>
          q.eq("userId", userId).eq("teamId", args.teamId),
        )
        .unique(),
    ),
  );
  const eligibleUserIds = new Set(
    memberships.flatMap((membership) => membership === null ? [] : [membership.userId]),
  );
  const visibleEvents = events
    .filter(
      (event): event is Doc<"calendarEvents"> =>
        event !== null &&
        event.teamId === args.teamId &&
        event.startAt >= args.startAt &&
        event.startAt < args.endAt &&
        (!isImportedGoogleEvent(event) ||
          (event.externalOwnerUserId !== undefined && eligibleUserIds.has(event.externalOwnerUserId))),
    )
    .sort((a, b) => a.startAt - b.startAt);
  return await Promise.all(
    visibleEvents.map((event) => projectCalendarEvent(ctx, event, args.viewerUserId)),
  );
}
