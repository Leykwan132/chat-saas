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

export function isAssignedToService(service: Doc<"appointmentServices">, workosUserId: string) {
  return service.assignedWorkosUserIds === undefined || service.assignedWorkosUserIds.includes(workosUserId);
}

function overlappingTimeOffRows(startAt: number, endAt: number, rows: Doc<"userTimeOff">[]) {
  return rows.filter((row) => startAt < row.endAt && endAt > row.startAt);
}

function isWithinShift(
  startAt: number,
  endAt: number,
  schedule: Doc<"userSchedules">,
  shifts: Doc<"userShifts">[],
) {
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

export function availabilityDecisionDetails(args: {
  service: Doc<"appointmentServices">;
  entry: AvailabilityRosterEntry;
  startAt: number;
  endAt: number;
  excludeEventId?: Id<"calendarEvents">;
  ignoreGoogleHealth?: boolean;
}) {
  const start = getZonedDayAndMinutes(args.startAt, args.entry.schedule.timezone);
  const end = getZonedDayAndMinutes(
    Math.max(args.startAt, args.endAt - 1),
    args.entry.schedule.timezone,
  );
  const overlappingTimeOff = overlappingTimeOffRows(args.startAt, args.endAt, args.entry.timeOff);
  const calendarConflict = args.entry.calendarAvailability.safe &&
    calendarAvailabilityHasConflict(
      args.entry.calendarAvailability,
      args.startAt,
      args.endAt,
      args.excludeEventId,
    );
  const googleCalendarCheckRequired =
    args.service.locationMode === "remote" && !args.ignoreGoogleHealth;
  const checks = {
    hasUser: args.entry.user !== null,
    serviceAssigned: isAssignedToService(args.service, args.entry.schedule.workosUserId),
    withinShift: isWithinShift(
      args.startAt,
      args.endAt,
      args.entry.schedule,
      args.entry.shifts,
    ),
    timeOffOverlap: overlappingTimeOff.length > 0,
    googleCalendarHealthy: googleCalendarCheckRequired ? args.entry.googleCalendarHealthy : null,
    calendarDataSafe: args.entry.calendarAvailability.safe,
    calendarConflict,
  };
  const reasons: AvailabilityRejectionReason[] = [];
  if (!checks.hasUser) reasons.push("missing_user");
  if (!checks.serviceAssigned) reasons.push("service_not_assigned");
  if (!checks.withinShift) reasons.push("outside_shift");
  if (checks.timeOffOverlap) reasons.push("time_off");
  if (googleCalendarCheckRequired && checks.googleCalendarHealthy === false) {
    reasons.push("google_calendar_unhealthy");
  }
  if (!checks.calendarDataSafe) reasons.push("calendar_data_unavailable");
  else if (checks.calendarConflict) reasons.push("calendar_conflict");
  return {
    candidate: {
      startAt: args.startAt,
      endAt: args.endAt,
      local: {
        timeZone: args.entry.schedule.timezone,
        startDayOfWeek: start.dayOfWeek,
        startMinutes: start.minutes,
        endDayOfWeek: end.dayOfWeek,
        endMinutes: end.minutes,
      },
    },
    schedule: {
      scheduleId: args.entry.schedule._id,
      workosUserId: args.entry.schedule.workosUserId,
      userId: args.entry.user?._id,
      mode: args.entry.schedule.mode,
      manualStatus: args.entry.schedule.manualStatus,
      enabled: args.entry.schedule.enabled,
    },
    checks,
    matchedRows: {
      timeOffIds: overlappingTimeOff.map((row) => row._id),
      calendarEventIds: args.entry.calendarAvailability.intervals
        .filter((interval) =>
          interval.eventId !== args.excludeEventId &&
          args.startAt < interval.endAt &&
          args.endAt > interval.startAt,
        )
        .map((interval) => interval.eventId),
    },
    reasons,
  };
}

export function availabilityRejectionReasons(args: {
  service: Doc<"appointmentServices">;
  entry: AvailabilityRosterEntry;
  startAt: number;
  endAt: number;
  excludeEventId?: Id<"calendarEvents">;
  ignoreGoogleHealth?: boolean;
}): AvailabilityRejectionReason[] {
  return availabilityDecisionDetails(args).reasons;
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
