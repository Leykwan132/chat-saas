import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import {
  batchBookingSyncDependencies,
  runBookAppointments,
} from "../googleCalendar/batchBookingSync";

export const bookAppointments = internalAction({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAts: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    return await runBookAppointments(args, batchBookingSyncDependencies(ctx));
  },
});
