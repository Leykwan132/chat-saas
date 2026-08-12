import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { logConversationEvent } from "./conversationLogs";
import {
  Permission,
  ROLE_PERMISSIONS,
  resolvePermissionsForRole,
  type PermissionSlug,
} from "../shared/permissions";
import { normalizeTimeZone } from "./teamHelpers";
import {
  formatCalendarAllDayDate,
  formatCalendarDateTime,
} from "./calendarFormatUtils";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { customerSearchText } from "./customerSearch";
import { notifyAppointmentEvent } from "./telegramNotifications/events";
import {
  canMutateCalendarEvent,
  canViewGoogleEventDetails,
  externalEventEligibleInTeam,
  loadCalendarRangeProjection,
  projectCalendarEvent,
} from "./googleCalendar/calendarProjection";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "./calendarAvailabilityIntervals";

const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("tentative"),
  v.literal("cancelled"),
);

const collectedValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

type CollectedFields = Record<string, string | number | boolean | null>;

function bookingDisplayName(fields: CollectedFields) {
  if (typeof fields.name === "string" && fields.name.trim()) {
    return fields.name.trim();
  }
  return "Customer";
}

type DbCtx = QueryCtx | MutationCtx;
type ParticipantInput = {
  customerId: Id<"customers">;
  assignedUserId: Id<"users">;
  attendeeUserIds?: Id<"users">[];
};

function userDisplayName(user: Doc<"users">) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function customerDisplayName(customer: Doc<"customers">) {
  return (
    customer.name?.trim() ||
    customer.email?.trim() ||
    customer.phone?.trim() ||
    customer.contactAddress
  );
}

async function calendarPermissionsForCurrentUser(ctx: DbCtx): Promise<PermissionSlug[]> {
  const auth = await getAuthContext(ctx);
  const team = await ctx.db.get(auth.activeTeamId);
  if (team === null) {
    return [];
  }
  if (team.type === "personal") {
    return [Permission.CALENDAR_READ, Permission.CALENDAR_MANAGE];
  }

  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", auth.userDbId).eq("teamId", auth.activeTeamId),
    )
    .unique();
  if (membership === null) {
    return [];
  }

  const roleKey =
    membership.role === "owner"
      ? "owner"
      : membership.role === "admin"
        ? "admin"
        : "member";
  const stored: PermissionSlug[] =
    roleKey === "owner"
      ? ((team.ownerPermissions ?? [...ROLE_PERMISSIONS.owner]) as PermissionSlug[])
      : roleKey === "admin"
        ? ((team.adminPermissions ?? [...ROLE_PERMISSIONS.admin]) as PermissionSlug[])
        : ((team.memberPermissions ?? [...ROLE_PERMISSIONS.member]) as PermissionSlug[]);

  return resolvePermissionsForRole(roleKey, stored);
}

async function assertCalendarAccess(ctx: DbCtx, permission: PermissionSlug) {
  const auth = await getAuthContext(ctx);
  const permissions = await calendarPermissionsForCurrentUser(ctx);
  if (!permissions.includes(permission)) {
    throw new Error("Forbidden");
  }
  return auth;
}

async function assertTeamUser(ctx: DbCtx, teamId: Id<"teams">, userId: Id<"users">) {
  const membership = await ctx.db
    .query("teamMemberships")
    .withIndex("by_userId_and_teamId", (q) =>
      q.eq("userId", userId).eq("teamId", teamId),
    )
    .unique();
  if (membership === null) {
    throw new Error("Selected team member is not in this team");
  }
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("Selected team member was not found");
  }
  return user;
}

async function assertCustomerForActiveOrg(ctx: DbCtx, customerId: Id<"customers">) {
  const auth = await getAuthContext(ctx);
  const customer = await ctx.db.get(customerId);
  if (customer === null || customer.orgId !== auth.orgId) {
    throw new Error("Customer not found");
  }
  return customer;
}

function validateTime(args: {
  startAt: number;
  endAt: number;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  if (!Number.isFinite(args.startAt) || !Number.isFinite(args.endAt)) {
    throw new Error("Invalid event time");
  }
  if (args.endAt <= args.startAt) {
    throw new Error("Event end time must be after the start time");
  }
  if (args.allDay && (!args.startDate || !args.endDate)) {
    throw new Error("All-day events require start and end dates");
  }
}

async function insertParticipants(
  ctx: MutationCtx,
  args: ParticipantInput & {
    eventId: Id<"calendarEvents">;
    teamId: Id<"teams">;
    eventStartAt: number;
    eventEndAt: number;
    now: number;
  },
) {
  const customer = await assertCustomerForActiveOrg(ctx, args.customerId);
  const assignedUser = await assertTeamUser(ctx, args.teamId, args.assignedUserId);

  await ctx.db.insert("calendarEventParticipants", {
    eventId: args.eventId,
    teamId: args.teamId,
    participantType: "customer",
    role: "customer",
    customerId: customer._id,
    email: customer.email?.trim() || customer.contactAddress,
    displayName: customerDisplayName(customer),
    eventStartAt: args.eventStartAt,
    eventEndAt: args.eventEndAt,
    responseStatus: "needsAction",
    createdAt: args.now,
    updatedAt: args.now,
  });

  await ctx.db.insert("calendarEventParticipants", {
    eventId: args.eventId,
    teamId: args.teamId,
    participantType: "teamUser",
    role: "assigned",
    userId: assignedUser._id,
    email: assignedUser.email,
    displayName: userDisplayName(assignedUser),
    eventStartAt: args.eventStartAt,
    eventEndAt: args.eventEndAt,
    responseStatus: "accepted",
    createdAt: args.now,
    updatedAt: args.now,
  });

  const uniqueAttendees = Array.from(
    new Set((args.attendeeUserIds ?? []).filter((id) => id !== args.assignedUserId)),
  );
  for (const attendeeUserId of uniqueAttendees) {
    const attendee = await assertTeamUser(ctx, args.teamId, attendeeUserId);
    await ctx.db.insert("calendarEventParticipants", {
      eventId: args.eventId,
      teamId: args.teamId,
      participantType: "teamUser",
      role: "attendee",
      userId: attendee._id,
      email: attendee.email,
      displayName: userDisplayName(attendee),
      eventStartAt: args.eventStartAt,
      eventEndAt: args.eventEndAt,
      responseStatus: "needsAction",
      createdAt: args.now,
      updatedAt: args.now,
    });
  }
}

async function deleteParticipants(ctx: MutationCtx, eventId: Id<"calendarEvents">) {
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  for (const participant of participants) {
    await removeParticipantAvailabilityIntervals(ctx, participant._id);
    await ctx.db.delete(participant._id);
  }
}

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

async function getConversationIdByCustomerId(
  ctx: MutationCtx,
  customerId: Id<"customers">
): Promise<Id<"conversations"> | undefined> {
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
    .first();
  return conversation?._id;
}

async function getConversationIdForEvent(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">
): Promise<Id<"conversations"> | undefined> {
  if (event.conversationId) {
    return event.conversationId;
  }
  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(50);
  const customerPart = participants.find((p) => p.role === "customer");
  if (customerPart?.customerId) {
    return await getConversationIdByCustomerId(ctx, customerPart.customerId);
  }
  return undefined;
}

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

export const update = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    link: v.optional(v.string()),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    timeZone: v.optional(v.string()),
    allDay: v.optional(v.boolean()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    customerId: v.optional(v.id("customers")),
    assignedUserId: v.optional(v.id("users")),
    attendeeUserIds: v.optional(v.array(v.id("users"))),
    customFieldResponses: v.optional(v.record(v.string(), collectedValueValidator)),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_MANAGE);
    const event = await ctx.db.get(args.eventId);
    if (event === null || event.teamId !== auth.activeTeamId) {
      throw new Error("Calendar event not found");
    }
    if (!canMutateCalendarEvent(event)) {
      throw new Error("Calendar event not found");
    }

    const nextStartAt = args.startAt ?? event.startAt;
    const nextEndAt = args.endAt ?? event.endAt;
    validateTime({
      startAt: nextStartAt,
      endAt: nextEndAt,
      allDay: args.allDay ?? event.allDay,
      startDate: args.startDate ?? event.startDate,
      endDate: args.endDate ?? event.endDate,
    });

    const patch: Partial<Doc<"calendarEvents">> = {
      updatedAt: Date.now(),
      updatedBy: auth.userDbId,
    };
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) {
        throw new Error("Event title cannot be empty");
      }
      patch.title = title;
    }
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.location !== undefined) patch.location = args.location.trim() || undefined;
    if (args.link !== undefined) patch.link = args.link.trim() || undefined;
    if (args.startAt !== undefined) patch.startAt = args.startAt;
    if (args.endAt !== undefined) patch.endAt = args.endAt;
    if (args.timeZone !== undefined) patch.timeZone = normalizeTimeZone(args.timeZone);
    if (args.allDay !== undefined) patch.allDay = args.allDay;
    if (args.startDate !== undefined) patch.startDate = args.startDate;
    if (args.endDate !== undefined) patch.endDate = args.endDate;
    if (args.status !== undefined) patch.status = args.status;
    if (args.remarks !== undefined) patch.remarks = args.remarks.trim() || undefined;

    let mergedCollectedFields: CollectedFields | undefined;
    if (args.customFieldResponses !== undefined) {
      mergedCollectedFields = {
        ...(event.customFieldResponses ?? {}),
        ...args.customFieldResponses,
      };
      patch.customFieldResponses = mergedCollectedFields;

      if (event.appointmentServiceId !== undefined) {
        const service = await ctx.db.get(event.appointmentServiceId);
        if (service !== null) {
          patch.title = `${service.name} - ${bookingDisplayName(mergedCollectedFields)}`;
        }
      }
    }

    await ctx.db.patch(args.eventId, patch);

    if (mergedCollectedFields !== undefined) {
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(50);
      const customerParticipant = participants.find((row) => row.role === "customer");
      const displayName = bookingDisplayName(mergedCollectedFields);
      if (customerParticipant !== undefined) {
        await ctx.db.patch(customerParticipant._id, {
          displayName,
          updatedAt: Date.now(),
        });
      }
      if (customerParticipant?.customerId !== undefined) {
        const customer = await ctx.db.get(customerParticipant.customerId);
        if (customer !== null) {
          const customerPatch: Partial<Doc<"customers">> = {
            updatedAt: Date.now(),
          };
          if (typeof mergedCollectedFields.name === "string") {
            customerPatch.name = mergedCollectedFields.name.trim() || undefined;
          }
          if (typeof mergedCollectedFields.phone === "string") {
            customerPatch.phone = mergedCollectedFields.phone.trim() || undefined;
          }
          customerPatch.searchText = customerSearchText({
            name: customerPatch.name ?? customer.name,
            email: customer.email,
            phone: customerPatch.phone ?? customer.phone,
            contactAddress: customer.contactAddress,
          });
          await ctx.db.patch(customer._id, customerPatch);
        }
      }
      if (event.conversationId !== undefined) {
        const sessions = await ctx.db
          .query("appointmentBookingSessions")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", event.conversationId!))
          .take(100);
        const session = sessions.find(
          (row) =>
            row.calendarEventId === args.eventId &&
            (row.status === AppointmentBookingSessionStatus.Booked ||
              row.status === AppointmentBookingSessionStatus.Editing),
        );
        if (session !== undefined) {
          await ctx.db.patch(session._id, {
            collectedFields: mergedCollectedFields,
            updatedAt: Date.now(),
          });
        }
      }
    }

    const shouldReplaceParticipants =
      args.customerId !== undefined ||
      args.assignedUserId !== undefined ||
      args.attendeeUserIds !== undefined;
    if (shouldReplaceParticipants) {
      const existingParticipants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(50);
      const existingCustomer = existingParticipants.find((row) => row.role === "customer");
      const existingAssigned = existingParticipants.find((row) => row.role === "assigned");
      const existingAttendees = existingParticipants
        .filter((row) => row.role === "attendee" && row.userId !== undefined)
        .map((row) => row.userId!);

      const customerId = args.customerId ?? existingCustomer?.customerId;
      const assignedUserId = args.assignedUserId ?? existingAssigned?.userId;
      if (customerId === undefined || assignedUserId === undefined) {
        throw new Error("Customer and assigned user are required");
      }

      await deleteParticipants(ctx, args.eventId);
      await insertParticipants(ctx, {
        eventId: args.eventId,
        teamId: auth.activeTeamId,
        customerId,
        assignedUserId,
        attendeeUserIds: args.attendeeUserIds ?? existingAttendees,
        eventStartAt: nextStartAt,
        eventEndAt: nextEndAt,
        now: Date.now(),
      });
    } else if (args.startAt !== undefined || args.endAt !== undefined) {
      const participants = await ctx.db
        .query("calendarEventParticipants")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(100);
      for (const participant of participants) {
        await ctx.db.patch(participant._id, {
          eventStartAt: nextStartAt,
          eventEndAt: nextEndAt,
          updatedAt: Date.now(),
        });
      }
    }
    await syncCalendarEventAvailabilityIntervals(ctx, args.eventId, Date.now());

    const conversationId = await getConversationIdForEvent(ctx, event);
    const isCancellation = args.status === "cancelled" && event.status !== "cancelled";
    const isMaterialUpdate =
      args.title !== undefined && args.title.trim() !== event.title ||
      args.startAt !== undefined && args.startAt !== event.startAt ||
      args.endAt !== undefined && args.endAt !== event.endAt ||
      args.status !== undefined && args.status !== event.status ||
      args.customerId !== undefined ||
      args.assignedUserId !== undefined ||
      args.attendeeUserIds !== undefined ||
      args.customFieldResponses !== undefined;
    if (conversationId) {
      await logConversationEvent(ctx, {
        conversationId,
        action: isCancellation ? "event_cancelled" : "event_updated",
        metadata: {
          eventId: args.eventId,
          eventTitle: args.title ?? event.title,
          startAt: args.startAt ?? event.startAt,
        },
      });
    }
    if (event.agentId && event.bookingSource !== undefined && isMaterialUpdate) {
      const agent = await ctx.db.get(event.agentId);
      if (agent) {
        await notifyAppointmentEvent(
          ctx,
          agent._id,
          event._id,
          agent.name,
          isCancellation ? "cancelled" : "updated",
        );
      }
    }
  },
});

export const remove = mutation({
  args: { eventId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_MANAGE);
    const event = await ctx.db.get(args.eventId);
    if (event === null || event.teamId !== auth.activeTeamId) {
      throw new Error("Calendar event not found");
    }
    if (!canMutateCalendarEvent(event)) {
      throw new Error("Calendar event not found");
    }
    const conversationId = await getConversationIdForEvent(ctx, event);
    await deleteParticipants(ctx, args.eventId);
    await ctx.db.delete(args.eventId);
    if (conversationId) {
      await logConversationEvent(ctx, {
        conversationId,
        action: "event_deleted",
        metadata: {
          eventId: args.eventId,
          eventTitle: event.title,
        },
      });
    }
  },
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
