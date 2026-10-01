import { expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  buildBookingConfirmationMessage,
  DEFAULT_SERVICE_FIELDS,
  mergeCollectedFields,
} from "./fields";

const bookingId = "booking-id" as Id<"calendarEvents">;

test("drops agent-invented keys that the service does not ask for", () => {
  const merged = mergeCollectedFields(
    { fields: DEFAULT_SERVICE_FIELDS },
    { name: "Kwan" },
    {
      phone: "+60123456789",
      email: "kwan@example.com",
      grouped_times: "2026-10-05T15:00:00+08:00,2026-10-06T14:00:00+08:00",
    },
  );

  expect(merged).toEqual({ name: "Kwan", phone: "+60123456789", email: "kwan@example.com" });
});

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
