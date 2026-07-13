import { v } from "convex/values";
import { Permission } from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { getAuthContext } from "../authUtils";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { permissionsForCurrentUser } from "./access";
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from "../workflowReminderRuntime";

export const editableBookingStatusValidator = v.union(
  v.literal(AppointmentBookingSessionStatus.Booked),
  v.literal(AppointmentBookingSessionStatus.Completed),
  v.literal(AppointmentBookingSessionStatus.Cancelled),
  v.literal(AppointmentBookingSessionStatus.NoShow),
);

type EditableBookingStatus =
  | typeof AppointmentBookingSessionStatus.Booked
  | typeof AppointmentBookingSessionStatus.Completed
  | typeof AppointmentBookingSessionStatus.Cancelled
  | typeof AppointmentBookingSessionStatus.NoShow;

const calendarStatusForBookingStatus = (
  status: EditableBookingStatus,
): "confirmed" | "cancelled" =>
  status === AppointmentBookingSessionStatus.Cancelled ? "cancelled" : "confirmed";

export const updateAppointmentBookingStatus = async (
  ctx: MutationCtx,
  args: {
    bookingId: Id<"calendarEvents">;
    status: EditableBookingStatus;
    teamId: Id<"teams">;
  },
) => {
  const event = await ctx.db.get(args.bookingId);
  if (event === null || event.teamId !== args.teamId) {
    throw new Error("Booking not found");
  }
  const session = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_calendarEventId", (q) => q.eq("calendarEventId", event._id))
    .unique();
  if (session === null) {
    throw new Error("Booking session not found");
  }
  const now = Date.now();
  await ctx.db.patch(session._id, { status: args.status, updatedAt: now });
  await ctx.db.patch(event._id, {
    status: calendarStatusForBookingStatus(args.status),
    updatedAt: now,
  });
  if (args.status === AppointmentBookingSessionStatus.Booked) {
    await scheduleWorkflowRemindersForAppointment(ctx, event._id);
  } else {
    await cancelWorkflowRemindersForAppointment(
      ctx,
      event._id,
      `Appointment marked ${args.status}`,
    );
  }
  return { success: true };
};

export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("calendarEvents"),
    status: editableBookingStatusValidator,
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    const permissions = await permissionsForCurrentUser(ctx);
    if (!permissions.includes(Permission.CALENDAR_MANAGE)) {
      throw new Error("Forbidden");
    }
    return await updateAppointmentBookingStatus(ctx, {
      ...args,
      teamId: auth.activeTeamId,
    });
  },
});
