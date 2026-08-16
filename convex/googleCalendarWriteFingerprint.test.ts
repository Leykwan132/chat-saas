import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import { fingerprintGoogleCalendarWritePayload } from "./googleCalendar/writeFingerprint";
import type { GoogleCalendarWriteInput } from "./googleCalendar/writeTypes";

const eventInput: GoogleCalendarWriteInput = {
  summary: "Customer appointment",
  start: { dateTime: "2026-08-15T09:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
  end: { dateTime: "2026-08-15T10:00:00+08:00", timeZone: "Asia/Kuala_Lumpur" },
};

async function fingerprint(event: GoogleCalendarWriteInput) {
  return await fingerprintGoogleCalendarWritePayload({
    action: "update",
    connectionId: "connection" as Id<"googleCalendarConnections">,
    calendarEventId: "event" as Id<"calendarEvents">,
    externalEventId: "external",
    payloadPreconditionEtag: '"etag"',
    event,
  });
}

test("canonical payload preserves every optional Google PATCH field presence", async () => {
  const cases: Array<[string, GoogleCalendarWriteInput]> = [
    ["description", { ...eventInput, description: "" }],
    ["location", { ...eventInput, location: "" }],
    ["transparency", { ...eventInput, transparency: "opaque" }],
    ["attendees", { ...eventInput, attendees: [] }],
    ["start date", { ...eventInput, start: { ...eventInput.start, date: "" } }],
    ["start dateTime", { ...eventInput, start: { timeZone: eventInput.start.timeZone } }],
    ["start timeZone", { ...eventInput, start: { dateTime: eventInput.start.dateTime } }],
    ["end date", { ...eventInput, end: { ...eventInput.end, date: "" } }],
    ["end dateTime", { ...eventInput, end: { timeZone: eventInput.end.timeZone } }],
    ["end timeZone", { ...eventInput, end: { dateTime: eventInput.end.dateTime } }],
  ];
  const baseline = await fingerprint(eventInput);
  for (const [field, changed] of cases) {
    expect(await fingerprint(changed), field).not.toBe(baseline);
  }
  expect(await fingerprint({ ...eventInput, attendees: [{ email: "a@example.com" }] }))
    .not.toBe(await fingerprint({
      ...eventInput, attendees: [{ email: "a@example.com", displayName: "" }],
    }));
});

test("canonical payload treats attendee ordering as equivalent", async () => {
  const first = { email: "z@example.com", displayName: "Zulu" };
  const second = { email: "a@example.com", displayName: "Alpha" };
  expect(await fingerprint({ ...eventInput, attendees: [first, second] }))
    .toBe(await fingerprint({ ...eventInput, attendees: [second, first] }));
});
