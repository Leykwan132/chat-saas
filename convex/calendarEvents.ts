import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { resolveChannelOrgId } from "./authUtils";
import { Permission } from "../shared/permissions";
import { normalizeTimeZone } from "./teamHelpers";
import {
  formatCalendarAllDayDate,
  formatCalendarDateTime,
} from "./calendarFormatUtils";
import {
  canViewGoogleEventDetails,
  externalEventEligibleInTeam,
  loadCalendarRangeProjection,
  projectCalendarEvent,
} from "./googleCalendar/calendarProjection";
import { syncCalendarEventAvailabilityIntervals } from "./calendarAvailabilityIntervals";
import {
  assertCalendarAccess,
  insertParticipants,
  validateTime,
  calendarEventUpdateArgs,
} from "./calendarEventsHelpers";
import {
  runCalendarEventRemove,
  runCalendarEventUpdate,
} from "./googleCalendar/calendarEventSync";

const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("tentative"),
  v.literal("cancelled"),
);

function formatEventDateTime(event: Doc<"calendarEvents">) {
  if (event.allDay) {
    return {
      date: formatCalendarAllDayDate(event.startAt, event.timeZone),
      timeRange: "All day",
    };
  }
  return formatCalendarDateTime(event.startAt, event.endAt, event.timeZone);
}

export const getAppointmentDetails = query({
  args: { eventId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_READ);
    const event = await ctx.db.get(args.eventId);
    if (
      event === null || event.teamId !== auth.activeTeamId ||
      !(await externalEventEligibleInTeam(ctx, event))
    ) {
      return null;
    }

    if (!canViewGoogleEventDetails(event, auth.userDbId)) {
      const { date, timeRange } = formatEventDateTime(event);
      return {
        eventId: event._id,
        title: "Busy",
        status: event.status,
        isAppointmentBooking: false,
        serviceName: "Busy",
        serviceFields: [],
        collectedFields: {},
        date,
        timeRange,
        attendeeNames: [],
      };
    }

    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(50);
    const assigned = participants.find((participant) => participant.role === "assigned");
    const customer = participants.find((participant) => participant.role === "customer");
    const attendees = participants
      .filter((participant) => participant.role === "attendee")
      .map((participant) => participant.displayName ?? participant.email);

    const service = event.appointmentServiceId
      ? await ctx.db.get(event.appointmentServiceId)
      : null;
    const { date, timeRange } = formatEventDateTime(event);
    const collectedFields = event.customFieldResponses ?? {};

    return {
      eventId: event._id,
      title: event.title,
      status: event.status,
      bookingSource: event.bookingSource,
      isAppointmentBooking: event.bookingSource === "ai" || event.appointmentServiceId !== undefined,
      serviceName: service?.name ?? event.title,
      serviceFields: service?.fields ?? [],
      collectedFields,
      date,
      timeRange,
      teamMember: assigned?.displayName ?? assigned?.email,
      customerName: customer?.displayName ?? customer?.email,
      attendeeNames: attendees,
      description: event.description,
      link: event.link,
      conversationId: event.conversationId,
      remarks: event.remarks,
    };
  },
});

export const listForRange = query({
  args: {
    startAt: v.number(),
    endAt: v.number(),
    assignedUserId: v.optional(v.id("users")),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_READ);
    if (args.endAt <= args.startAt) {
      throw new Error("Invalid calendar range");
    }

    return await loadCalendarRangeProjection(ctx, {
      teamId: auth.activeTeamId,
      viewerUserId: auth.userDbId,
      ...args,
    });
  },
});

export const listCustomerOptions = query({
  args: {},
  handler: async (ctx) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_READ);
    const resolvedOrgId = resolveChannelOrgId(auth.orgId, auth.userId);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_orgId_and_lastSeenAt", (q) => q.eq("orgId", resolvedOrgId))
      .order("desc")
      .collect();
    return customers.map((customer) => ({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      contactAddress: customer.contactAddress,
      service: customer.service,
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    link: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
    timeZone: v.string(),
    allDay: v.optional(v.boolean()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    customerId: v.id("customers"),
    assignedUserId: v.id("users"),
    attendeeUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_MANAGE);
    validateTime(args);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Event title is required");
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: auth.activeTeamId,
      title,
      description: args.description?.trim() || undefined,
      location: args.location?.trim() || undefined,
      link: args.link?.trim() || undefined,
      startAt: args.startAt,
      endAt: args.endAt,
      timeZone: normalizeTimeZone(args.timeZone),
      allDay: args.allDay,
      startDate: args.startDate,
      endDate: args.endDate,
      status: args.status ?? "confirmed",
      createdBy: auth.userDbId,
      createdAt: now,
      updatedAt: now,
    });

    await insertParticipants(ctx, {
      eventId,
      teamId: auth.activeTeamId,
      customerId: args.customerId,
      assignedUserId: args.assignedUserId,
      attendeeUserIds: args.attendeeUserIds,
      eventStartAt: args.startAt,
      eventEndAt: args.endAt,
      now,
    });
    await syncCalendarEventAvailabilityIntervals(ctx, eventId, now);

    return eventId;
  },
});

export const update = action({
  args: calendarEventUpdateArgs,
  returns: v.null(),
  handler: async (ctx, args) => runCalendarEventUpdate(ctx, args),
});

export const remove = action({
  args: { eventId: v.id("calendarEvents") },
  returns: v.null(),
  handler: async (ctx, args) => runCalendarEventRemove(ctx, args),
});

export const getEventForEditing = query({
  args: { eventId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_READ);
    const event = await ctx.db.get(args.eventId);
    if (
      event === null || event.teamId !== auth.activeTeamId ||
      !(await externalEventEligibleInTeam(ctx, event))
    ) {
      return null;
    }
    if (!canViewGoogleEventDetails(event, auth.userDbId)) {
      return null;
    }
    return await projectCalendarEvent(ctx, event, auth.userDbId);
  },
});
