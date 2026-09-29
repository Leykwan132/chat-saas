import { v } from "convex/values";
import { internalMutation } from "../triggers";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { resolveBookingService } from "./access";
import { getActiveBatch } from "./batchStore";
import { missingBatchServiceFields } from "./batchAvailability";
import {
  mergeCollectedFields,
  missingServiceFields,
  serviceSnapshot,
} from "./fields";
import { getOrCreateSession } from "./sessionStore";
import { collectedFieldsValidator } from "./validators";

export const startBookingSession = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const activeBatch = await getActiveBatch(ctx, conversation._id);
    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId ?? activeBatch?.serviceId,
    );
    if (services.length === 0) {
      return { success: false, message: "No active Services are configured." };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        message: "Ask the customer which service they want before starting the booking session.",
      };
    }
    if (activeBatch !== undefined) {
      if (activeBatch.serviceId !== undefined && activeBatch.serviceId !== service._id) {
        return { success: false, message: "The active booking batch is for a different service." };
      }
      const collectedFields = mergeCollectedFields(activeBatch.collectedFields, args.collectedFields);
      const missingFields = missingBatchServiceFields(service, collectedFields);
      const status = missingFields.length === 0 && activeBatch.customerConfirmationMessageId !== undefined
        ? AppointmentBookingBatchStatus.Confirming
        : AppointmentBookingBatchStatus.Collecting;
      await ctx.db.patch(activeBatch._id, {
        serviceId: service._id,
        collectedFields,
        status,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        bookingKind: "batch" as const,
        batchId: activeBatch._id,
        status,
        service: serviceSnapshot(service),
        collectedFields,
        missingFields,
        readyForAvailability: missingFields.length === 0,
        readyForBooking: status === AppointmentBookingBatchStatus.Confirming,
      };
    }
    const now = Date.now();
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = mergeCollectedFields(session.collectedFields, args.collectedFields);
    const missing = missingServiceFields(service, collectedFields);
    const isEditing = session.calendarEventId !== undefined;
    const keepsConfirmedAvailability =
      session.serviceId === service._id &&
      session.customerConfirmationMessageId !== undefined &&
      (session.proposedSlots?.length ?? 0) > 0;
    const nextStatus = isEditing
      ? AppointmentBookingSessionStatus.Editing
      : keepsConfirmedAvailability && missing.length === 0
        ? AppointmentBookingSessionStatus.Confirming
        : AppointmentBookingSessionStatus.Collecting;
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      status: nextStatus,
      proposedSlots: keepsConfirmedAvailability ? session.proposedSlots : undefined,
      selectedSlot: undefined,
      customerConfirmationMessageId: keepsConfirmedAvailability
        ? session.customerConfirmationMessageId
        : undefined,
      updatedAt: now,
    });
    return {
      success: true,
      bookingKind: "single" as const,
      sessionId: session._id,
      status: nextStatus,
      isEditing,
      bookingId: session.calendarEventId,
      service: serviceSnapshot(service),
      collectedFields,
      missingFields: missing,
      readyForAvailability: missing.length === 0,
      readyForBooking: keepsConfirmedAvailability && missing.length === 0,
      message: missing.length > 0
        ? `${isEditing ? "Booking edit in progress" : "Booking session started"}. Still collecting: ${missing.join(", ")}`
        : isEditing
          ? "Booking details updated. Check availability if the time changed, then call updateBookingAppointment after the customer confirms."
          : keepsConfirmedAvailability
            ? "All required details are collected. Create the booking now."
            : "Booking session started. All required details are collected - you can check availability next.",
    };
  },
});
