import { googleCalendarRequest } from "./googleClient";

export async function getPrimaryCalendarTimeZone(
  credential: { token: string },
  fallbackTimeZone: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const calendar = await googleCalendarRequest<{ timeZone?: string }>(
    credential,
    { method: "GET", path: "calendars/primary" },
    fetchImplementation,
  );
  const timeZone = calendar.timeZone?.trim();
  return timeZone && timeZone.length > 0 ? timeZone : fallbackTimeZone;
}
