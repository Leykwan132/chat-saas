import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Permission } from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { getAuthContext } from "../authUtils";
import { permissionsForCurrentUser } from "./access";
import { updateAppointmentBookingStatus } from "./statusTransition";

export const markBookingCompleted = mutation({
  args: { bookingId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CALENDAR_MANAGE)) {
      throw new Error("Forbidden");
    }

    const event = await ctx.db.get(args.bookingId);
    if (event === null || event.teamId !== auth.activeTeamId) {
      throw new Error("Booking not found");
    }
    const session = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
      .unique();
    if (session === null) {
      throw new Error("Booking session not found");
    }
    if (session.status !== AppointmentBookingSessionStatus.Booked) {
      throw new Error("Only booked appointments can be completed");
    }

    return await updateAppointmentBookingStatus(ctx, {
      bookingId: event._id,
      status: AppointmentBookingSessionStatus.Completed,
      teamId: auth.activeTeamId,
    });
  },
});
