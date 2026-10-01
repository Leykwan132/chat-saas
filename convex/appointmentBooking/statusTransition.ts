import { v } from "convex/values";
import { Permission } from "../../shared/permissions";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { getAuthContext } from "../authUtils";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { permissionsForCurrentUser } from "./access";
import {
  cancelWorkflowRemindersForAppointment,
  scheduleWorkflowRemindersForAppointment,
} from "../workflowReminderRuntime";
import { syncCalendarEventAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import { runCalendarEventGoogleCancellation } from "../googleCalendar/calendarEventSync";

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

const statusArgs = {
  bookingId: v.id("calendarEvents"),
  status: editableBookingStatusValidator,
};

const calendarStatusForBookingStatus = (
  status: EditableBookingStatus,
): "confirmed" | "cancelled" =>
  status === AppointmentBookingSessionStatus.Cancelled ? "cancelled" : "confirmed";

async function loadBookingForStatusChange(
  ctx: QueryCtx | MutationCtx,
  args: { bookingId: Id<"calendarEvents">; status: EditableBookingStatus; teamId: Id<"teams"> },
) {
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
  if (
    args.status !== AppointmentBookingSessionStatus.Cancelled &&
    event.externalProvider === "google" &&
    event.externalStatus === "cancelled"
  ) {
    throw new Error("This booking was removed from Google Calendar. Create a new booking instead.");
  }
  return { event, session };
}

async function authorizedTeamId(ctx: QueryCtx | MutationCtx) {
  const auth = await getAuthContext(ctx);
  const permissions = await permissionsForCurrentUser(ctx);
  if (!permissions.includes(Permission.CALENDAR_MANAGE)) {
    throw new Error("Forbidden");
  }
  return auth.activeTeamId;
}

export const updateAppointmentBookingStatus = async (
  ctx: MutationCtx,
  args: {
    bookingId: Id<"calendarEvents">;
    status: EditableBookingStatus;
    teamId: Id<"teams">;
  },
) => {
  const { event, session } = await loadBookingForStatusChange(ctx, args);
  const now = Date.now();
  await ctx.db.patch(session._id, { status: args.status, updatedAt: now });
  await ctx.db.patch(event._id, {
    status: calendarStatusForBookingStatus(args.status),
    updatedAt: now,
  });
  await syncCalendarEventAvailabilityIntervals(ctx, event._id, now);
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

export const validateBookingStatusChange = internalQuery({
  args: statusArgs,
  returns: v.object({ googleCancellationNeeded: v.boolean() }),
  handler: async (ctx, args) => {
    const { event } = await loadBookingForStatusChange(ctx, {
      ...args,
      teamId: await authorizedTeamId(ctx),
    });
    return {
      googleCancellationNeeded:
        args.status === AppointmentBookingSessionStatus.Cancelled &&
        event.externalEventId !== undefined &&
        event.externalStatus !== "cancelled",
    };
  },
});

export const applyBookingStatus = internalMutation({
  args: statusArgs,
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) =>
    await updateAppointmentBookingStatus(ctx, { ...args, teamId: await authorizedTeamId(ctx) }),
});

type StatusChangeArgs = { bookingId: Id<"calendarEvents">; status: EditableBookingStatus };

export async function runBookingStatusChange(
  args: StatusChangeArgs,
  dependencies: {
    validate: (args: StatusChangeArgs) => Promise<{ googleCancellationNeeded: boolean }>;
    cancelInGoogle: (args: { eventId: Id<"calendarEvents"> }) => Promise<unknown>;
    apply: (args: StatusChangeArgs) => Promise<{ success: boolean }>;
  },
) {
  const { googleCancellationNeeded } = await dependencies.validate(args);
  if (googleCancellationNeeded) await dependencies.cancelInGoogle({ eventId: args.bookingId });
  return await dependencies.apply(args);
}

export const updateBookingStatus = action({
  args: statusArgs,
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args): Promise<{ success: boolean }> =>
    await runBookingStatusChange(args, {
      validate: (validateArgs) => ctx.runQuery(
        internal.appointmentBooking.statusTransition.validateBookingStatusChange,
        validateArgs,
      ),
      cancelInGoogle: (cancelArgs) => runCalendarEventGoogleCancellation(ctx, cancelArgs),
      apply: (applyArgs) => ctx.runMutation(
        internal.appointmentBooking.statusTransition.applyBookingStatus,
        applyArgs,
      ),
    }),
});
