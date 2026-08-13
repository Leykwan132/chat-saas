import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { bookingToolResultValidator } from "../googleCalendar/bookingTypes";
import {
  googleCalendarBookingSyncDependencies,
  runCancelBookingSession,
} from "../googleCalendar/bookingSync";

export const cancelBookingSession = internalAction({
  args: { conversationId: v.id("conversations") },
  returns: bookingToolResultValidator,
  handler: async (ctx, args) =>
    runCancelBookingSession(args, googleCalendarBookingSyncDependencies(ctx)),
});
