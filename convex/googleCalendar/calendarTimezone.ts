import { googleCalendarRequest } from "./googleClient";

export async function getPrimaryCalendar(
  actor: { workosUserId: string },
  fallbackTimeZone: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const calendar = await googleCalendarRequest<{ timeZone?: string; id?: string }>(
    actor,
    { method: "GET", path: "calendars/primary" },
    fetchImplementation,
  );
  const timeZone = calendar.timeZone?.trim();
  const calendarId = calendar.id?.trim();
  return {
    timeZone: timeZone && timeZone.length > 0 ? timeZone : fallbackTimeZone,
    calendarId: calendarId && calendarId.length > 0 ? calendarId : undefined,
  };
}
