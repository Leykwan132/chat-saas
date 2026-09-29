import { v } from "convex/values";
import { internalMutation } from "../triggers";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { getActiveSession } from "./sessionStore";

export const confirmBookingSlot = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return { success: false, message: "No active booking session. Call startBookingSession first." };
    }
    if (session.serviceId !== args.serviceId) {
      return { success: false, message: "The active booking session is for a different service." };
    }
    if (session.status !== AppointmentBookingSessionStatus.Confirming) {
      return { success: false, message: "Check availability before confirming a booking slot." };
    }
    const selectedSlot = session.proposedSlots?.find((slot) => slot.startAt === args.startAt);
    if (selectedSlot === undefined) {
      return { success: false, message: "Confirm a slot returned by checkAvailability." };
    }
    if (session.customerConfirmationMessageId !== undefined) {
      if (session.selectedSlot?.startAt !== args.startAt) {
        await ctx.db.patch(session._id, { selectedSlot });
      }
      return { success: true, selectedSlot };
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(50);
    const confirmationMessage = messages.find((message) => message.direction === "incoming");
    if (confirmationMessage === undefined || confirmationMessage.createdAt <= session.updatedAt) {
      return {
        success: false,
        message: "Wait for the customer to confirm a slot after availability was offered.",
      };
    }
    await ctx.db.patch(session._id, {
      selectedSlot,
      customerConfirmationMessageId: confirmationMessage._id,
    });
    return { success: true, selectedSlot };
  },
});
