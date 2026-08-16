import type { GoogleCalendarEvent } from "./eventMapping";
import {
  GoogleCalendarProviderError,
  googleCalendarRequest,
} from "./googleClient";
import type { GoogleCalendarWriteInput } from "./writeTypes";

type Credential = { workosUserId: string };

function eventPath(externalEventId?: string, conferenceDataVersion = false) {
  const suffix = externalEventId === undefined ? "" : `/${encodeURIComponent(externalEventId)}`;
  return `calendars/primary/events${suffix}${conferenceDataVersion ? "?conferenceDataVersion=1" : ""}`;
}

function providerMeetLink(event: GoogleCalendarEvent) {
  return event.hangoutLink ?? event.conferenceData?.entryPoints
    ?.find((entryPoint) => entryPoint.entryPointType === "video")?.uri;
}

function providerEvent(value: unknown, expectedId: string, conferenceRequired = false) {
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
  if (conferenceRequired && providerMeetLink(event) === undefined) {
    throw new GoogleCalendarProviderError("failed", "Google Calendar did not create a Meet link.");
  }
  return event;
}

export async function getGoogleCalendarEventForWrite(args: {
  credential: Credential;
  externalEventId: string;
  conferenceRequired?: boolean;
  fetchImplementation: typeof fetch;
}) {
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    { method: "GET", path: eventPath(args.externalEventId) },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId, args.conferenceRequired);
}

export async function insertGoogleCalendarEvent(args: {
  credential: Credential;
  externalEventId: string;
  operationKey: string;
  payloadFingerprint: string;
  event: GoogleCalendarWriteInput;
  fetchImplementation: typeof fetch;
}) {
  const { conferenceRequestId, ...event } = args.event;
  const value = await googleCalendarRequest<unknown>(
    args.credential,
    {
      method: "POST",
      path: eventPath(undefined, conferenceRequestId !== undefined),
      body: {
        ...event,
        id: args.externalEventId,
        extendedProperties: {
          private: {
            kilobotOperationKey: args.operationKey,
            kilobotOperationFingerprint: args.payloadFingerprint,
          },
        },
        ...(conferenceRequestId === undefined ? {} : {
          conferenceData: {
            createRequest: {
              requestId: conferenceRequestId,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      },
    },
    args.fetchImplementation,
  );
  return providerEvent(value, args.externalEventId, conferenceRequestId !== undefined);
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
