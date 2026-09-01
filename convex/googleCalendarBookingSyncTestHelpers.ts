import type { GoogleCalendarEvent } from "./googleCalendar/eventMapping";

export function createGoogleCalendarBookingSyncFetch(): typeof fetch {
  return async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as GoogleCalendarEvent & { id?: string };
    return Response.json({
      id: body.id,
      status: "confirmed",
      summary: body.summary ?? "Consultation - Customer",
      etag: '"created"',
      organizer: { self: true },
      start: body.start,
      end: body.end,
      extendedProperties: body.extendedProperties,
    });
  };
}
