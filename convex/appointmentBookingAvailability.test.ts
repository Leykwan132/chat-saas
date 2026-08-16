import { expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { isAssignedToService } from "./appointmentBooking/availability";
import { availabilityRejectionReasons } from "./appointmentBooking/availabilityEligibility";
import type { AvailabilityRosterEntry } from "./appointmentBooking/availabilityRoster";

const service = {
  assignedWorkosUserIds: ["selected-user"],
} as Doc<"appointmentServices">;

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

  expect(inPersonReasons).not.toContain("google_calendar_unhealthy");
  expect(googleMeetReasons).toContain("google_calendar_unhealthy");
});
