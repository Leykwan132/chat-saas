import type { GoogleCalendarEvent } from "./eventMapping";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleClient";
import type { GoogleCalendarWriteInput } from "./writeTypes";

type Credential = { token: string };

function eventPath(externalEventId?: string) {
  const suffix = externalEventId === undefined ? "" : `/${encodeURIComponent(externalEventId)}`;
  return `calendars/primary/events${suffix}`;
}

function providerEvent(value: unknown, expectedId: string) {
  if (typeof value !== "object" || value === null) {
    throw new GoogleCalendarProviderError("failed");
  }
  const event = value as GoogleCalendarEvent;
  if (
    event.id !== expectedId ||
    (event.status !== "confirmed" && event.status !== "tentative" && event.status !== "cancelled")
  ) {
    throw new GoogleCalendarProviderError("failed");
  }
  return event;
}

async function getEvent(
  credential: Credential,
  externalEventId: string,
  fetchImplementation: typeof fetch,
) {
  const value = await googleCalendarRequest<unknown>(
    credential,
    { method: "GET", path: eventPath(externalEventId) },
    fetchImplementation,
  );
  return providerEvent(value, externalEventId);
}

export async function insertGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  operationKey: string;
  event: GoogleCalendarWriteInput;
  fetchImplementation: typeof fetch;
}) {
  try {
    const value = await googleCalendarRequest<unknown>(
      args.credential,
      {
        method: "POST",
        path: eventPath(),
        body: {
          ...args.event,
          id: args.externalEventId,
          extendedProperties: {
            private: { kilobotOperationKey: args.operationKey },
          },
        },
      },
      args.fetchImplementation,
    );
    return providerEvent(value, args.externalEventId);
  } catch (error) {
    if (!(error instanceof GoogleCalendarProviderError) || error.kind !== "conflict") {
      throw error;
    }
    const existing = await getEvent(
      args.credential,
      args.externalEventId,
      args.fetchImplementation,
    );
    if (
      existing.extendedProperties?.private?.kilobotOperationKey !== args.operationKey
    ) {
      throw new GoogleCalendarProviderError("conflict");
    }
    return existing;
  }
}

export async function patchGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  knownEtag?: string;
  event: GoogleCalendarWriteInput;
  fetchImplementation: typeof fetch;
}) {
  const current = await getEvent(
    args.credential,
    args.externalEventId,
    args.fetchImplementation,
  );
  if (
    args.knownEtag === undefined || current.etag === undefined ||
    current.etag !== args.knownEtag
  ) {
    throw new GoogleCalendarProviderError("conflict");
  }
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    {
      method: "PATCH",
      path: eventPath(args.externalEventId),
      body: args.event,
      ifMatch: current.etag,
    },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId);
}

export async function removeGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  knownEtag?: string;
  fetchImplementation: typeof fetch;
}) {
  await googleCalendarRequest<undefined>(
    args.credential,
    {
      method: "DELETE",
      path: eventPath(args.externalEventId),
      ifMatch: args.knownEtag,
    },
    args.fetchImplementation,
  );
}
