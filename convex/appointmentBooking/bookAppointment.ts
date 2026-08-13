import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { bookingToolResultValidator } from "../googleCalendar/bookingTypes";
import {
  googleCalendarBookingSyncDependencies,
  runBookAppointment,
} from "../googleCalendar/bookingSync";

export const bookAppointment = internalAction({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  returns: bookingToolResultValidator,
  handler: async (ctx, args) =>
    runBookAppointment(args, googleCalendarBookingSyncDependencies(ctx)),
});
