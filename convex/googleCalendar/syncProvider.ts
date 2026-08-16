import type { GoogleCalendarEvent } from "./eventMapping";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleClient";
import type {
  GoogleCalendarSyncPage,
  GoogleCalendarSyncRequest,
} from "./syncTypes";

function listEventsPath(request: GoogleCalendarSyncRequest) {
  const params = new URLSearchParams({
    singleEvents: String(request.singleEvents),
    showDeleted: String(request.showDeleted),
    maxResults: String(request.pageSize),
  });
  if (request.syncToken !== undefined) params.set("syncToken", request.syncToken);
  if (request.timeMin !== undefined) {
    params.set("timeMin", new Date(request.timeMin).toISOString());
  }
  if (request.timeMax !== undefined) {
    params.set("timeMax", new Date(request.timeMax).toISOString());
  }
  if (request.pageToken !== undefined) params.set("pageToken", request.pageToken);
  return `calendars/primary/events?${params.toString()}`;
}

function validatedPage(value: unknown): GoogleCalendarSyncPage {
  if (typeof value !== "object" || value === null) {
    throw new GoogleCalendarProviderError("failed");
  }
  const page = value as {
    items?: unknown;
    nextPageToken?: unknown;
    nextSyncToken?: unknown;
  };
  if (page.items !== undefined && !Array.isArray(page.items)) {
    throw new GoogleCalendarProviderError("failed");
  }
  if (page.nextPageToken !== undefined && typeof page.nextPageToken !== "string") {
    throw new GoogleCalendarProviderError("failed");
  }
  if (page.nextSyncToken !== undefined && typeof page.nextSyncToken !== "string") {
    throw new GoogleCalendarProviderError("failed");
  }
  return {
    items: (page.items ?? []) as GoogleCalendarEvent[],
    nextPageToken: page.nextPageToken,
    nextSyncToken: page.nextSyncToken,
  };
}

export async function listGoogleCalendarPage(
  actor: { workosUserId: string },
  request: GoogleCalendarSyncRequest,
  fetchImplementation: typeof fetch = fetch,
) {
  const page = await googleCalendarRequest<unknown>(
    actor,
    {
      method: "GET",
      path: listEventsPath(request),
      invalidSyncTokenOnGone: request.kind === "incremental",
    },
    fetchImplementation,
  );
  return validatedPage(page);
}
