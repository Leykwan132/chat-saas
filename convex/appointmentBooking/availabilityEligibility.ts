import type { Doc, Id } from "../_generated/dataModel";
import { getZonedDayAndMinutes } from "../leadRouting/eligibility";
import { calendarAvailabilityHasConflict } from "../googleCalendar/availability";
import type { AvailabilityRosterEntry } from "./availabilityRoster";

export type AvailabilityRejectionReason =
  | "missing_user"
  | "service_not_assigned"
  | "outside_shift"
  | "time_off"
  | "google_calendar_unhealthy"
  | "calendar_data_unavailable"
  | "calendar_conflict";

function isWithinShift(startAt: number, endAt: number, schedule: Doc<"userSchedules">, shifts: Doc<"userShifts">[]) {
  if (schedule.mode === "manual") return schedule.manualStatus === "available";
  const start = getZonedDayAndMinutes(startAt, schedule.timezone);
  const end = getZonedDayAndMinutes(Math.max(startAt, endAt - 1), schedule.timezone);
  if (start.dayOfWeek !== end.dayOfWeek) return false;
  return shifts.some(
    (shift) =>
      shift.dayOfWeek === start.dayOfWeek &&
      start.minutes >= shift.startMinutes &&
      end.minutes < shift.endMinutes,
  );
}

export function isAssignedToService(service: Doc<"appointmentServices">, workosUserId: string) {
  return service.assignedWorkosUserIds === undefined || service.assignedWorkosUserIds.includes(workosUserId);
}

function hasTimeOffOverlap(startAt: number, endAt: number, rows: Doc<"userTimeOff">[]) {
  return rows.some((row) => startAt < row.endAt && endAt > row.startAt);
}

export function availabilityRejectionReasons(args: {
  service: Doc<"appointmentServices">;
  entry: AvailabilityRosterEntry;
  startAt: number;
  endAt: number;
  excludeEventId?: Id<"calendarEvents">;
  ignoreGoogleHealth?: boolean;
}): AvailabilityRejectionReason[] {
  const reasons: AvailabilityRejectionReason[] = [];
  if (args.entry.user === null) reasons.push("missing_user");
  if (!isAssignedToService(args.service, args.entry.schedule.workosUserId)) reasons.push("service_not_assigned");
  if (!isWithinShift(args.startAt, args.endAt, args.entry.schedule, args.entry.shifts)) reasons.push("outside_shift");
  if (hasTimeOffOverlap(args.startAt, args.endAt, args.entry.timeOff)) reasons.push("time_off");
  if (
    args.service.locationMode === "remote" &&
    !args.ignoreGoogleHealth &&
    !args.entry.googleCalendarHealthy
  ) {
    reasons.push("google_calendar_unhealthy");
  }
  if (!args.entry.calendarAvailability.safe) reasons.push("calendar_data_unavailable");
  else if (calendarAvailabilityHasConflict(args.entry.calendarAvailability, args.startAt, args.endAt, args.excludeEventId)) {
    reasons.push("calendar_conflict");
  }
  return reasons;
}

export function entryAvailableForSlot(args: {
  service: Doc<"appointmentServices">;
  entry: AvailabilityRosterEntry;
  startAt: number;
  endAt: number;
  excludeEventId?: Id<"calendarEvents">;
  ignoreGoogleHealth?: boolean;
}) {
  return availabilityRejectionReasons(args).length === 0;
}
