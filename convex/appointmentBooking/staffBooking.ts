import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logConversationEvent } from "../conversationLogs";
import { handleBookingCreated } from "./bookingEvents";
import { bookingDisplayName } from "./fields";
import {
  createManualBookingRecords,
  type ManualBookingRecordIds,
} from "./manualBookingCore";
import type { BookingSlot, CollectedFields } from "./types";

type StaffBookingInput = {
  service: Doc<"appointmentServices">;
  team: Doc<"teams">;
  customer: Doc<"customers">;
  conversation?: Doc<"conversations">;
  assignedUser: Doc<"users">;
  selectedSlot: BookingSlot;
  collectedFields: CollectedFields;
  remarks?: string;
  recordInboxBooking: boolean;
};

export async function createStaffBooking(
  ctx: MutationCtx,
  args: StaffBookingInput,
): Promise<ManualBookingRecordIds> {
  const { eventId, sessionId } = await createManualBookingRecords(ctx, {
    service: args.service,
    team: args.team,
    customer: args.customer,
    conversation: args.conversation,
    assignedUser: args.assignedUser,
    selectedSlot: args.selectedSlot,
    collectedFields: args.collectedFields,
    remarks: args.remarks,
    bookingSource: "manual",
  });
  if (args.recordInboxBooking) {
    if (!args.conversation) {
      throw new Error("Inbox staff booking requires a conversation");
    }
    const attendeeName = bookingDisplayName(args.collectedFields);
    await ctx.db.patch(args.conversation._id, {
      status: "booked",
      updatedAt: Date.now(),
    });
    await logConversationEvent(ctx, {
      conversationId: args.conversation._id,
      action: "event_booked",
      metadata: {
        eventId,
        eventTitle: `${args.service.name} - ${attendeeName}`,
        startAt: args.selectedSlot.startAt,
      },
    });
  }
  await handleBookingCreated(ctx, eventId);
  return { eventId, sessionId };
}
