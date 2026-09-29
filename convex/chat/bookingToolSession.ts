import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

type ActiveBookingSessionQueryResult = {
  success: boolean;
  hasActiveSession: boolean;
  bookingKind?: "single" | "batch";
  batchId?: Id<"appointmentBookingBatches">;
  sessionId?: Id<"appointmentBookingSessions">;
  status?: string;
  message?: string;
};

export async function queryActiveBookingSession(
  ctx: {
    runQuery: (
      query: typeof internal.appointmentBooking.currentBooking.getActiveBookingSession,
      args: { conversationId: Id<"conversations"> },
    ) => Promise<ActiveBookingSessionQueryResult>;
  },
  conversationId: Id<"conversations">,
): Promise<ActiveBookingSessionQueryResult> {
  return await ctx.runQuery(internal.appointmentBooking.currentBooking.getActiveBookingSession, {
    conversationId,
  });
}
