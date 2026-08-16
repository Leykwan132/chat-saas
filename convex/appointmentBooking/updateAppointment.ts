import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { bookingToolResultValidator } from "../googleCalendar/bookingTypes";
import {
  googleCalendarBookingSyncDependencies,
  runUpdateBookingAppointment,
} from "../googleCalendar/bookingSync";

export const updateBookingAppointment = internalAction({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  returns: bookingToolResultValidator,
  handler: async (ctx, args) =>
    runUpdateBookingAppointment(args, googleCalendarBookingSyncDependencies(ctx)),
});
