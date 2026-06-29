import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  AppointmentBookingSessionStatus,
  isActiveAppointmentBookingSessionStatus,
} from "../appointmentBookingSessionStatus";
import {
  formatBookingDateTime,
  serviceSnapshot,
} from "./fields";
import type { DbCtx } from "./types";
import { DEFAULT_TEAM_TIME_ZONE } from "../teamHelpers";

export async function getActiveSession(ctx: MutationCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(100);
  return sessions.find((session) => isActiveAppointmentBookingSessionStatus(session.status));
}

export async function getLatestBookedSession(ctx: DbCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(100);
  return sessions
    .filter(
      (session) =>
        session.status === AppointmentBookingSessionStatus.Booked &&
        session.calendarEventId !== undefined,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function getOrCreateSession(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  agentId: Id<"agents">,
) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(100);
  const active = sessions.find((session) => isActiveAppointmentBookingSessionStatus(session.status));
  if (active !== undefined) return active;
  const now = Date.now();
  const id = await ctx.db.insert("appointmentBookingSessions", {
    conversationId,
    agentId,
    status: AppointmentBookingSessionStatus.Collecting,
    collectedFields: {},
    createdAt: now,
    updatedAt: now,
  });
  const row = await ctx.db.get(id);
  if (row === null) {
    throw new Error("Failed to create booking session");
  }
  return row;
}

export async function getExistingBookingSession(ctx: DbCtx, conversationId: Id<"conversations">) {
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(100);
  return sessions
    .filter(
      (session) =>
        session.calendarEventId !== undefined &&
        (session.status === AppointmentBookingSessionStatus.Booked ||
          session.status === AppointmentBookingSessionStatus.Editing),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function formatBookingDetailsResponse(args: {
  session: Doc<"appointmentBookingSessions">;
  service: Doc<"appointmentServices">;
  event: Doc<"calendarEvents">;
  timeZone?: string;
  assignedTo?: string;
}) {
  const { date, timeRange } = formatBookingDateTime(
    args.event.startAt,
    args.event.endAt,
    args.timeZone ?? args.service.timeZone ?? DEFAULT_TEAM_TIME_ZONE,
  );
  return {
    bookingId: args.event._id,
    sessionId: args.session._id,
    status: args.session.status,
    service: serviceSnapshot(args.service),
    collectedFields: args.session.collectedFields,
    startAt: args.event.startAt,
    endAt: args.event.endAt,
    date,
    timeRange,
    teamMember: args.assignedTo,
    remarks: args.event.remarks,
  };
}
