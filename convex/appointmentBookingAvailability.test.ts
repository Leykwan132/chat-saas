import { afterEach, expect, test, vi } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { isAssignedToService } from "./appointmentBooking/availability";
import {
  availabilityDecisionDetails,
  availabilityRejectionReasons,
} from "./appointmentBooking/availabilityEligibility";
import type { AvailabilityRosterEntry } from "./appointmentBooking/availabilityRoster";
import { validateAvailabilityDates } from "./appointmentBooking/dateValidation";
import {
  ensureAvailabilityTimesInReplies,
  formatAvailabilitySlotsForTool,
} from "./appointmentBooking/availabilityPresentation";

const service = {
  assignedWorkosUserIds: ["selected-user"],
} as Doc<"appointmentServices">;

afterEach(() => {
  vi.restoreAllMocks();
});

test("only considers teammates selected for a service", () => {
  expect(isAssignedToService(service, "selected-user")).toBe(true);
  expect(isAssignedToService(service, "unselected-user")).toBe(false);
});

test("keeps existing services bookable during the assignment migration", () => {
  expect(isAssignedToService({} as Doc<"appointmentServices">, "any-user")).toBe(true);
});

const scheduledEntry = {
  user: {} as Doc<"users">,
  schedule: {
    workosUserId: "selected-user",
    timezone: "UTC",
  } as Doc<"userSchedules">,
  shifts: [{ dayOfWeek: 1, startMinutes: 0, endMinutes: 24 * 60 }] as Doc<"userShifts">[],
  timeOff: [],
  googleCalendarHealthy: false,
  calendarAvailability: { safe: true, intervals: [] },
  futureAssignedEventCount: 0,
} as AvailabilityRosterEntry;

test("only requires Google Calendar health for Google Meet services", () => {
  const bookingInterval = {
    startAt: Date.UTC(2026, 7, 17, 9),
    endAt: Date.UTC(2026, 7, 17, 9, 30),
  };

  const inPersonReasons = availabilityRejectionReasons({
    service: { assignedWorkosUserIds: ["selected-user"], locationMode: "in_person" } as Doc<"appointmentServices">,
    entry: scheduledEntry,
    ...bookingInterval,
  });
  const googleMeetReasons = availabilityRejectionReasons({
    service: { assignedWorkosUserIds: ["selected-user"], locationMode: "remote" } as Doc<"appointmentServices">,
    entry: scheduledEntry,
    ...bookingInterval,
  });
  const videoCallReasons = availabilityRejectionReasons({
    service: { assignedWorkosUserIds: ["selected-user"], locationMode: "video_call" } as Doc<"appointmentServices">,
    entry: scheduledEntry,
    ...bookingInterval,
  });

  expect(inPersonReasons).not.toContain("google_calendar_unhealthy");
  expect(videoCallReasons).not.toContain("google_calendar_unhealthy");
  expect(googleMeetReasons).toContain("google_calendar_unhealthy");
});

test("availability eligibility does not emit temporary debug logs", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  availabilityRejectionReasons({
    service: { assignedWorkosUserIds: ["selected-user"], locationMode: "in_person" } as Doc<"appointmentServices">,
    entry: scheduledEntry,
    startAt: Date.UTC(2026, 7, 17, 9),
    endAt: Date.UTC(2026, 7, 17, 9, 30),
  });

  expect(log).not.toHaveBeenCalled();
});

test("reports the checks and records that caused a candidate rejection", () => {
  const startAt = Date.UTC(2026, 7, 17, 9);
  const endAt = Date.UTC(2026, 7, 17, 9, 30);
  const details = availabilityDecisionDetails({
    service: {
      assignedWorkosUserIds: ["other-user"],
      locationMode: "remote",
    } as Doc<"appointmentServices">,
    entry: {
      ...scheduledEntry,
      schedule: {
        ...scheduledEntry.schedule,
        _id: "schedule-1",
        agentId: "agent-1",
        mode: "scheduled",
        manualStatus: "available",
        enabled: true,
      } as Doc<"userSchedules">,
      shifts: [{
        _id: "shift-1",
        dayOfWeek: 2,
        startMinutes: 600,
        endMinutes: 1020,
        userScheduleId: "schedule-1",
      }] as Doc<"userShifts">[],
      timeOff: [{
        _id: "time-off-1",
        userScheduleId: "schedule-1",
        startAt: startAt - 1,
        endAt: endAt + 1,
        label: "Lunch",
      }] as Doc<"userTimeOff">[],
      calendarAvailability: {
        safe: true,
        intervals: [{
          eventId: "event-1",
          startAt: startAt - 1,
          endAt: endAt + 1,
        }],
      },
      googleCalendarHealthy: false,
    } as AvailabilityRosterEntry,
    startAt,
    endAt,
  });

  expect(details.reasons).toEqual([
    "service_not_assigned",
    "outside_shift",
    "time_off",
    "google_calendar_unhealthy",
    "calendar_conflict",
  ]);
  expect(details.checks).toMatchObject({
    hasUser: true,
    serviceAssigned: false,
    withinShift: false,
    timeOffOverlap: true,
    googleCalendarHealthy: false,
    calendarDataSafe: true,
    calendarConflict: true,
  });
  expect(details.matchedRows).toEqual({
    timeOffIds: ["time-off-1"],
    calendarEventIds: ["event-1"],
  });
});

test("rejects availability dates before today in the service timezone", () => {
  const now = Date.parse("2026-09-10T08:05:19.803Z");

  expect(validateAvailabilityDates({
    now,
    timeZone: "Asia/Kuala_Lumpur",
    rangeStartAt: Date.parse("2025-01-21T00:00:00Z"),
    rangeEndAt: Date.parse("2025-01-21T23:59:59Z"),
  })).toEqual({
    code: "past_date",
    todayDate: "2026-09-10",
  });

  expect(validateAvailabilityDates({
    now,
    timeZone: "Asia/Kuala_Lumpur",
    rangeStartAt: Date.parse("2026-09-10T00:00:00Z"),
    rangeEndAt: Date.parse("2026-09-10T23:59:59Z"),
  })).toBeNull();
});

test("formats returned slots with an exact date and time range", () => {
  const formatted = formatAvailabilitySlotsForTool([
    {
      startAt: Date.UTC(2026, 8, 11, 1),
      endAt: Date.UTC(2026, 8, 11, 1, 30),
      assignedUserId: "user-1",
      assignedWorkosUserId: "workos-1",
      assignedDisplayName: "Kwan Kwan",
    },
  ], "Asia/Kuala_Lumpur");

  expect(formatted[0]).toMatchObject({
    startTimeIso: "2026-09-11T01:00:00.000Z",
    endTimeIso: "2026-09-11T01:30:00.000Z",
    date: "September 11 (Friday)",
    timeRange: "9:00 AM - 9:30 AM",
  });
});

test("summarizes more than five contiguous slots into a time range", () => {
  const startAt = Date.UTC(2026, 8, 11, 1);
  const formatted = formatAvailabilitySlotsForTool(
    Array.from({ length: 6 }, (_, index) => ({
      startAt: startAt + index * 30 * 60 * 1000,
      endAt: startAt + (index + 1) * 30 * 60 * 1000,
      assignedUserId: "user-1",
      assignedWorkosUserId: "workos-1",
      assignedDisplayName: "Kwan Kwan",
    })),
    "Asia/Kuala_Lumpur",
  );

  expect(formatted).toHaveLength(1);
  expect(formatted[0]).toMatchObject({
    date: "September 11 (Friday)",
    timeRange: "9:00 AM - 12:00 PM",
    endTimeIso: "2026-09-11T04:00:00.000Z",
    slotCount: 6,
  });
});

test("inserts exact times when the generated reply uses generic slot labels", () => {
  const formattedSlots = formatAvailabilitySlotsForTool([
    {
      startAt: Date.UTC(2026, 8, 11, 1),
      endAt: Date.UTC(2026, 8, 11, 1, 30),
      assignedUserId: "user-1",
      assignedWorkosUserId: "workos-1",
      assignedDisplayName: "Kwan Kwan",
    },
  ], "Asia/Kuala_Lumpur");

  const replies = ensureAvailabilityTimesInReplies(
    ["There is one morning session available."],
    [{ toolName: "checkAvailability", output: { success: true, slots: formattedSlots } }],
  );

  expect(replies[0]).toContain("September 11 (Friday), 9:00 AM - 9:30 AM");
  expect(replies[0]).toContain("There is one morning session available.");
});
