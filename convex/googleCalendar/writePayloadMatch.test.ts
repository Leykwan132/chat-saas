import { describe, expect, test } from "vitest";
import type { GoogleCalendarEvent } from "./eventMapping";
import { providerMatchesGoogleCalendarWriteInput } from "./writePayloadMatch";
import type { GoogleCalendarWriteInput } from "./writeTypes";

const intended: GoogleCalendarWriteInput = {
  summary: "Appointment",
  description: "Details",
  location: "Room 1",
  start: { dateTime: "2026-08-15T01:00:00.000Z", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T02:00:00.000Z", timeZone: "Asia/Kuala_Lumpur" },
  transparency: "transparent",
  attendees: [
    { email: "b@example.com" },
    { email: "a@example.com", displayName: "A" },
  ],
};

const provider: GoogleCalendarEvent = {
  id: "event", status: "confirmed", summary: "Appointment",
  description: "Details", location: "Room 1", transparency: "transparent",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  attendees: [
    { email: "a@example.com", displayName: "A" },
    { email: "b@example.com" },
  ],
};

describe("Google Calendar recovery payload matching", () => {
  test("matches semantic instants and attendee order independently", () => {
    expect(providerMatchesGoogleCalendarWriteInput(provider, intended)).toBe(true);
  });

  test.each([
    ["summary", { summary: "Human edit" }],
    ["description", { description: "Human edit" }],
    ["location", { location: "Room 2" }],
    ["transparency", { transparency: "opaque" }],
    ["start instant", { start: { dateTime: "2026-08-15T09:01:00+08:00", timeZone: "Asia/Kuala_Lumpur" } }],
    ["end timezone", { end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "UTC" } }],
    ["attendees", { attendees: [{ email: "other@example.com" }] }],
  ])("rejects a changed %s", (_label, providerPatch) => {
    expect(providerMatchesGoogleCalendarWriteInput(
      { ...provider, ...providerPatch } as GoogleCalendarEvent,
      intended,
    )).toBe(false);
  });

  test("distinguishes all-day and timed boundaries", () => {
    expect(providerMatchesGoogleCalendarWriteInput(
      { ...provider, start: { date: "2026-08-15" }, end: { date: "2026-08-16" } },
      intended,
    )).toBe(false);
  });

  test("ignores omitted PATCH fields and accepts explicit string clearing", () => {
    const patch: GoogleCalendarWriteInput = {
      summary: "Appointment",
      description: "",
      start: intended.start,
      end: intended.end,
    };
    expect(providerMatchesGoogleCalendarWriteInput(
      { ...provider, description: undefined, location: "Human edit", transparency: "opaque" },
      patch,
    )).toBe(true);
  });
});
