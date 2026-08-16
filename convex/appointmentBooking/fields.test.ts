import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { buildBookingConfirmationMessage } from "./fields";

const bookingId = "booking-id" as Id<"calendarEvents">;

test("includes the Google Meet link in a remote booking confirmation", () => {
  const message = buildBookingConfirmationMessage({
    service: {
      name: "Remote consultation",
      fields: [],
      timeZone: "UTC",
      locationMode: "remote",
    },
    collectedFields: {},
    startAt: Date.UTC(2026, 7, 17, 9, 0),
    endAt: Date.UTC(2026, 7, 17, 9, 30),
    bookingId,
    meetingLink: "https://meet.google.com/abc-defg-hij",
  });

  expect(message).toContain("Meeting link: https://meet.google.com/abc-defg-hij");
});

test("does not include a meeting link for an in-person booking", () => {
  const message = buildBookingConfirmationMessage({
    service: {
      name: "In-person consultation",
      fields: [],
      timeZone: "UTC",
      locationMode: "in_person",
    },
    collectedFields: {},
    startAt: Date.UTC(2026, 7, 17, 9, 0),
    endAt: Date.UTC(2026, 7, 17, 9, 30),
    bookingId,
    meetingLink: "https://meet.google.com/abc-defg-hij",
  });

  expect(message).not.toContain("Meeting link:");
});
