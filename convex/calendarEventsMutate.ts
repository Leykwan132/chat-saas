import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { logConversationEvent } from "./conversationLogs";
import { normalizeTimeZone } from "./teamHelpers";
import { AppointmentBookingSessionStatus } from "./appointmentBookingSessionStatus";
import { customerSearchText } from "./customerSearch";
import { notifyAppointmentEvent } from "./telegramNotifications/events";
import { syncCalendarEventAvailabilityIntervals } from "./calendarAvailabilityIntervals";
import {
  assertMutableCalendarEvent,
  bookingDisplayName,
  deleteParticipants,
  getConversationIdForEvent,
  insertParticipants,
  validateTime,
  type CollectedFields,
  calendarEventUpdateArgs,
} from "./calendarEventsHelpers";

export const applyUpdate = internalMutation({
  args: calendarEventUpdateArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auth, event } = await assertMutableCalendarEvent(ctx, args.eventId);

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
      (args.title !== undefined && args.title.trim() !== event.title) ||
      (args.startAt !== undefined && args.startAt !== event.startAt) ||
      (args.endAt !== undefined && args.endAt !== event.endAt) ||
      (args.status !== undefined && args.status !== event.status) ||
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
    return null;
  },
});

export const applyRemove = internalMutation({
  args: { eventId: v.id("calendarEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { event } = await assertMutableCalendarEvent(ctx, args.eventId);
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
    return null;
  },
});
