import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus, isActiveAppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { getExistingBookingSession } from "./sessionStore";

export const cancelBookingSession = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .take(100);
    const active = sessions.find((session) => isActiveAppointmentBookingSessionStatus(session.status));
    if (active === undefined) {
      const booked = await getExistingBookingSession(ctx, args.conversationId);
      if (booked === undefined || booked.calendarEventId === undefined) {
        return { success: false, message: "No active booking to cancel." };
      }
      const event = await ctx.db.get(booked.calendarEventId);
      if (event === null || event.status === "cancelled") {
        return { success: false, message: "No active booking to cancel." };
      }
      const conversation = await ctx.db.get(args.conversationId);
      const agent = conversation?.assignedAgentId
        ? await ctx.db.get(conversation.assignedAgentId)
        : null;
      const now = Date.now();
      await ctx.db.patch(event._id, {
        status: "cancelled",
        updatedAt: now,
      });
      await logConversationEvent(ctx, {
        conversationId: args.conversationId,
        action: "event_cancelled",
        actor: {
          type: "ai",
          name: agent?.name,
          agentId: agent?._id,
        },
        metadata: {
          eventId: event._id,
        },
      });
      await ctx.db.patch(booked._id, {
        status: AppointmentBookingSessionStatus.Cancelled,
        updatedAt: now,
      });
      if (conversation?.status === "booked") {
        await ctx.db.patch(args.conversationId, {
          status: "open",
          updatedAt: now,
        });
      }
      return { success: true, message: "Booking cancelled." };
    }

    if (
      active.calendarEventId !== undefined &&
      (active.status === AppointmentBookingSessionStatus.Editing ||
        active.status === AppointmentBookingSessionStatus.Confirming)
    ) {
      await ctx.db.patch(active._id, {
        status: AppointmentBookingSessionStatus.Booked,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        message: "Booking edit cancelled. The original booking is unchanged.",
      };
    }

    const conversation = await ctx.db.get(args.conversationId);
    const agent = conversation?.assignedAgentId
      ? await ctx.db.get(conversation.assignedAgentId)
      : null;

    const now = Date.now();
    if (active.calendarEventId !== undefined) {
      await ctx.db.patch(active.calendarEventId, {
        status: "cancelled",
        updatedAt: now,
      });
      await logConversationEvent(ctx, {
        conversationId: args.conversationId,
        action: "event_cancelled",
        actor: {
          type: "ai",
          name: agent?.name,
          agentId: agent?._id,
        },
        metadata: {
          eventId: active.calendarEventId,
        },
      });
    }

    await ctx.db.patch(active._id, {
      status: AppointmentBookingSessionStatus.Cancelled,
      updatedAt: now,
    });
    if (conversation?.status === "booked") {
      await ctx.db.patch(args.conversationId, {
        status: "open",
        updatedAt: now,
      });
    }
    return { success: true, message: "Booking cancelled." };
  },
});
