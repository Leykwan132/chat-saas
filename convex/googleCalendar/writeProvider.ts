import type { GoogleCalendarEvent } from "./eventMapping";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleClient";
import type { GoogleCalendarWriteInput } from "./writeTypes";

type Credential = { workosUserId: string };

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

export async function getGoogleCalendarEventForWrite(args: {
  credential: Credential;
  externalEventId: string;
  fetchImplementation: typeof fetch;
}) {
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    { method: "GET", path: eventPath(args.externalEventId) },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId);
}

export async function insertGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  operationKey: string;
  payloadFingerprint: string;
  event: GoogleCalendarWriteInput;
  fetchImplementation: typeof fetch;
}) {
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    {
      method: "POST",
      path: eventPath(),
      body: {
        ...args.event,
        id: args.externalEventId,
        extendedProperties: {
          private: {
            kilobotOperationKey: args.operationKey,
            kilobotOperationFingerprint: args.payloadFingerprint,
          },
        },
      },
    },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId);
}

export async function patchGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  knownEtag: string;
  operationKey: string;
  payloadFingerprint: string;
  event: GoogleCalendarWriteInput;
  fetchImplementation: typeof fetch;
}) {
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    {
      method: "PATCH",
      path: eventPath(args.externalEventId),
      body: {
        ...args.event,
        extendedProperties: {
          private: {
            kilobotOperationKey: args.operationKey,
            kilobotOperationFingerprint: args.payloadFingerprint,
          },
        },
      },
      ifMatch: args.knownEtag,
    },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId);
}

export async function removeGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  knownEtag: string;
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
