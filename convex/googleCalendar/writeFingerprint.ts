import type { Id } from "../_generated/dataModel";
import type { GoogleCalendarWriteInput } from "./writeTypes";

const BASE32HEX_ALPHABET = "0123456789abcdefghijklmnopqrstuv";

function compareCodePoints(left: string, right: string) {
  const leftCodePoints = Array.from(left, (value) => value.codePointAt(0)!);
  const rightCodePoints = Array.from(right, (value) => value.codePointAt(0)!);
  const length = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftCodePoints[index] !== rightCodePoints[index]) {
      return leftCodePoints[index] - rightCodePoints[index];
    }
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => compareCodePoints(left, right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

function optionalValue(value: unknown) {
  return value === undefined
    ? { present: false as const }
    : { present: true as const, value };
}

function canonicalAttendee(attendee: { email: string; displayName?: string }) {
  return {
    displayName: optionalValue(attendee.displayName),
    email: attendee.email,
  };
}

function normalizedEvent(event: GoogleCalendarWriteInput) {
  const attendees = event.attendees === undefined
    ? { present: false as const }
    : {
        present: true as const,
        value: event.attendees.map(canonicalAttendee).sort((left, right) =>
          compareCodePoints(
            JSON.stringify(stableValue(left)),
            JSON.stringify(stableValue(right)),
          ),
        ),
      };
  return {
    attendees,
    conferenceRequestId: optionalValue(event.conferenceRequestId),
    description: optionalValue(event.description),
    end: {
      date: optionalValue(event.end.date),
      dateTime: optionalValue(event.end.dateTime),
      timeZone: optionalValue(event.end.timeZone),
    },
    location: optionalValue(event.location),
    start: {
      date: optionalValue(event.start.date),
      dateTime: optionalValue(event.start.dateTime),
      timeZone: optionalValue(event.start.timeZone),
    },
    title: event.summary,
    transparency: optionalValue(event.transparency),
  };
}

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  ));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fingerprintGoogleCalendarWritePayload(args: {
  action: "create" | "update" | "delete";
  connectionId: Id<"googleCalendarConnections">;
  calendarEventId: Id<"calendarEvents">;
  externalEventId: string;
  payloadPreconditionEtag: string | null;
  event?: GoogleCalendarWriteInput;
}) {
  const payload = stableValue({
    action: args.action,
    event: args.event === undefined ? null : normalizedEvent(args.event),
    precondition: { etag: args.payloadPreconditionEtag },
    target: {
      calendarEventId: args.calendarEventId,
      calendarId: "primary",
      connectionId: args.connectionId,
      externalEventId: args.externalEventId,
    },
  });
  return await sha256Hex(JSON.stringify(payload));
}

export async function deriveGoogleCalendarEventId(operationKey: string) {
  if (operationKey.trim().length === 0) {
    throw new Error("Google Calendar operation key is required");
  }
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(operationKey),
  ));
  let bits = 0;
  let buffer = 0;
  let encoded = "";
  for (const byte of digest) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32HEX_ALPHABET[(buffer >> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) encoded += BASE32HEX_ALPHABET[(buffer << (5 - bits)) & 31];
  return encoded;
}
