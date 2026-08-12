import type { GoogleCalendarEvent, GoogleCalendarEventDateTime } from "./eventMapping";
import type { GoogleCalendarWriteInput } from "./writeTypes";

function matchesOptionalString(provider: string | undefined, intended: string | undefined) {
  if (intended === undefined) return true;
  return intended === "" ? provider === undefined || provider === "" : provider === intended;
}

function sameInstant(left: string, right: string) {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function matchesBoundary(
  provider: GoogleCalendarEventDateTime | undefined,
  intended: GoogleCalendarWriteInput["start"],
) {
  if (provider === undefined) return false;
  if (intended.date !== undefined && (
    provider.date !== intended.date || provider.dateTime !== undefined
  )) return false;
  if (intended.dateTime !== undefined && (
    provider.dateTime === undefined || provider.date !== undefined ||
    !sameInstant(provider.dateTime, intended.dateTime)
  )) return false;
  return intended.timeZone === undefined || provider.timeZone === intended.timeZone;
}

function attendeeKey(attendee: { email?: string; displayName?: string }) {
  return `${attendee.email ?? ""}\u0000${attendee.displayName ?? ""}`;
}

function sortedAttendees(attendees: Array<{ email?: string; displayName?: string }>) {
  return attendees.map(attendeeKey).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function matchesAttendees(
  provider: GoogleCalendarEvent["attendees"],
  intended: GoogleCalendarWriteInput["attendees"],
) {
  if (intended === undefined) return true;
  const providerKeys = sortedAttendees(provider ?? []);
  const intendedKeys = sortedAttendees(intended);
  return providerKeys.length === intendedKeys.length &&
    providerKeys.every((value, index) => value === intendedKeys[index]);
}

export function providerMatchesGoogleCalendarWriteInput(
  provider: GoogleCalendarEvent,
  intended: GoogleCalendarWriteInput,
) {
  return provider.status !== "cancelled" && provider.summary === intended.summary &&
    matchesOptionalString(provider.description, intended.description) &&
    matchesOptionalString(provider.location, intended.location) &&
    matchesBoundary(provider.start, intended.start) &&
    matchesBoundary(provider.end, intended.end) &&
    (intended.transparency === undefined || provider.transparency === intended.transparency) &&
    matchesAttendees(provider.attendees, intended.attendees);
}
