import { v } from "convex/values";
import { Permission } from "../../shared/permissions";
import { getAuthContext } from "../authUtils";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { query } from "../_generated/server";
import { permissionsForCurrentUser } from "./access";

export const getEditBookingStatus = query({
  args: { bookingId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CALENDAR_READ)) {
      throw new Error("Forbidden");
    }
    const event = await ctx.db.get(args.bookingId);
    if (event === null || event.teamId !== auth.activeTeamId) {
      return { kind: "missing_event" as const };
    }
    const session = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
      .unique();
    if (session === null) {
      return { kind: "missing_session" as const };
    }
    const { status } = session;
    if (
      status === AppointmentBookingSessionStatus.Booked ||
      status === AppointmentBookingSessionStatus.Completed ||
      status === AppointmentBookingSessionStatus.Cancelled ||
      status === AppointmentBookingSessionStatus.NoShow
    ) {
      return { kind: "editable" as const, status };
    }
    return { kind: "unsupported_status" as const, status };
  },
});
