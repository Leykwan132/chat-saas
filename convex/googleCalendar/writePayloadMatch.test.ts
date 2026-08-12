import { describe, expect, test } from "vitest";
import type { GoogleCalendarEvent } from "./eventMapping";
import {
  providerMatchesGoogleCalendarCreateInput,
  providerMatchesGoogleCalendarUpdateInput,
} from "./writePayloadMatch";
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
    expect(providerMatchesGoogleCalendarUpdateInput(provider, intended)).toBe(true);
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
    expect(providerMatchesGoogleCalendarUpdateInput(
      { ...provider, ...providerPatch } as GoogleCalendarEvent,
      intended,
    )).toBe(false);
  });

  test("distinguishes all-day and timed boundaries", () => {
    expect(providerMatchesGoogleCalendarUpdateInput(
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
    expect(providerMatchesGoogleCalendarUpdateInput(
      { ...provider, description: undefined, location: "Human edit", transparency: "opaque" },
      patch,
    )).toBe(true);
  });

  test("create accepts normalized defaults for omitted optional fields", () => {
    const create = { summary: intended.summary, start: intended.start, end: intended.end };
    expect(providerMatchesGoogleCalendarCreateInput({
      ...provider, description: undefined, location: "", transparency: "opaque", attendees: [],
    }, create)).toBe(true);
  });

  test("create requires explicitly present optional strings exactly", () => {
    const create = {
      summary: intended.summary, description: "", start: intended.start, end: intended.end,
    };
    expect(providerMatchesGoogleCalendarCreateInput({
      ...provider, description: undefined, location: undefined,
      transparency: "opaque", attendees: [],
    }, create)).toBe(false);
    expect(providerMatchesGoogleCalendarCreateInput({
      ...provider, description: "", location: undefined,
      transparency: "opaque", attendees: [],
    }, create)).toBe(true);
  });

  test.each([
    ["description", { description: "Human edit" }],
    ["location", { location: "Human edit" }],
    ["transparency", { transparency: "transparent" }],
    ["attendees", { attendees: [{ email: "human@example.com" }] }],
  ])("create rejects provider %s drift when the field was omitted", (_label, patch) => {
    const create = { summary: intended.summary, start: intended.start, end: intended.end };
    expect(providerMatchesGoogleCalendarCreateInput(
      { ...provider, description: undefined, location: undefined, transparency: "opaque", attendees: [], ...patch } as GoogleCalendarEvent,
      create,
    )).toBe(false);
  });
});
